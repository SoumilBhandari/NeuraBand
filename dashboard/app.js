/*
 * NeuraFy Dashboard — Clinical Interface
 * Web Bluetooth client with dual theme, clinical decision
 * support engine, and real-time chart rendering.
 * Chrome desktop only (Web Bluetooth API).
 */

// ─────────────── BLE UUIDs ───────────────
const SERVICE_UUID       = '19b10000-e8f2-537e-4f6c-d104768a1214';
const SENSOR_DATA_UUID   = '19b10001-e8f2-537e-4f6c-d104768a1214';
const DEVICE_STATUS_UUID = '19b10002-e8f2-537e-4f6c-d104768a1214';
const RESET_CMD_UUID     = '19b10003-e8f2-537e-4f6c-d104768a1214';

// ─────────────── State ───────────────
let bleDevice = null, bleCharacteristic = null, bleResetChar = null, bleStatusChar = null;
let isConnected = false, demoInterval = null;
let sessionStartTime = null, sessionTimerInterval = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const dataLog = [];  // stores all received data for CSV export
const HISTORY_SIZE = 60;
const hrHistory = [], gsrHistory = [];
const accelXHistory = [], accelYHistory = [], accelZHistory = [];
const timeLabels = [];
const ibiBuffer = [], IBI_BUFFER_SIZE = 60;
let latestData = { hr: -1, sp: -1, gsr: 0, gait: 0, ibi: -1, sdnn: -1, rmssd: -1 };
let insightsTimer = null;

// ─────────────── DOM ───────────────
const $ = id => document.getElementById(id);
const connectBtn = $('connect-btn'), disconnectBtn = $('disconnect-btn');
const demoCheckbox = $('demo-mode'), statusDot = $('status-dot');
const statusText = $('status-text'), lastUpdate = $('last-update');
const batteryLevel = $('battery-level');
const hrValue = $('hr-value'), spo2Value = $('spo2-value');
const gsrValueEl = $('gsr-value'), gaitValue = $('gait-value');
const hrvSdnn = $('hrv-sdnn'), hrvRmssd = $('hrv-rmssd'), hrvIbi = $('hrv-ibi');
const hrvStatus = $('hrv-status'), logContainer = $('log-container');
const spo2RingFill = $('spo2-ring-fill'), insightsContainer = $('insights-container');
const cardHR = $('card-hr'), cardSpo2 = $('card-spo2');
const cardGSR = $('card-gsr'), cardMotion = $('card-motion'), cardHRV = $('card-hrv');
const themeToggle = $('theme-toggle');

// ─────────────── Theme ───────────────
function getTheme() { return localStorage.getItem('neurafy-theme') || 'dark'; }

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('neurafy-theme', theme);
    updateChartTheme(theme);
}

function updateChartTheme(theme) {
    if (typeof hrChart === 'undefined') return;
    const grid = theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
    const tick = theme === 'dark' ? '#3b4252' : '#9ca3af';
    const legend = theme === 'dark' ? '#4b5563' : '#9ca3af';
    [hrChart, gsrChart, accelChart].forEach(c => {
        if (c.options.scales.y) { c.options.scales.y.grid.color = grid; c.options.scales.y.ticks.color = tick; }
        if (c.options.plugins.legend?.labels) c.options.plugins.legend.labels.color = legend;
        c.update('none');
    });
}

document.documentElement.setAttribute('data-theme', getTheme());
themeToggle.addEventListener('click', () => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ─────────────── Charts — clinical flat style ───────────────
const chartBase = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 200 },
    plugins: { legend: { display: false } },
    scales: {
        x: { display: false },
        y: {
            ticks: { font: { size: 9, family: "'JetBrains Mono', monospace" }, color: '#3b4252', maxTicksLimit: 4 },
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            border: { display: false },
        },
    },
    elements: { point: { radius: 0 }, line: { tension: 0.3, borderWidth: 2 } },
    layout: { padding: { left: 0, right: 0, top: 2, bottom: 0 } },
};

const hrChart = new Chart($('hr-chart'), {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#dc2626', backgroundColor: 'transparent', fill: false }] },
    options: { ...chartBase, scales: { ...chartBase.scales, y: { ...chartBase.scales.y, min: 50, max: 120, ticks: { ...chartBase.scales.y.ticks, maxTicksLimit: 3 } } } },
});

const gsrChart = new Chart($('gsr-chart'), {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#d97706', backgroundColor: 'transparent', fill: false }] },
    options: { ...chartBase, scales: { ...chartBase.scales, y: { ...chartBase.scales.y, min: 300, max: 700 } } },
});

const accelChart = new Chart($('accel-chart'), {
    type: 'line',
    data: { labels: [], datasets: [
        { data: [], label: 'X', borderColor: '#dc2626', backgroundColor: 'transparent' },
        { data: [], label: 'Y', borderColor: '#059669', backgroundColor: 'transparent' },
        { data: [], label: 'Z', borderColor: '#2563eb', backgroundColor: 'transparent' },
    ] },
    options: { ...chartBase,
        plugins: { legend: { display: true, position: 'top', align: 'end',
            labels: { boxWidth: 8, boxHeight: 2, usePointStyle: false,
                font: { size: 9, family: "'JetBrains Mono', monospace" }, color: '#4b5563', padding: 8 } } },
        scales: { ...chartBase.scales, y: { ...chartBase.scales.y, min: -2, max: 2 } },
    },
});

updateChartTheme(getTheme());

// ─────────────── BLE ───────────────
async function connectBLE() {
    try {
        if (!bleDevice) {
            bleDevice = await navigator.bluetooth.requestDevice({ filters: [{ name: 'NeuraFy' }], optionalServices: [SERVICE_UUID] });
            bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
        }
        updateStatus('Connecting');
        const server = await bleDevice.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        bleCharacteristic = await service.getCharacteristic(SENSOR_DATA_UUID);
        try { bleResetChar = await service.getCharacteristic(RESET_CMD_UUID); } catch(e) { bleResetChar = null; }
        try { bleStatusChar = await service.getCharacteristic(DEVICE_STATUS_UUID); } catch(e) { bleStatusChar = null; }
        await bleCharacteristic.startNotifications();
        bleCharacteristic.addEventListener('characteristicvaluechanged', onSensorData);
        isConnected = true; reconnectAttempts = 0; updateStatus('Connected');
        connectBtn.disabled = true; disconnectBtn.disabled = false;
        if (demoCheckbox.checked) { demoCheckbox.checked = false; stopDemo(); }
        startSessionTimer();
    } catch (err) {
        console.error('BLE:', err); updateStatus('Failed');
        setTimeout(() => { if (!isConnected) updateStatus('Offline'); }, 3000);
    }
}

function disconnectBLE() {
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // prevent auto-reconnect on manual disconnect
    if (bleDevice?.gatt.connected) bleDevice.gatt.disconnect();
    onDisconnected();
}

function onDisconnected() {
    isConnected = false; bleCharacteristic = null; bleResetChar = null; bleStatusChar = null;
    stopSessionTimer();

    // Auto-reconnect with exponential backoff (unless manually disconnected)
    if (bleDevice && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = 3000 * Math.pow(2, reconnectAttempts - 1); // 3s, 6s, 12s
        updateStatus(`Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(() => {
            if (!isConnected) connectBLE();
        }, delay);
    } else {
        updateStatus('Offline');
        connectBtn.disabled = false; disconnectBtn.disabled = true;
    }
}

// BLE software reset — sends 0x01 to the reset characteristic
async function resetDevice() {
    if (!bleResetChar) { console.warn('Reset characteristic not available'); return; }
    if (!confirm('Reset the device? It will disconnect and reboot.')) return;
    try {
        reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // don't auto-reconnect during reset
        await bleResetChar.writeValue(new Uint8Array([1]));
        updateStatus('Resetting');
        // Device will reboot and disconnect — user must reconnect manually
    } catch (err) {
        console.error('Reset failed:', err);
    }
}
function updateStatus(s) {
    statusText.textContent = s; statusDot.className = 'status-dot';
    if (s === 'Connected') statusDot.classList.add('connected');
    else if (s === 'Demo') statusDot.classList.add('demo');
}

// ─────────────── Data ───────────────
function onSensorData(e) {
    try { processData(JSON.parse(new TextDecoder('utf-8').decode(e.target.value))); } catch { /* skip */ }
}

function processData(data) {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    lastUpdate.textContent = timeStr;

    // Log data for CSV export
    dataLog.push({ ...data, _time: timeStr });

    if (data.hr > 0) { hrValue.textContent = data.hr; cardHR.classList.remove('sensor-error'); pushToHistory(hrHistory, data.hr); latestData.hr = data.hr; }
    else if (data.hr === -1) { hrValue.textContent = '--'; cardHR.classList.add('sensor-error'); }

    if (data.sp > 0) { spo2Value.textContent = data.sp; cardSpo2.classList.remove('sensor-error'); updateSpO2Ring(data.sp); latestData.sp = data.sp; }
    else if (data.sp === -1) { spo2Value.textContent = '--'; cardSpo2.classList.add('sensor-error'); }

    if (data.gsr !== undefined) { gsrValueEl.textContent = data.gsr; pushToHistory(gsrHistory, data.gsr); latestData.gsr = data.gsr; }
    if (data.gait !== undefined) { gaitValue.textContent = parseFloat(data.gait).toFixed(2); latestData.gait = data.gait; }
    if (data.ax !== undefined) { pushToHistory(accelXHistory, data.ax); pushToHistory(accelYHistory, data.ay); pushToHistory(accelZHistory, data.az); }

    if (data.ibi > 0) {
        ibiBuffer.push(data.ibi); if (ibiBuffer.length > IBI_BUFFER_SIZE) ibiBuffer.shift();
        hrvIbi.textContent = data.ibi; latestData.ibi = data.ibi; computeHRV();
    }

    if (data.bt >= 0) batteryLevel.textContent = `${data.bt}%`;
    else batteryLevel.textContent = '--%';

    pushToHistory(timeLabels, timeStr);
    updateCharts();
    addLogEntry(timeStr, JSON.stringify(data));
}

function pushToHistory(a, v) { a.push(v); if (a.length > HISTORY_SIZE) a.shift(); }

function updateSpO2Ring(value) {
    const pct = Math.max(0, Math.min(1, (value - 90) / 10));
    spo2RingFill.style.strokeDashoffset = 326.73 * (1 - pct);
    const color = value >= 95 ? '#0891b2' : value >= 90 ? '#d97706' : '#dc2626';
    spo2Value.style.color = color; spo2RingFill.style.stroke = color;
}

function computeHRV() {
    const n = ibiBuffer.length;
    if (n < 10) { hrvStatus.textContent = `Collecting ${n}/10`; hrvStatus.className = 'hrv-status'; return; }
    const mean = ibiBuffer.reduce((a,b) => a+b, 0) / n;
    const sdnn = Math.sqrt(ibiBuffer.reduce((s,v) => s + (v-mean)**2, 0) / (n-1));
    let sq = 0; for (let i = 1; i < n; i++) { const d = ibiBuffer[i]-ibiBuffer[i-1]; sq += d*d; }
    const rmssd = Math.sqrt(sq / (n-1));
    hrvSdnn.textContent = Math.round(sdnn); hrvRmssd.textContent = Math.round(rmssd);
    latestData.sdnn = Math.round(sdnn); latestData.rmssd = Math.round(rmssd);
    if (sdnn < 50) { hrvStatus.textContent = 'Below threshold'; hrvStatus.className = 'hrv-status low'; }
    else { hrvStatus.textContent = 'Within normal range'; hrvStatus.className = 'hrv-status normal'; }
}

function updateCharts() {
    hrChart.data.labels = [...timeLabels]; hrChart.data.datasets[0].data = [...hrHistory]; hrChart.update('none');
    gsrChart.data.labels = [...timeLabels]; gsrChart.data.datasets[0].data = [...gsrHistory]; gsrChart.update('none');
    accelChart.data.labels = [...timeLabels];
    accelChart.data.datasets[0].data = [...accelXHistory];
    accelChart.data.datasets[1].data = [...accelYHistory];
    accelChart.data.datasets[2].data = [...accelZHistory];
    accelChart.update('none');
}

function addLogEntry(time, json) {
    const ph = logContainer.querySelector('.stream-placeholder'); if (ph) ph.remove();
    const e = document.createElement('div'); e.className = 'log-entry';
    e.innerHTML = `<span class="log-time">${time}</span>${json}`;
    logContainer.appendChild(e);
    while (logContainer.children.length > 50) logContainer.removeChild(logContainer.firstChild);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// ─────────────── Clinical Decision Support ───────────────
// Rule-based. Each rule uses a short text label instead of emoji.

const INSIGHT_RULES = [
    {
        id: 'hr-elevated', check: d => d.hr > 100, priority: 'high',
        icon: 'icon-hr', badge: 'HR',
        title: 'Elevated Heart Rate',
        text: d => `Heart rate ${d.hr} BPM exceeds 100 BPM threshold. Recommend seated rest for 2 minutes and re-measurement. Sustained tachycardia may indicate autonomic dysregulation — a documented early marker in neurodegenerative conditions.`,
    },
    {
        id: 'hr-low', check: d => d.hr > 0 && d.hr < 55, priority: 'medium',
        icon: 'icon-hr', badge: 'HR',
        title: 'Bradycardia Detected',
        text: d => `Heart rate ${d.hr} BPM is below 55 BPM. While normal in conditioned athletes, in elderly patients this may indicate parasympathetic dominance or beta-blocker effects. Verify medication history.`,
    },
    {
        id: 'hr-normal', check: d => d.hr >= 60 && d.hr <= 80, priority: 'info',
        icon: 'icon-hr', badge: 'HR',
        title: 'Heart Rate Within Normal Range',
        text: d => `Heart rate ${d.hr} BPM — within optimal resting range. Stable cardiac rhythm supports adequate cerebral perfusion. Continue baseline monitoring.`,
    },
    {
        id: 'spo2-low', check: d => d.sp > 0 && d.sp < 94, priority: 'high',
        icon: 'icon-spo2', badge: 'O\u2082',
        title: 'Hypoxemia Detected',
        text: d => `SpO2 ${d.sp}% is below 94% threshold. Verify sensor placement and perfusion. If sustained, evaluate for respiratory compromise. Nocturnal desaturation is an established risk factor for cognitive decline — consider polysomnography referral.`,
    },
    {
        id: 'spo2-borderline', check: d => d.sp >= 94 && d.sp <= 95, priority: 'medium',
        icon: 'icon-spo2', badge: 'O\u2082',
        title: 'Borderline Oxygen Saturation',
        text: d => `SpO2 ${d.sp}% — at the lower boundary of normal range. Monitor for downward trend. Sleep-disordered breathing is associated with accelerated cognitive decline per current evidence.`,
    },
    {
        id: 'hrv-very-low', check: d => d.sdnn > 0 && d.sdnn < 30, priority: 'high',
        icon: 'icon-hrv', badge: 'HRV',
        title: 'Severely Reduced HRV',
        text: d => `SDNN ${d.sdnn} ms is significantly below the 50 ms clinical threshold. This suggests reduced autonomic nervous system flexibility. In AD research, low HRV correlates with degeneration of brainstem nuclei controlling cardiac rhythm. Recommend 5-minute paced breathing protocol (4s inhale, 6s exhale).`,
    },
    {
        id: 'hrv-moderate', check: d => d.sdnn >= 30 && d.sdnn < 50, priority: 'medium',
        icon: 'icon-hrv', badge: 'HRV',
        title: 'Below-Normal HRV',
        text: d => `SDNN ${d.sdnn} ms — below the 50 ms threshold for healthy autonomic function. Recommend guided vagal stimulation protocol: inhale 4 seconds, exhale 6 seconds, repeat for 3 minutes. This technique can acutely improve HRV and may provide neuroprotective benefit.`,
    },
    {
        id: 'hrv-good', check: d => d.sdnn >= 50, priority: 'info',
        icon: 'icon-hrv', badge: 'HRV',
        title: 'HRV Within Normal Range',
        text: d => `SDNN ${d.sdnn} ms indicates adequate autonomic nervous system function and healthy vagal tone. Continue current monitoring protocol.`,
    },
    {
        id: 'gsr-spike', check: d => d.gsr > 600, priority: 'medium',
        icon: 'icon-gsr', badge: 'EDA',
        title: 'Elevated Electrodermal Activity',
        text: d => `GSR ${d.gsr} — elevated sympathetic arousal detected. In AD research, preserved EDA reactivity indicates intact autonomic pathways. Current response is consistent with acute stress. Assess patient comfort and environmental stimuli.`,
    },
    {
        id: 'gsr-flat', check: d => d.gsr > 0 && d.gsr < 200, priority: 'medium',
        icon: 'icon-gsr', badge: 'EDA',
        title: 'Reduced Electrodermal Activity',
        text: d => `GSR ${d.gsr} — very low skin conductance. Blunted EDA may reflect reduced sympathetic responsiveness, potentially indicating frontal cortex or insula involvement. Verify electrode contact and skin preparation before drawing clinical conclusions.`,
    },
    {
        id: 'gait-active', check: d => d.gait > 0.2, priority: 'info',
        icon: 'icon-gait', badge: 'GAIT',
        title: 'Ambulatory Activity Detected',
        text: d => `Activity score ${d.gait.toFixed(2)} — patient is ambulating. Capture window for gait metrics is active. Monitor for asymmetry, reduced cadence, or increased stride variability — validated digital biomarkers for MCI (Soltani et al., Front Neurol 2024).`,
    },
    {
        id: 'gait-sedentary', check: d => d.gait >= 0 && d.gait < 0.05 && hrHistory.length > 30, priority: 'low',
        icon: 'icon-gait', badge: 'GAIT',
        title: 'Extended Sedentary Period',
        text: () => `Patient has been stationary for an extended period. Recommend initiating a standardized 2-minute walk test to capture gait biomarkers. Protocol: walk 10 meters, turn, return. Regular ambulation promotes cerebral perfusion.`,
    },
    {
        id: 'multi-concern', check: d => d.hr > 90 && d.sdnn > 0 && d.sdnn < 40 && d.gsr > 500, priority: 'high',
        icon: 'icon-multi', badge: 'MBM',
        title: 'Multimodal Biomarker Alert',
        text: d => `Convergent pattern detected: elevated HR (${d.hr}), reduced HRV (SDNN ${d.sdnn}), elevated EDA (${d.gsr}). This multimodal signature indicates acute autonomic stress. Recommend: cessation of current activity, quiet environment, 5-minute paced breathing, then reassess all parameters.`,
    },
    {
        id: 'multi-positive', check: d => d.hr >= 60 && d.hr <= 75 && d.sdnn >= 50 && d.sp >= 97, priority: 'info',
        icon: 'icon-multi', badge: 'MBM',
        title: 'All Parameters Within Normal Limits',
        text: d => `Biomarker summary: HR ${d.hr}, SpO2 ${d.sp}%, SDNN ${d.sdnn} ms. All monitored parameters are within reference ranges. Autonomic and cardiovascular function appears intact. This baseline is suitable for longitudinal comparison in the AD prediction pipeline.`,
    },
];

let currentInsightIds = new Set();

function generateInsights() {
    const d = latestData;
    if (d.hr <= 0 && d.gsr === 0) return;
    const triggered = INSIGHT_RULES.filter(r => { try { return r.check(d); } catch { return false; } });
    const order = { high: 0, medium: 1, low: 2, info: 3 };
    triggered.sort((a, b) => order[a.priority] - order[b.priority]);
    const top = triggered.slice(0, 4);
    const newIds = new Set(top.map(r => r.id));
    if (setsEqual(newIds, currentInsightIds)) return;
    currentInsightIds = newIds;

    insightsContainer.innerHTML = '';
    top.forEach(rule => {
        const text = typeof rule.text === 'function' ? rule.text(d) : rule.text;
        const item = document.createElement('div');
        item.className = 'insight-item';
        item.innerHTML = `
            <div class="insight-icon ${rule.icon}">${rule.badge}</div>
            <div class="insight-body">
                <div class="insight-title">
                    ${rule.title}
                    <span class="insight-priority priority-${rule.priority}">${rule.priority}</span>
                </div>
                <div class="insight-text">${text}</div>
            </div>`;
        insightsContainer.appendChild(item);
    });
}

function setsEqual(a, b) { if (a.size !== b.size) return false; for (const v of a) if (!b.has(v)) return false; return true; }

function startInsights() { if (!insightsTimer) insightsTimer = setInterval(generateInsights, 3000); }
function stopInsights() { if (insightsTimer) { clearInterval(insightsTimer); insightsTimer = null; } }

// ─────────────── Session Timer ───────────────
function startSessionTimer() {
    sessionStartTime = Date.now();
    const timerEl = $('session-timer');
    if (!timerEl) return;
    sessionTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const ss = String(elapsed % 60).padStart(2, '0');
        timerEl.textContent = `${mm}:${ss}`;
    }, 1000);
}

function stopSessionTimer() {
    if (sessionTimerInterval) { clearInterval(sessionTimerInterval); sessionTimerInterval = null; }
}

// ─────────────── CSV Export ───────────────
function exportCSV() {
    if (dataLog.length === 0) { alert('No data to export. Connect a device or run demo mode first.'); return; }
    const headers = 'timestamp,hr,spo2,gsr,gait,ibi,ax,ay,az,battery\n';
    const rows = dataLog.map(d =>
        `${d.ts || ''},${d.hr || ''},${d.sp || ''},${d.gsr || ''},${d.gait || ''},${d.ibi || ''},${d.ax || ''},${d.ay || ''},${d.az || ''},${d.bt || ''}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neurafy_session_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─────────────── Demo ───────────────
function startDemo() {
    let t = 0;
    demoInterval = setInterval(() => {
        t++;
        const hr = Math.round(72 + Math.sin(t*0.1)*5 + (Math.random()-0.5)*4);
        const ibi = Math.round(60000/hr + (Math.random()-0.5)*40);
        const sp = Math.round(97 + Math.sin(t*0.05) + (Math.random()-0.5));
        const gsr = Math.round(480 + Math.sin(t*0.15)*30 + ((t%30===0)?80:0) + (Math.random()-0.5)*20);
        const moving = (t%20 < 5);
        const ax = moving ? Math.sin(t*2)*0.5 : (Math.random()-0.5)*0.05;
        const ay = moving ? Math.cos(t*2)*0.3 : (Math.random()-0.5)*0.05;
        const az = 1.0 + (moving ? Math.sin(t*4)*0.2 : (Math.random()-0.5)*0.02);
        const gait = moving ? 0.3+Math.random()*0.3 : 0.01+Math.random()*0.02;
        processData({ hr, sp, gsr, ibi,
            gait: parseFloat(gait.toFixed(2)),
            ax: parseFloat(ax.toFixed(2)), ay: parseFloat(ay.toFixed(2)), az: parseFloat(az.toFixed(2)),
            bt: Math.max(0, 85-Math.floor(t/60)), ts: t*1000 });
    }, 1000);
    updateStatus('Demo');
    startInsights();
}

function stopDemo() {
    if (demoInterval) { clearInterval(demoInterval); demoInterval = null; }
    stopInsights();
    if (!isConnected) updateStatus('Offline');
}

// ─────────────── Events ───────────────
connectBtn.addEventListener('click', () => { connectBLE(); startInsights(); });
disconnectBtn.addEventListener('click', () => { disconnectBLE(); stopInsights(); });
const resetBtn = $('reset-btn');
if (resetBtn) resetBtn.addEventListener('click', resetDevice);
const exportBtn = $('export-csv-btn');
if (exportBtn) exportBtn.addEventListener('click', exportCSV);
demoCheckbox.addEventListener('change', e => {
    if (e.target.checked) { if (isConnected) disconnectBLE(); startDemo(); }
    else stopDemo();
});

if (!navigator.bluetooth) {
    connectBtn.textContent = 'BLE not supported';
    connectBtn.disabled = true;
    connectBtn.title = 'Requires Chrome on desktop';
}

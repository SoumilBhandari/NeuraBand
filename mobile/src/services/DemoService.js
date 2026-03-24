// Synthetic demo data generator — ported from dashboard app.js
// Produces realistic 1Hz biomarker data for testing without hardware.

let tick = 0;

export function generateDemoData() {
  tick++;
  const t = tick;

  const hr = Math.round(72 + Math.sin(t * 0.1) * 5 + (Math.random() - 0.5) * 4);
  const ibi = Math.round(60000 / hr + (Math.random() - 0.5) * 40);
  const sp = Math.round(97 + Math.sin(t * 0.05) + (Math.random() - 0.5));
  const gsr = Math.round(480 + Math.sin(t * 0.15) * 30 + (t % 30 === 0 ? 80 : 0) + (Math.random() - 0.5) * 20);
  const moving = t % 20 < 5;
  const ax = moving ? Math.sin(t * 2) * 0.5 : (Math.random() - 0.5) * 0.05;
  const ay = moving ? Math.cos(t * 2) * 0.3 : (Math.random() - 0.5) * 0.05;
  const az = 1.0 + (moving ? Math.sin(t * 4) * 0.2 : (Math.random() - 0.5) * 0.02);
  const gait = moving ? 0.3 + Math.random() * 0.3 : 0.01 + Math.random() * 0.02;
  const rr = Math.round(16 + Math.sin(t * 0.08) * 2 + (Math.random() - 0.5));
  const tmp = parseFloat((32.5 + Math.sin(t * 0.02) * 0.8 + (Math.random() - 0.5) * 0.2).toFixed(1));
  const hum = parseFloat((48 + Math.sin(t * 0.03) * 6 + (Math.random() - 0.5) * 2).toFixed(1));
  const lux = t % 20 < 10 ? Math.round(350 + (Math.random() - 0.5) * 40) : Math.round(50 + (Math.random() - 0.5) * 15);
  const prs = parseFloat((101.3 + (Math.random() - 0.5) * 0.2).toFixed(1));
  const slp = 0;
  const slps = 0;

  // NRI computation
  let nri = 0;
  // Approximate SDNN for demo (will be computed from IBI buffer in real use)
  const demoSdnn = 40 + Math.sin(t * 0.05) * 10;
  if (demoSdnn < 50) nri += 25 * (1 - demoSdnn / 50);
  if (sp < 96) nri += 20 * (1 - sp / 100);
  if (gait < 0.1) nri += 15;
  if (gsr > 600) nri += 15 * Math.min(1, (gsr - 600) / 200);
  if (rr < 12) nri += 10;
  nri = Math.round(Math.min(100, Math.max(0, nri)));

  return {
    hr, sp, gsr, ibi,
    gait: parseFloat(gait.toFixed(2)),
    ax: parseFloat(ax.toFixed(2)),
    ay: parseFloat(ay.toFixed(2)),
    az: parseFloat(az.toFixed(2)),
    rr, tmp, slp, slps, nri, hum, lux, prs,
    bt: Math.max(0, 85 - Math.floor(t / 60)),
    ts: t * 1000,
  };
}

export function resetDemo() { tick = 0; }

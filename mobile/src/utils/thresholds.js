// Patient-friendly biomarker thresholds.
// NO jargon. NO red status for patients. Plain language only.
// Colors: green (good), blue (neutral), amber (check with doctor)

export const METRIC_LABELS = {
  hr:   { name: 'Heart Rate', unit: 'BPM' },
  sp:   { name: 'Blood Oxygen', unit: '%' },
  rr:   { name: 'Breathing Rate', unit: 'br/min' },
  nri:  { name: 'Brain Health Score', unit: '/100' },
  gsr:  { name: 'Stress Level', unit: '' },
  gait: { name: 'Movement & Balance', unit: '' },
  tmp:  { name: 'Body Temperature', unit: '°C' },
  hum:  { name: 'Humidity', unit: '%' },
  lux:  { name: 'Light Level', unit: 'lux' },
  prs:  { name: 'Air Pressure', unit: 'kPa' },
  slp:  { name: 'Sleep Quality', unit: '/100' },
  hrv:  { name: 'Heart Calmness', unit: 'ms' },
};

const GREEN  = '#10b981';
const BLUE   = '#64748b';
const AMBER  = '#f59e0b';

export function getVitalStatus(value, key) {
  if (value < 0 || value === undefined || value === null) {
    return { status: 'na', label: 'No reading yet', color: BLUE };
  }

  const ranges = {
    hr:  { okMin: 60, okMax: 100, warnMin: 50, warnMax: 115 },
    sp:  { okMin: 95, okMax: 100, warnMin: 92, warnMax: 95 },
    rr:  { okMin: 12, okMax: 20,  warnMin: 10, warnMax: 25 },
    gsr: { okMin: 200, okMax: 600, warnMin: 100, warnMax: 700 },
    tmp: { okMin: 31, okMax: 35,  warnMin: 29, warnMax: 37 },
    hum: { okMin: 30, okMax: 70,  warnMin: 20, warnMax: 80 },
    prs: { okMin: 99, okMax: 103, warnMin: 95, warnMax: 107 },
  };

  const t = ranges[key];
  if (!t) return { status: 'ok', label: 'Looking good', color: GREEN };

  if (value >= t.okMin && value <= t.okMax) return { status: 'ok', label: 'Looking good', color: GREEN };
  if (value >= t.warnMin && value <= t.warnMax) return { status: 'warn', label: 'Worth watching', color: AMBER };
  return { status: 'crit', label: 'Check with your doctor', color: AMBER }; // amber, NEVER red
}

export function getGaitStatus(value) {
  if (value === undefined || value === null) return { status: 'na', label: 'No reading yet', color: BLUE };
  if (value > 0.2) return { status: 'ok', label: 'Active — great!', color: GREEN };
  if (value > 0.05) return { status: 'warn', label: 'Light activity', color: BLUE };
  return { status: 'crit', label: 'Time for a walk!', color: AMBER };
}

export function getSleepStatus(score) {
  if (score < 0 || score === undefined) return { status: 'na', label: 'No data yet', color: BLUE };
  if (score >= 70) return { status: 'ok', label: 'Great sleep!', color: GREEN };
  if (score >= 50) return { status: 'warn', label: 'Could be better', color: AMBER };
  return { status: 'crit', label: 'Try resting more', color: AMBER };
}

export function getNriStatus(value) {
  // NRI is inverted: lower = better. Renamed "Brain Health Score" where 100 = best
  // Internally NRI 0=good, 100=bad. For patient display: invert to 100-nri
  if (value === undefined) return { status: 'na', label: 'Calculating...', color: BLUE };
  const patientScore = Math.max(0, 100 - value); // invert for patient: higher = healthier
  if (patientScore >= 70) return { status: 'ok', label: 'Looking healthy', color: GREEN, displayValue: patientScore };
  if (patientScore >= 40) return { status: 'warn', label: 'Room to improve', color: AMBER, displayValue: patientScore };
  return { status: 'crit', label: 'Talk to your doctor', color: AMBER, displayValue: patientScore };
}

// Biomarker thresholds — same evidence-based ranges as the clinician dashboard.
// Used to color-code values and generate patient-friendly insights.

export const THRESHOLDS = {
  hr:   { okMin: 60, okMax: 100, warnMin: 55, warnMax: 110 },
  sp:   { okMin: 95, okMax: 100, warnMin: 93, warnMax: 95 },
  rr:   { okMin: 12, okMax: 20,  warnMin: 10, warnMax: 25 },
  nri:  { okMin: 0,  okMax: 29,  warnMin: 30, warnMax: 59 },
  gsr:  { okMin: 200, okMax: 600, warnMin: 100, warnMax: 700 },
  tmp:  { okMin: 31, okMax: 35,  warnMin: 29, warnMax: 37 },
  hum:  { okMin: 30, okMax: 70,  warnMin: 20, warnMax: 80 },
  prs:  { okMin: 99, okMax: 103, warnMin: 95, warnMax: 107 },
};

export function getVitalStatus(value, key) {
  if (value < 0 || value === undefined || value === null) return { status: 'na', label: '--', color: '#6b7280' };
  const t = THRESHOLDS[key];
  if (!t) return { status: 'na', label: '--', color: '#6b7280' };
  if (value >= t.okMin && value <= t.okMax) return { status: 'ok', label: 'Normal', color: '#10b981' };
  if (value >= t.warnMin && value <= t.warnMax) return { status: 'warn', label: 'Borderline', color: '#f59e0b' };
  return { status: 'crit', label: 'Needs attention', color: '#ef4444' };
}

export function getGaitStatus(value) {
  if (value === undefined || value === null) return { status: 'na', label: '--', color: '#6b7280' };
  if (value > 0.2) return { status: 'ok', label: 'Active', color: '#10b981' };
  if (value > 0.05) return { status: 'warn', label: 'Light', color: '#f59e0b' };
  return { status: 'crit', label: 'Sedentary', color: '#ef4444' };
}

export function getSleepStatus(score) {
  if (score < 0 || score === undefined) return { status: 'na', label: '--', color: '#6b7280' };
  if (score >= 70) return { status: 'ok', label: 'Good', color: '#10b981' };
  if (score >= 50) return { status: 'warn', label: 'Fair', color: '#f59e0b' };
  return { status: 'crit', label: 'Poor', color: '#ef4444' };
}

export function getNriStatus(value) {
  if (value < 30) return { status: 'ok', label: 'Low risk', color: '#10b981' };
  if (value < 60) return { status: 'warn', label: 'Moderate', color: '#f59e0b' };
  return { status: 'crit', label: 'Elevated', color: '#ef4444' };
}

// Trend detection and session statistics — ported from dashboard app.js

export function computeTrend(history) {
  if (!history || history.length < 10) return 'stable';
  const recent = history.slice(-10);
  const first5 = recent.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const last5 = recent.slice(5).reduce((a, b) => a + b, 0) / 5;
  const slope = last5 - first5;
  if (slope > 2) return 'up';
  if (slope < -2) return 'down';
  return 'stable';
}

export function trendLabel(trend, metric) {
  // Patient-friendly trend labels
  // For most metrics, "up" is concerning, "down" is good
  // Exceptions: SpO2 (up=good), NRI (down=good)
  const invertedMetrics = ['sp']; // higher is better
  const isInverted = invertedMetrics.includes(metric);

  if (trend === 'stable') return { text: 'Stable', arrow: '→', color: '#6b7280' };
  if (trend === 'up') {
    return isInverted
      ? { text: 'Improving', arrow: '↗', color: '#10b981' }
      : { text: 'Rising', arrow: '↗', color: '#f59e0b' };
  }
  return isInverted
    ? { text: 'Declining', arrow: '↘', color: '#ef4444' }
    : { text: 'Settling', arrow: '↘', color: '#10b981' };
}

export function createSessionStats() {
  return { min: Infinity, max: -Infinity, sum: 0, count: 0 };
}

export function updateStat(stat, val) {
  if (val < 0 || val === undefined) return;
  if (val < stat.min) stat.min = val;
  if (val > stat.max) stat.max = val;
  stat.sum += val;
  stat.count++;
}

export function getAvg(stat) {
  return stat.count > 0 ? Math.round(stat.sum / stat.count) : null;
}

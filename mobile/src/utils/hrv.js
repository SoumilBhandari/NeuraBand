// HRV computation from inter-beat intervals — ported from dashboard

export function computeHRV(ibiBuffer) {
  const n = ibiBuffer.length;
  if (n < 10) return { sdnn: null, rmssd: null, status: 'collecting', count: n };

  const mean = ibiBuffer.reduce((a, b) => a + b, 0) / n;
  const sdnn = Math.sqrt(ibiBuffer.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));

  let sq = 0;
  for (let i = 1; i < n; i++) {
    const d = ibiBuffer[i] - ibiBuffer[i - 1];
    sq += d * d;
  }
  const rmssd = Math.sqrt(sq / (n - 1));

  return {
    sdnn: Math.round(sdnn),
    rmssd: Math.round(rmssd),
    status: sdnn < 50 ? 'low' : 'normal',
  };
}

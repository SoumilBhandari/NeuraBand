import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Minimal sparkline — thin bars showing recent trend
function Sparkline({ data, color, height = 24 }) {
  if (!data || data.length < 3) return null;
  const slice = data.slice(-20);
  const min = Math.min(...slice);
  const range = (Math.max(...slice) - min) || 1;
  return (
    <View style={[styles.sparkRow, { height }]}>
      {slice.map((v, i) => {
        const pct = ((v - min) / range) * 100;
        return <View key={i} style={{ flex: 1, height: `${Math.max(6, pct)}%`, backgroundColor: color, opacity: 0.15 + (i / slice.length) * 0.6, borderRadius: 1 }} />;
      })}
    </View>
  );
}

export default function VitalCard({ label, value, unit, statusColor, statusLabel, sparkData, colors }) {
  const displayValue = value !== undefined && value >= 0 ? value : '--';

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.top}>
        <Text style={[styles.label, { color: colors.text2 }]}>{label}</Text>
        {statusLabel && (
          <Text style={[styles.status, { color: statusColor || colors.text3 }]}>{statusLabel}</Text>
        )}
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.text1 }]}>{displayValue}</Text>
        <Text style={[styles.unit, { color: colors.text3 }]}>{unit}</Text>
      </View>
      <Sparkline data={sparkData} color={statusColor || colors.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12, padding: 16, marginBottom: 8,
  },
  top: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2,
  },
  label: { fontSize: 13, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  status: { fontSize: 13, fontWeight: '500' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  unit: { fontSize: 16, fontWeight: '400', marginBottom: 2 },
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, marginTop: 8 },
});

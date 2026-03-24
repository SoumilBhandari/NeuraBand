import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { trendLabel } from '../utils/trends';

export default function VitalCard({ icon, label, value, unit, trend, metricKey, statusColor, statusLabel, colors }) {
  const t = trendLabel(trend || 'stable', metricKey);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.label, { color: colors.text2 }]}>{label}</Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor || colors.text3 }]} />
      </View>
      <View style={styles.reading}>
        <Text style={[styles.value, { color: statusColor || colors.text1 }]}>
          {value !== undefined && value >= 0 ? value : '--'}
        </Text>
        <Text style={[styles.unit, { color: colors.text2 }]}>{unit}</Text>
        <Text style={[styles.arrow, { color: t.color }]}>{t.arrow}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={[styles.statusLabel, { color: statusColor || colors.text3 }]}>{statusLabel || '--'}</Text>
        <Text style={[styles.trendText, { color: t.color }]}>{t.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1, borderRadius: 12, padding: 14,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  icon: { fontSize: 18 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  reading: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginVertical: 2 },
  value: { fontSize: 42, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 16, marginLeft: 2 },
  arrow: { fontSize: 20, fontWeight: '700', marginLeft: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  statusLabel: { fontSize: 11, fontWeight: '500' },
  trendText: { fontSize: 11, fontWeight: '500' },
});

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
      </View>
      <View style={styles.reading}>
        <Text style={[styles.value, { color: statusColor || colors.text1 }]}>
          {value !== undefined && value >= 0 ? value : '--'}
        </Text>
        <Text style={[styles.unit, { color: colors.text2 }]}>{unit}</Text>
        <Text style={[styles.arrow, { color: t.color }]}>{t.arrow} {t.text}</Text>
      </View>
      <View style={styles.footer}>
        <View style={[styles.statusDot, { backgroundColor: statusColor || colors.text3 }]} />
        <Text style={[styles.statusLabel, { color: statusColor || colors.text3 }]}>{statusLabel || '--'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1, borderRadius: 14, padding: 16,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  icon: { fontSize: 20 },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  reading: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginVertical: 4 },
  value: { fontSize: 48, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 18, marginLeft: 3 },
  arrow: { fontSize: 15, fontWeight: '600', marginLeft: 'auto' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 16, fontWeight: '500' },
});

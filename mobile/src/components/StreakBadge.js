import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StreakBadge({ days, colors }) {
  if (days <= 0) return null;
  const msg = days === 1 ? 'Day 1 — great start'
    : days < 7 ? `${days} day streak`
    : days < 30 ? `${days} days — keep going`
    : `${days} days strong`;

  const weekDots = Array.from({ length: 7 }, (_, i) => i < Math.min(days, 7));

  return (
    <View style={[styles.row, { backgroundColor: colors.card }]}>
      <Text style={[styles.text, { color: colors.text2 }]}>{msg}</Text>
      <View style={styles.dots}>
        {weekDots.map((filled, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: filled ? colors.green : colors.separator }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { fontSize: 14, fontWeight: '500' },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

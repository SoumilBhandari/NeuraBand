import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StreakBadge({ days, colors }) {
  const messages = [
    { min: 0, text: 'Welcome! Start wearing your band daily.' },
    { min: 1, text: `Day ${days} — great start!` },
    { min: 3, text: `${days} days in a row — building a healthy habit!` },
    { min: 7, text: `${days} days strong — you're doing amazing!` },
    { min: 14, text: `${days} days — incredible commitment!` },
    { min: 30, text: `${days} days — a full month! You're a star!` },
  ];
  const msg = [...messages].reverse().find(m => days >= m.min)?.text || '';

  // Progress dots for the week (7 dots)
  const weekDots = Array.from({ length: 7 }, (_, i) => i < Math.min(days, 7));

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.text, { color: colors.text1 }]}>{msg}</Text>
      <View style={styles.dots}>
        {weekDots.map((filled, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: filled ? colors.green : colors.cardBorder }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1, borderRadius: 14, padding: 14,
    marginBottom: 12, alignItems: 'center',
  },
  text: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});

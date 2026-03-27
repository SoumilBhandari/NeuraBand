import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function InsightCard({ message, colors }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={[styles.bar, { backgroundColor: colors.tint }]} />
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.tint }]}>INSIGHT</Text>
        <Text style={[styles.text, { color: colors.text1 }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, flexDirection: 'row', overflow: 'hidden', marginTop: 8 },
  bar: { width: 3 },
  content: { flex: 1, padding: 14 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  text: { fontSize: 15, lineHeight: 22 },
});

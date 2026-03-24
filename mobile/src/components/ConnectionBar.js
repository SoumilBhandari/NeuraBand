import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ConnectionBar({ connected, demoActive, battery, colors }) {
  const status = demoActive ? 'Demo Mode' : connected ? 'Connected' : 'Offline';
  const dotColor = demoActive ? colors.cyan : connected ? colors.green : colors.red;

  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
      <Text style={[styles.brand, { color: colors.text1 }]}>NeuraFy</Text>
      <View style={styles.right}>
        {battery >= 0 && <Text style={[styles.battery, { color: colors.text2 }]}>{battery}%</Text>}
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={[styles.status, { color: colors.text2 }]}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  brand: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  battery: { fontSize: 12, fontVariant: ['tabular-nums'] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { fontSize: 12, fontWeight: '500' },
});

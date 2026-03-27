import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'now';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export default function ConnectionBar({ connected, demoActive, battery, lastSyncTime, colors }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const dotColor = demoActive ? colors.blue : connected ? colors.green : colors.text3;
  const label = demoActive ? 'Demo' : connected ? 'Connected' : 'Not connected';
  const sync = lastSyncTime ? timeAgo(lastSyncTime) : null;

  return (
    <View style={[styles.bar, { borderBottomColor: colors.separator }]}>
      <Text style={[styles.brand, { color: colors.text1 }]}>NeuraFy</Text>
      <View style={styles.right}>
        {sync && <Text style={[styles.meta, { color: colors.text3 }]}>{sync}</Text>}
        {battery >= 0 && <Text style={[styles.meta, { color: battery < 20 ? colors.amber : colors.text3 }]}>{battery}%</Text>}
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={[styles.meta, { color: colors.text2 }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  brand: { fontSize: 17, fontWeight: '600' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 13 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

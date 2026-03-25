import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function ConnectionBar({ connected, demoActive, battery, lastSyncTime, colors }) {
  const [, setTick] = useState(0);

  // Re-render every 5s to update the "X ago" text
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  let status, dotColor;
  if (demoActive) {
    status = 'Preview Mode';
    dotColor = colors.cyan;
  } else if (connected) {
    status = 'Your band is connected';
    dotColor = colors.green;
  } else {
    status = "Let's connect your band";
    dotColor = '#64748b';
  }

  const syncText = lastSyncTime ? timeAgo(lastSyncTime) : null;

  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
      <Text style={[styles.brand, { color: colors.text1 }]}>NeuraFy</Text>
      <View style={styles.right}>
        {battery >= 0 && (
          <Text style={[styles.battery, { color: battery < 20 ? colors.amber : colors.text2 }]}>{battery}%</Text>
        )}
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View>
          <Text style={[styles.status, { color: colors.text2 }]}>{status}</Text>
          {syncText && <Text style={[styles.sync, { color: colors.text3 }]}>Updated {syncText}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  brand: { fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  battery: { fontSize: 15, fontVariant: ['tabular-nums'] },
  dot: { width: 9, height: 9, borderRadius: 5 },
  status: { fontSize: 15, fontWeight: '500' },
  sync: { fontSize: 12, marginTop: 1 },
});

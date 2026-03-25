import React from 'react';
import { ScrollView, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { dark, light } from '../theme/colors';

const METRICS = [
  { key: 'hr', label: 'Heart Rate', unit: 'BPM', color: 'red' },
  { key: 'sp', label: 'Blood Oxygen', unit: '%', color: 'cyan' },
  { key: 'gsr', label: 'Stress Level', unit: '', color: 'amber' },
  { key: 'gait', label: 'Movement & Balance', unit: '', color: 'green' },
  { key: 'rr', label: 'Breathing Rate', unit: 'br/min', color: 'cyan' },
  { key: 'nri', label: 'Brain Health Score', unit: '/100', color: 'violet', invert: true },
];

export default function TrendsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  const { histories } = useData();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <Text style={[styles.title, { color: colors.text1 }]}>Your Trends</Text>
        <Text style={[styles.subtitle, { color: colors.text2 }]}>How your readings have changed this session</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {METRICS.map(m => {
          const arr = histories.current[m.key] || [];
          const min = arr.length > 0 ? Math.round(Math.min(...arr)) : '--';
          const max = arr.length > 0 ? Math.round(Math.max(...arr)) : '--';
          const avg = arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : '--';
          const last = arr.length > 0 ? Math.round(arr[arr.length - 1]) : '--';

          // For Brain Health Score, invert (100 - nri)
          const display = (v) => {
            if (v === '--') return '--';
            return m.invert ? Math.max(0, 100 - v) : v;
          };

          return (
            <View key={m.key} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.metricLabel, { color: colors.text2 }]}>{m.label}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text1 }]}>{display(last)}</Text>
                  <Text style={[styles.statTag, { color: colors.text3 }]}>Now</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text1 }]}>{display(avg)}</Text>
                  <Text style={[styles.statTag, { color: colors.text3 }]}>Average</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text1 }]}>{display(min)}</Text>
                  <Text style={[styles.statTag, { color: colors.text3 }]}>Lowest</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text1 }]}>{display(max)}</Text>
                  <Text style={[styles.statTag, { color: colors.text3 }]}>Highest</Text>
                </View>
              </View>
              {/* Mini bar chart */}
              {arr.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.text3 }]}>Start a session to see your trends here</Text>
              ) : (
                <>
                  <View style={styles.barChart}>
                    {arr.slice(-30).map((v, i) => {
                      const slice = arr.slice(-30);
                      const range = (Math.max(...slice) - Math.min(...slice)) || 1;
                      const minVal = Math.min(...slice);
                      const pct = ((v - minVal) / range) * 100;
                      return (
                        <View key={i} style={[styles.bar, { height: `${Math.max(4, pct)}%`, backgroundColor: colors[m.color] }]} />
                      );
                    })}
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={[styles.timeLabel, { color: colors.text3 }]}>oldest</Text>
                    <Text style={[styles.timeLabel, { color: colors.text3 }]}>newest</Text>
                  </View>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 3 },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  metricLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.3, marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '600', fontVariant: ['tabular-nums'] },
  statTag: { fontSize: 14, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 40, gap: 1 },
  bar: { flex: 1, borderRadius: 1, minHeight: 2, opacity: 0.7 },
  emptyText: { fontSize: 15, textAlign: 'center', paddingVertical: 16 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timeLabel: { fontSize: 12, fontStyle: 'italic' },
});

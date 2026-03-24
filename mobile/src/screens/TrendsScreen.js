import React from 'react';
import { ScrollView, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { useData } from '../context/DataContext';
import { dark, light } from '../theme/colors';

export default function TrendsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  const { histories, latest } = useData();

  const renderMiniHistory = (label, data, unit, color) => {
    const arr = data || [];
    const min = arr.length > 0 ? Math.round(Math.min(...arr)) : '--';
    const max = arr.length > 0 ? Math.round(Math.max(...arr)) : '--';
    const avg = arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : '--';
    const last = arr.length > 0 ? Math.round(arr[arr.length - 1]) : '--';

    return (
      <View key={label} style={[styles.trendCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.trendLabel, { color: colors.text2 }]}>{label}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text1 }]}>{last}</Text>
            <Text style={[styles.statTag, { color: colors.text3 }]}>Current</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text1 }]}>{avg}</Text>
            <Text style={[styles.statTag, { color: colors.text3 }]}>Avg</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text1 }]}>{min}</Text>
            <Text style={[styles.statTag, { color: colors.text3 }]}>Min</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text1 }]}>{max}</Text>
            <Text style={[styles.statTag, { color: colors.text3 }]}>Max</Text>
          </View>
        </View>
        {/* Mini bar chart from history */}
        <View style={styles.barChart}>
          {arr.slice(-30).map((v, i) => {
            const range = (Math.max(...arr.slice(-30)) - Math.min(...arr.slice(-30))) || 1;
            const minVal = Math.min(...arr.slice(-30));
            const pct = ((v - minVal) / range) * 100;
            return (
              <View key={i} style={[styles.bar, { height: `${Math.max(4, pct)}%`, backgroundColor: color }]} />
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <Text style={[styles.title, { color: colors.text1 }]}>Trends</Text>
        <Text style={[styles.subtitle, { color: colors.text2 }]}>Last 60 seconds of session data</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderMiniHistory('Heart Rate (BPM)', histories.current.hr, 'BPM', colors.red)}
        {renderMiniHistory('Blood Oxygen (%)', histories.current.sp, '%', colors.cyan)}
        {renderMiniHistory('GSR (raw)', histories.current.gsr, 'raw', colors.amber)}
        {renderMiniHistory('Activity Score', histories.current.gait, '', colors.green)}
        {renderMiniHistory('Respiratory Rate', histories.current.rr, 'br/m', colors.cyan)}
        {renderMiniHistory('Neuro-Risk Index', histories.current.nri, '/100', colors.violet)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 32 },
  trendCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  trendLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  statTag: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 40, gap: 1 },
  bar: { flex: 1, borderRadius: 1, minHeight: 2, opacity: 0.7 },
});

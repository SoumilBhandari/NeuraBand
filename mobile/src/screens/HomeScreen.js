import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, useColorScheme, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useData } from '../context/DataContext';
import { dark, light } from '../theme/colors';
import { getVitalStatus, getGaitStatus, getSleepStatus, getNriStatus } from '../utils/thresholds';
import VitalCard from '../components/VitalCard';
import InsightCard from '../components/InsightCard';
import ConnectionBar from '../components/ConnectionBar';
import StreakBadge from '../components/StreakBadge';
import DailyScore, { computeDailyScore } from '../components/DailyScore';

const INSIGHTS = [
  { check: d => d.hr >= 60 && d.hr <= 80, msg: "Heart rhythm is steady. Keep doing what you're doing." },
  { check: d => d.hr > 100, msg: "Heart rate is elevated. Try sitting down and taking slow breaths." },
  { check: d => d.sp > 0 && d.sp < 94, msg: "Oxygen dipped slightly. Deep breaths and relaxation may help." },
  { check: d => d.gait > 0.2, msg: "Good activity level. Walking supports brain health." },
  { check: d => d.gait >= 0 && d.gait < 0.05, msg: "You've been still for a while. A short walk would help." },
  { check: d => d.nri < 30 && d.hr > 0, msg: "Brain health score looks good. Everything is on track." },
  { check: () => true, msg: "Keep wearing your band. Consistent data helps us track your health." },
];

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  const { latest, hrv, trends, connected, demoActive, lastSyncTime, histories } = useData();
  const [insight, setInsight] = useState("Put on your band to start monitoring.");
  const [streakDays, setStreakDays] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('neurafy_streak_data');
        const today = new Date().toDateString();
        if (raw) {
          const { count, lastDate } = JSON.parse(raw);
          if (lastDate === today) setStreakDays(count);
          else {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            const nc = lastDate === yesterday ? count + 1 : 1;
            setStreakDays(nc);
            await AsyncStorage.setItem('neurafy_streak_data', JSON.stringify({ count: nc, lastDate: today }));
          }
        } else {
          setStreakDays(1);
          await AsyncStorage.setItem('neurafy_streak_data', JSON.stringify({ count: 1, lastDate: today }));
        }
      } catch { setStreakDays(1); }
    })();
  }, []);

  useEffect(() => {
    if (latest.hr < 0) return;
    const m = INSIGHTS.filter(r => { try { return r.check(latest); } catch { return false; } });
    if (m.length > 0) setInsight(m[0].msg);
  }, [latest]);

  const score = computeDailyScore(latest, hrv);
  const hr = getVitalStatus(latest.hr, 'hr');
  const sp = getVitalStatus(latest.sp, 'sp');
  const gait = getGaitStatus(latest.gait);
  const slp = getSleepStatus(latest.slp);
  const nri = getNriStatus(latest.nri);
  const brainScore = nri.displayValue !== undefined ? nri.displayValue : '--';

  const hrvColor = hrv.sdnn === null ? colors.text3 : hrv.sdnn >= 50 ? colors.green : colors.amber;
  const hrvLabel = hrv.sdnn === null ? 'Collecting...' : hrv.sdnn >= 50 ? 'Calm' : hrv.sdnn >= 30 ? 'Moderate' : 'Elevated';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ConnectionBar connected={connected} demoActive={demoActive} battery={latest.bt}
        lastSyncTime={lastSyncTime} colors={colors} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }} tintColor={colors.tint} />}>

        <DailyScore score={score} colors={colors} />
        <StreakBadge days={streakDays} colors={colors} />

        <Text style={[styles.section, { color: colors.text3 }]}>VITALS</Text>

        <VitalCard label="Heart Rate" value={latest.hr > 0 ? latest.hr : undefined}
          unit="BPM" sparkData={histories.current.hr}
          statusColor={hr.color} statusLabel={hr.label} colors={colors} />

        <VitalCard label="Blood Oxygen" value={latest.sp > 0 ? latest.sp : undefined}
          unit="%" sparkData={histories.current.sp}
          statusColor={sp.color} statusLabel={sp.label} colors={colors} />

        <VitalCard label="Brain Health" value={brainScore}
          unit="/100" sparkData={histories.current.nri}
          statusColor={nri.color} statusLabel={nri.label} colors={colors} />

        <VitalCard label="Heart Calmness" value={hrv.sdnn !== null ? hrv.sdnn : undefined}
          unit="ms" statusColor={hrvColor} statusLabel={hrvLabel} colors={colors} />

        <Text style={[styles.section, { color: colors.text3 }]}>ACTIVITY</Text>

        <VitalCard label="Movement" value={latest.gait >= 0 ? latest.gait.toFixed(2) : undefined}
          unit="" sparkData={histories.current.gait}
          statusColor={gait.color} statusLabel={gait.label} colors={colors} />

        <VitalCard label="Sleep Quality" value={latest.slp >= 0 ? latest.slp : undefined}
          unit="/100" statusColor={slp.color} statusLabel={slp.label} colors={colors} />

        <InsightCard message={insight} colors={colors} />

        <Text style={[styles.footnote, { color: colors.text3 }]}>
          NeuraFy is a research tool, not a medical device.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 13, fontWeight: '600', letterSpacing: 0.8, marginTop: 16, marginBottom: 8, marginLeft: 4 },
  footnote: { fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 16 },
});

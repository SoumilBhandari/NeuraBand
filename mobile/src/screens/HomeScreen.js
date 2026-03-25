import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useData } from '../context/DataContext';
import { dark, light } from '../theme/colors';
import { getVitalStatus, getGaitStatus, getSleepStatus, getNriStatus } from '../utils/thresholds';
import VitalCard from '../components/VitalCard';
import InsightCard from '../components/InsightCard';
import ConnectionBar from '../components/ConnectionBar';
import StreakBadge from '../components/StreakBadge';

const PATIENT_INSIGHTS = [
  { check: d => d.hr >= 60 && d.hr <= 80, msg: "Your heart rhythm is steady — that's wonderful. Keep doing what you're doing!" },
  { check: d => d.hr > 100, msg: "Your heart rate is a bit high. Try sitting down and taking 5 slow, deep breaths." },
  { check: d => d.sp > 0 && d.sp < 94, msg: "Your oxygen level dipped. Take some deep breaths and relax for a few minutes." },
  { check: d => d.gait > 0.2, msg: "You're staying active! Walking is one of the best things for brain health." },
  { check: d => d.gait >= 0 && d.gait < 0.05, msg: "Time for a short walk! Even 5 minutes of gentle movement helps your brain." },
  { check: d => d.slp >= 70, msg: "Great sleep! Consistent rest is one of the most powerful things for memory." },
  { check: d => d.nri < 30 && d.hr > 0, msg: "Your brain health score is looking great. Everything is on track!" },
  { check: d => d.rr >= 12 && d.rr <= 20, msg: "Your breathing is calm and steady. That's a great sign." },
  { check: () => true, msg: "Keep wearing your band — every day of data helps us understand your health better." },
];

function getDailySummary(d) {
  if (d.hr < 0) return "Waiting for your first reading... Make sure your band is on.";
  const parts = [];
  if (d.hr >= 60 && d.hr <= 100) parts.push("your heart looks strong");
  if (d.sp >= 95) parts.push("oxygen levels are healthy");
  if (d.gait > 0.1) parts.push("you've been moving around");
  else parts.push("a walk would do you good");
  if (parts.length === 0) return "We're monitoring your health. Check back in a moment.";
  return "Today, " + parts.join(", ") + ". Keep it up!";
}

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  const { latest, hrv, trends, connected, demoActive, lastSyncTime } = useData();
  const [insight, setInsight] = useState("Wear your band and we'll start tracking.");
  const [streakDays, setStreakDays] = useState(0);

  // Persist streak with AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('neurafy_streak_data');
        const today = new Date().toDateString();
        if (raw) {
          const { count, lastDate } = JSON.parse(raw);
          if (lastDate === today) {
            setStreakDays(count);
          } else {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            const newCount = lastDate === yesterday ? count + 1 : 1;
            setStreakDays(newCount);
            await AsyncStorage.setItem('neurafy_streak_data', JSON.stringify({ count: newCount, lastDate: today }));
          }
        } else {
          setStreakDays(1);
          await AsyncStorage.setItem('neurafy_streak_data', JSON.stringify({ count: 1, lastDate: today }));
        }
      } catch (e) { setStreakDays(1); }
    })();
  }, []);

  // Update insight based on latest readings
  useEffect(() => {
    if (latest.hr < 0) return;
    const matched = PATIENT_INSIGHTS.filter(r => { try { return r.check(latest); } catch { return false; } });
    if (matched.length > 0) setInsight(matched[0].msg);
  }, [latest]);

  const hrStatus = getVitalStatus(latest.hr, 'hr');
  const spStatus = getVitalStatus(latest.sp, 'sp');
  const gaitStatus = getGaitStatus(latest.gait);
  const sleepStatus = getSleepStatus(latest.slp);
  const nriStatus = getNriStatus(latest.nri);
  const brainScore = nriStatus.displayValue !== undefined ? nriStatus.displayValue : '--';

  // HRV status
  const GREEN = '#10b981', AMBER = '#f59e0b', BLUE = '#64748b';
  const hrvStatus = hrv.sdnn === null
    ? { color: BLUE, label: 'Collecting data...' }
    : hrv.sdnn >= 50
    ? { color: GREEN, label: 'Calm and balanced' }
    : hrv.sdnn >= 30
    ? { color: AMBER, label: 'Slightly tense' }
    : { color: AMBER, label: 'Your body is working hard' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ConnectionBar connected={connected} demoActive={demoActive} battery={latest.bt}
        lastSyncTime={lastSyncTime} colors={colors} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <StreakBadge days={streakDays} colors={colors} />

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.summaryText, { color: colors.text1 }]}>{getDailySummary(latest)}</Text>
        </View>

        <VitalCard icon="❤️" label="Heart Rate" value={latest.hr > 0 ? latest.hr : undefined}
          unit="BPM" trend={trends.hr} metricKey="hr"
          statusColor={hrStatus.color} statusLabel={hrStatus.label} colors={colors} />

        <VitalCard icon="🫁" label="Blood Oxygen" value={latest.sp > 0 ? latest.sp : undefined}
          unit="%" trend={trends.sp} metricKey="sp"
          statusColor={spStatus.color} statusLabel={spStatus.label} colors={colors} />

        <VitalCard icon="🧠" label="Brain Health Score" value={brainScore}
          unit="/100" trend={trends.nri} metricKey="nri"
          statusColor={nriStatus.color} statusLabel={nriStatus.label} colors={colors} />

        <VitalCard icon="🧘" label="Heart Calmness" value={hrv.sdnn !== null ? hrv.sdnn : undefined}
          unit="ms" trend="stable" metricKey="hrv"
          statusColor={hrvStatus.color} statusLabel={hrvStatus.label} colors={colors} />

        <VitalCard icon="🏃" label="Movement & Balance"
          value={latest.gait >= 0 ? latest.gait.toFixed(2) : undefined}
          unit="" trend="stable" metricKey="gait"
          statusColor={gaitStatus.color} statusLabel={gaitStatus.label} colors={colors} />

        <VitalCard icon="😴" label="Sleep Quality" value={latest.slp >= 0 ? latest.slp : undefined}
          unit="/100" trend="stable" metricKey="slp"
          statusColor={sleepStatus.color} statusLabel={sleepStatus.label} colors={colors} />

        <InsightCard message={insight} colors={colors} />

        <Text style={[styles.disclaimer, { color: colors.text3 }]}>
          NeuraFy is a research tool — not a medical device. Always consult your doctor for health concerns.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  summaryCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  summaryText: { fontSize: 16, lineHeight: 23, textAlign: 'center' },
  disclaimer: { fontSize: 14, textAlign: 'center', marginTop: 20, lineHeight: 18 },
});

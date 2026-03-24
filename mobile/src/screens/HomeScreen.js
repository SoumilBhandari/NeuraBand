import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { dark, light } from '../theme/colors';
import { getVitalStatus, getGaitStatus, getSleepStatus, getNriStatus } from '../utils/thresholds';
import VitalCard from '../components/VitalCard';
import InsightCard from '../components/InsightCard';
import ConnectionBar from '../components/ConnectionBar';

const PATIENT_INSIGHTS = [
  { check: d => d.hr >= 60 && d.hr <= 80, msg: "Your heart rhythm is steady. Great job staying calm!" },
  { check: d => d.hr > 100, msg: "Your heart rate is a bit high. Try sitting down and taking slow breaths." },
  { check: d => d.sp > 0 && d.sp < 94, msg: "Your oxygen level is lower than usual. Take some deep breaths." },
  { check: d => d.gait > 0.2, msg: "You're staying active! Walking is great for brain health." },
  { check: d => d.gait >= 0 && d.gait < 0.05, msg: "Time for a short walk! Even 5 minutes helps circulation." },
  { check: d => d.slp >= 70, msg: "Great sleep! Consistent rest supports memory and cognition." },
  { check: d => d.slp >= 0 && d.slp < 50 && d.slps === 1, msg: "Your sleep was light. Try a consistent bedtime routine." },
  { check: d => d.nri > 60, msg: "Some of your health metrics need attention. Consider talking to your doctor." },
  { check: d => d.nri < 30 && d.hr > 0, msg: "All your vitals look healthy. Keep up the great work!" },
  { check: d => d.rr >= 12 && d.rr <= 20, msg: "Your breathing rate is normal. Nice and relaxed." },
];

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  const { latest, trends, connected, demoActive } = useData();
  const [insight, setInsight] = useState('Waiting for data...');

  useEffect(() => {
    if (latest.hr < 0) return;
    const matched = PATIENT_INSIGHTS.filter(r => { try { return r.check(latest); } catch { return false; } });
    if (matched.length > 0) setInsight(matched[0].msg);
  }, [latest]);

  const hrStatus = getVitalStatus(latest.hr, 'hr');
  const spStatus = getVitalStatus(latest.sp, 'sp');
  const rrStatus = getVitalStatus(latest.rr, 'rr');
  const gaitStatus = getGaitStatus(latest.gait);
  const sleepStatus = getSleepStatus(latest.slp);
  const tmpStatus = getVitalStatus(latest.tmp, 'tmp');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ConnectionBar connected={connected} demoActive={demoActive} battery={latest.bt} colors={colors} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <VitalCard icon="❤️" label="Heart Rate" value={latest.hr > 0 ? latest.hr : undefined}
          unit="BPM" trend={trends.hr} metricKey="hr"
          statusColor={hrStatus.color} statusLabel={hrStatus.label} colors={colors} />

        <VitalCard icon="🫁" label="Blood Oxygen" value={latest.sp > 0 ? latest.sp : undefined}
          unit="%" trend={trends.sp} metricKey="sp"
          statusColor={spStatus.color} statusLabel={spStatus.label} colors={colors} />

        <VitalCard icon="💤" label="Sleep Quality" value={latest.slp >= 0 ? latest.slp : undefined}
          unit="/100" trend="stable" metricKey="slp"
          statusColor={sleepStatus.color} statusLabel={sleepStatus.label} colors={colors} />

        <VitalCard icon="🏃" label="Activity" value={latest.gait >= 0 ? latest.gait.toFixed(2) : undefined}
          unit="score" trend="stable" metricKey="gait"
          statusColor={gaitStatus.color} statusLabel={gaitStatus.label} colors={colors} />

        <VitalCard icon="🌡️" label="Temperature" value={latest.tmp > 0 ? latest.tmp.toFixed(1) : undefined}
          unit="°C" trend="stable" metricKey="tmp"
          statusColor={tmpStatus.color} statusLabel={tmpStatus.label} colors={colors} />

        <InsightCard message={insight} colors={colors} />

        <Text style={[styles.disclaimer, { color: colors.text3 }]}>
          Research prototype — not for clinical diagnosis
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  disclaimer: { fontSize: 10, textAlign: 'center', marginTop: 16, letterSpacing: 0.5 },
});

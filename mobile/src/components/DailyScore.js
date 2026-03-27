import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const SIZE = 120;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getLabel(score) {
  if (score >= 80) return 'Great day';
  if (score >= 60) return 'Doing well';
  if (score >= 40) return 'Take it easy';
  return 'Rest up';
}

export function computeDailyScore(latest, hrv) {
  let total = 0, weights = 0;
  if (latest.hr > 0) {
    const s = latest.hr >= 60 && latest.hr <= 100 ? 100 : latest.hr >= 50 && latest.hr <= 110 ? 70 : 40;
    total += s * 0.20; weights += 0.20;
  }
  if (latest.sp > 0) {
    const s = latest.sp >= 95 ? 100 : latest.sp >= 92 ? 60 : 30;
    total += s * 0.20; weights += 0.20;
  }
  if (hrv.sdnn !== null) {
    const s = hrv.sdnn >= 50 ? 100 : hrv.sdnn >= 30 ? 60 : 30;
    total += s * 0.20; weights += 0.20;
  }
  if (latest.gait >= 0) {
    const s = latest.gait > 0.2 ? 100 : latest.gait > 0.05 ? 60 : 30;
    total += s * 0.15; weights += 0.15;
  }
  if (latest.slp >= 0) {
    total += Math.min(100, latest.slp) * 0.15; weights += 0.15;
  }
  if (latest.gsr > 0) {
    const s = latest.gsr < 500 ? 100 : latest.gsr < 650 ? 60 : 30;
    total += s * 0.10; weights += 0.10;
  }
  return weights > 0 ? Math.round(total / weights) : 0;
}

export default function DailyScore({ score, colors }) {
  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * Math.min(score, 100)) / 100;
  const arcColor = score >= 70 ? colors.green : score >= 40 ? colors.amber : colors.text3;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.row}>
        <View style={styles.ring}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE/2} cy={SIZE/2} r={RADIUS}
              stroke={colors.separator} strokeWidth={STROKE} fill="none" />
            <Circle cx={SIZE/2} cy={SIZE/2} r={RADIUS}
              stroke={arcColor} strokeWidth={STROKE} fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
              rotation="-90" origin={`${SIZE/2}, ${SIZE/2}`} />
          </Svg>
          <View style={styles.center}>
            <Text style={[styles.num, { color: colors.text1 }]}>{score || '--'}</Text>
          </View>
        </View>
        <View style={styles.info}>
          <Text style={[styles.heading, { color: colors.text3 }]}>DAILY SCORE</Text>
          <Text style={[styles.label, { color: colors.text1 }]}>{getLabel(score)}</Text>
          <Text style={[styles.sub, { color: colors.text2 }]}>
            Based on heart rate, oxygen, calmness, movement, sleep, and stress.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 20, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ring: { position: 'relative', width: SIZE, height: SIZE },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 36, fontWeight: '700', fontVariant: ['tabular-nums'] },
  info: { flex: 1 },
  heading: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  label: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  sub: { fontSize: 13, lineHeight: 18 },
});

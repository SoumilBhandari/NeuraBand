import React from 'react';
import { ScrollView, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { dark, light } from '../theme/colors';

const TIPS = [
  { icon: '🧠', title: 'Brain Health & Walking', body: 'Regular walking improves cerebral blood flow. Even 10 minutes of walking promotes brain health and reduces cognitive decline risk.' },
  { icon: '💤', title: 'Sleep & Memory', body: 'During deep sleep, your brain clears waste proteins. Aim for 7-8 hours with a consistent bedtime to support memory consolidation.' },
  { icon: '🫁', title: 'Deep Breathing', body: 'Try the 4-7-8 technique: inhale 4 seconds, hold 7, exhale 8. This activates your vagus nerve and improves heart rate variability.' },
  { icon: '❤️', title: 'Heart-Brain Connection', body: 'Your heart rhythm variability reflects brain health. Activities like yoga, meditation, and moderate exercise can improve HRV over time.' },
  { icon: '🌡️', title: 'Circadian Rhythm', body: 'Your body temperature naturally cycles throughout the day. Consistent wake/sleep times and morning light exposure strengthen this rhythm.' },
  { icon: '🏃', title: 'Movement Matters', body: 'Gait variability is a biomarker researchers use to assess neurological health. Stay active — your movement patterns tell a story about your brain.' },
  { icon: '💧', title: 'Stay Hydrated', body: 'Dehydration affects skin conductance and cognitive performance. Aim for 8 glasses of water daily, more if active.' },
  { icon: '🧘', title: 'Stress Management', body: 'Chronic stress impacts your autonomic nervous system. Your skin conductance readings reflect stress levels — practice daily relaxation.' },
];

export default function InsightsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  const { latest } = useData();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <Text style={[styles.title, { color: colors.text1 }]}>Health Tips</Text>
        <Text style={[styles.subtitle, { color: colors.text2 }]}>Evidence-based guidance for brain health</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {TIPS.map((tip, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{tip.icon}</Text>
              <Text style={[styles.cardTitle, { color: colors.text1 }]}>{tip.title}</Text>
            </View>
            <Text style={[styles.cardBody, { color: colors.text2 }]}>{tip.body}</Text>
          </View>
        ))}
        <Text style={[styles.disclaimer, { color: colors.text3 }]}>
          These tips are for general wellness — not medical advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 32 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardIcon: { fontSize: 22 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardBody: { fontSize: 13, lineHeight: 19 },
  disclaimer: { fontSize: 10, textAlign: 'center', marginTop: 12, letterSpacing: 0.5 },
});

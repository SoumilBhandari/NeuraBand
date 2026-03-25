import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Dimensions } from 'react-native';
import { dark, light } from '../theme/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Welcome to NeuraFy',
    body: "We're here to help you track your brain health — easily and gently. No complicated numbers, just simple updates about how you're doing.",
    accent: '🧠',
  },
  {
    title: 'What You\'ll See',
    body: 'Five simple health readings, each shown in plain language.\n\nGreen means great.\nAmber means worth checking.\n\nThat\'s it. No confusing charts or medical jargon.',
    accent: '💚',
  },
  {
    title: 'Just Wear Your Band',
    body: "Put it on and forget about it. We'll track everything automatically. Check in whenever you like — your health story builds over time.",
    accent: '⌚',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  const [page, setPage] = useState(0);

  const isLast = page === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <Text style={styles.accent}>{SLIDES[page].accent}</Text>
        <Text style={[styles.title, { color: colors.text1 }]}>{SLIDES[page].title}</Text>
        <Text style={[styles.body, { color: colors.text2 }]}>{SLIDES[page].body}</Text>
      </View>

      {/* Page dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i === page ? colors.cyan : colors.cardBorder }]} />
        ))}
      </View>

      <View style={styles.buttons}>
        {page > 0 && (
          <TouchableOpacity onPress={() => setPage(page - 1)} style={[styles.btn, { borderColor: colors.cardBorder }]}>
            <Text style={[styles.btnText, { color: colors.text2 }]}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => isLast ? onComplete() : setPage(page + 1)}
          style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.cyan }]}
        >
          <Text style={[styles.btnText, { color: '#fff' }]}>{isLast ? "Let's Go" : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32 },
  content: { alignItems: 'center', marginBottom: 40 },
  accent: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  body: { fontSize: 17, lineHeight: 26, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  btn: {
    paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12,
    borderWidth: 1, borderColor: 'transparent', minWidth: 120, alignItems: 'center',
  },
  btnPrimary: { borderWidth: 0 },
  btnText: { fontSize: 16, fontWeight: '600' },
});

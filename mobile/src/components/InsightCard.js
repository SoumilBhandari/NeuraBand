import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function InsightCard({ message, colors }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.text, { color: colors.text1 }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1, borderRadius: 12, padding: 14,
    marginTop: 10,
  },
  text: { fontSize: 16, lineHeight: 24 },
});

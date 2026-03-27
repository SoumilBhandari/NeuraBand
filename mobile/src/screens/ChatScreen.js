import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { getVitalStatus, getGaitStatus, getNriStatus } from '../utils/thresholds';
import { dark, light } from '../theme/colors';
import TypingDots from '../components/TypingDots';

// ─── Knowledge Base ───
// Each entry: { keywords: string[], response: string (with {placeholders}) }
// Longer/more specific keywords checked first (ordered by array position).
const KNOWLEDGE = [
  // Status queries
  { keywords: ['how am i', 'am i okay', 'am i ok', 'is everything normal', 'how am i doing'],
    response: "Based on your latest readings:\n\nHeart rate: {hr} BPM — {hr_status}\nBlood oxygen: {sp}% — {sp_status}\nBrain health: {nri_score}/100 — {nri_status}\nMovement: {gait_status}\nHeart calmness: {hrv_text}\n\nOverall, {summary}." },

  // Heart rate
  { keywords: ['heart rate', 'heart beat', 'pulse', 'bpm', 'heartbeat'],
    response: "Your heart rate is currently {hr} BPM.\n\n{hr_status_detail}\n\nA normal resting heart rate for adults is 60–100 BPM. Regular exercise, deep breathing, and staying hydrated all help keep it steady." },

  // Blood oxygen
  { keywords: ['blood oxygen', 'oxygen', 'spo2', 'sp02', 'o2'],
    response: "Your blood oxygen is {sp}%.\n\n{sp_status_detail}\n\nHealthy levels are 95–100%. Deep breathing exercises and fresh air can help. If it stays below 94%, please talk to your doctor." },

  // Brain health / NRI
  { keywords: ['brain health', 'brain score', 'neuro', 'nri', 'cognitive', 'alzheimer', 'dementia'],
    response: "Your Brain Health Score is {nri_score}/100.\n\n{nri_status_detail}\n\nThis score combines your heart rhythm stability, movement patterns, stress levels, and other biomarkers. Higher is better! Walking, sleeping well, and staying socially active all help." },

  // HRV
  { keywords: ['hrv', 'heart calmness', 'heart variability', 'variability', 'calm'],
    response: "Your Heart Calmness (HRV) is {hrv_text}.\n\n{hrv_detail}\n\nHRV measures how adaptable your heart is to stress. Higher numbers mean your body is relaxed and recovering well. Try slow, deep breaths — inhale 4 seconds, hold 4, exhale 6." },

  // Stress / GSR
  { keywords: ['stress', 'gsr', 'anxious', 'nervous', 'tense', 'worried', 'electrodermal'],
    response: "Your stress indicator reads {gsr}.\n\n{gsr_detail}\n\nElectrodermal activity measures tiny changes in skin moisture caused by your nervous system. Lower readings usually mean you're calmer. Try a few minutes of slow breathing or listening to music you enjoy." },

  // Movement / Gait
  { keywords: ['movement', 'walking', 'gait', 'exercise', 'activity', 'steps', 'balance'],
    response: "Your movement score is {gait}.\n\n{gait_status_detail}\n\nRegular movement is one of the strongest protectors of brain health. Even a 10-minute gentle walk can boost blood flow to the brain. Try to move a little every hour!" },

  // Sleep
  { keywords: ['sleep', 'rest', 'tired', 'fatigue', 'insomnia'],
    response: "Your sleep quality score is {slp}/100.\n\n{slp_detail}\n\nGood sleep is essential for brain health — it's when your brain clears waste proteins linked to Alzheimer's. Aim for 7–8 hours, keep a consistent bedtime, and avoid screens before bed." },

  // Breathing / Respiratory
  { keywords: ['breathing', 'breath', 'respiratory', 'respiration'],
    response: "Your breathing rate is {rr} breaths per minute.\n\nNormal is 12–20 breaths/min. Slow, deep breathing activates your parasympathetic nervous system, which reduces stress and supports brain health.\n\nTry this: breathe in for 4 seconds, hold for 4, breathe out for 6. Repeat 5 times." },

  // Temperature
  { keywords: ['temperature', 'temp', 'body temp', 'fever'],
    response: "Your skin temperature is {tmp}°C.\n\nSkin temperature varies throughout the day as part of your circadian rhythm. Consistent patterns suggest your body clock is healthy, which is important for sleep quality and brain function." },

  // Battery
  { keywords: ['battery', 'charge', 'power'],
    response: "Your band's battery is at {bt}%.\n\n{bt_detail}" },

  // What is / explanations
  { keywords: ['what is neurafy', 'what does this do', 'about this app', 'how does this work'],
    response: "NeuraFy is a brain health monitoring band. It continuously tracks your heart rhythm, blood oxygen, movement, stress, and other biomarkers that research has linked to early signs of cognitive change.\n\nAll you need to do is wear it — we handle the rest! Your readings update every second and are shown in simple, clear language." },

  { keywords: ['what should i do', 'help me', 'tips', 'advice', 'improve', 'suggestions'],
    response: "Here are the best things you can do for your brain health right now:\n\n1. Take a 10-minute walk\n2. Do 5 deep breathing cycles (in 4s, hold 4s, out 6s)\n3. Drink a glass of water\n4. Aim for 7-8 hours of sleep tonight\n5. Have a conversation with someone you enjoy\n\nSmall daily habits make a big difference over time." },

  // Greetings
  { keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    response: "Hello! I'm your NeuraFy health assistant. I can help you understand your health readings.\n\nTry asking me:\n• \"How is my heart rate?\"\n• \"What is my brain health score?\"\n• \"Any tips for me?\"\n• \"Am I okay?\"" },

  // Thank you
  { keywords: ['thank', 'thanks'],
    response: "You're welcome! Remember, wearing your band every day helps us track your health more accurately. Keep up the great work! " },
];

const SUGGESTIONS = [
  "How am I doing?",
  "What is my brain health score?",
  "Any tips for me?",
  "How is my heart rate?",
];

function interpolate(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] !== undefined ? data[key] : '--');
}

function buildContext(latest, hrv) {
  const hrS = getVitalStatus(latest.hr, 'hr');
  const spS = getVitalStatus(latest.sp, 'sp');
  const nriS = getNriStatus(latest.nri);
  const gaitS = getGaitStatus(latest.gait);
  const nriScore = nriS.displayValue !== undefined ? nriS.displayValue : '--';

  const hrDetail = latest.hr > 100 ? "That's a bit elevated. Try sitting down and taking some slow breaths."
    : latest.hr < 55 ? "That's on the lower side. If you feel dizzy or faint, please sit down."
    : "That's in a healthy range — your heart is beating steadily.";

  const spDetail = latest.sp >= 95 ? "Excellent — your blood is carrying plenty of oxygen."
    : latest.sp >= 92 ? "Slightly below normal. Try some deep breaths and see if it improves."
    : "That's below the healthy range. Please sit down, breathe deeply, and contact your doctor if it doesn't improve.";

  const hrvText = hrv.sdnn !== null ? `${hrv.sdnn} ms (SDNN)` : 'still collecting data';
  const hrvDetail = hrv.sdnn === null ? "We need a few more minutes of data to calculate your heart calmness."
    : hrv.sdnn >= 50 ? "Great — your heart is calm and adaptable. This suggests good recovery and low stress."
    : hrv.sdnn >= 30 ? "Your heart variability is moderate. Some gentle breathing or relaxation could help."
    : "Your heart variability is low, which can mean your body is under stress. Try resting and deep breathing.";

  const gsrDetail = latest.gsr > 600 ? "Your stress level is elevated. Try taking a few minutes to relax." : "Your stress level looks calm.";
  const gaitDetail = latest.gait > 0.2 ? "You're being active right now — wonderful for your brain!"
    : latest.gait > 0.05 ? "Light activity detected. A bit more movement would be great!"
    : "You've been still for a while. Even a short walk helps!";

  const slpDetail = latest.slp >= 70 ? "Great sleep quality! Keep up those good sleep habits."
    : latest.slp >= 50 ? "Fair sleep. Try a consistent bedtime and avoiding caffeine after noon."
    : latest.slp >= 0 ? "Your sleep could use improvement. Good sleep is critical for brain health."
    : "No sleep data yet.";

  const btDetail = latest.bt > 50 ? "Plenty of charge left." : latest.bt > 20 ? "Getting low — charge soon." : "Very low — please charge your band.";

  const goods = [];
  if (latest.hr >= 60 && latest.hr <= 100) goods.push("heart rate is steady");
  if (latest.sp >= 95) goods.push("oxygen levels are healthy");
  if (latest.gait > 0.1) goods.push("you've been moving");
  const summary = goods.length > 0 ? `${goods.join(", ")}. Keep it up!` : "we're still gathering data — check back in a moment";

  return {
    hr: latest.hr > 0 ? latest.hr : '--', sp: latest.sp > 0 ? latest.sp : '--',
    gsr: latest.gsr || '--', gait: latest.gait >= 0 ? latest.gait.toFixed(2) : '--',
    rr: latest.rr > 0 ? latest.rr : '--', tmp: latest.tmp > 0 ? latest.tmp.toFixed(1) : '--',
    slp: latest.slp >= 0 ? latest.slp : '--', bt: latest.bt >= 0 ? latest.bt : '--',
    nri_score: nriScore,
    hr_status: hrS.label, sp_status: spS.label, nri_status: nriS.label, gait_status: gaitS.label,
    hr_status_detail: hrDetail, sp_status_detail: spDetail,
    nri_status_detail: nriS.label, gait_status_detail: gaitDetail,
    hrv_text: hrvText, hrv_detail: hrvDetail,
    gsr_detail: gsrDetail, slp_detail: slpDetail, bt_detail: btDetail,
    summary,
  };
}

function matchQuestion(input, latest, hrv) {
  const lower = input.toLowerCase().trim();
  const ctx = buildContext(latest, hrv);

  for (const entry of KNOWLEDGE) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return interpolate(entry.response, ctx);
    }
  }

  return "I can help you understand your health readings! Try asking:\n\n• \"How is my heart rate?\"\n• \"What is my brain health score?\"\n• \"Am I okay?\"\n• \"Any tips for me?\"\n• \"What is blood oxygen?\"";
}

export default function ChatScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  const { latest, hrv } = useData();
  const [messages, setMessages] = useState([
    { id: '0', from: 'bot', text: "Hi! I'm your NeuraFy health assistant. Ask me anything about your readings — I'm here to help you understand your health in simple terms. " },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const flatListRef = useRef(null);

  const sendMessage = useCallback((text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;
    setInput('');

    const userMsg = { id: Date.now().toString(), from: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    // Simulated thinking delay
    setTimeout(() => {
      const response = matchQuestion(trimmed, latest, hrv);
      const botMsg = { id: (Date.now() + 1).toString(), from: 'bot', text: response };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
    }, 800 + Math.random() * 400);
  }, [input, latest, hrv]);

  const renderMessage = ({ item }) => {
    const isUser = item.from === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble,
        { backgroundColor: isUser ? colors.cyan : colors.card, borderColor: isUser ? 'transparent' : colors.cardBorder }]}>
        {!isUser && <Text style={[styles.botLabel, { color: colors.cyan }]}>NeuraFy</Text>}
        <Text style={[styles.msgText, { color: isUser ? '#fff' : colors.text1 }]}>{item.text}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <Text style={[styles.title, { color: colors.text1 }]}>Health Assistant</Text>
        <Text style={[styles.subtitle, { color: colors.text2 }]}>Ask me about your readings</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {typing && (
          <View style={[styles.typingRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TypingDots color={colors.cyan} />
          </View>
        )}

        {/* Quick suggestion chips — horizontal scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SUGGESTIONS.map((s, i) => (
            <TouchableOpacity key={i} style={[styles.chip, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
              onPress={() => sendMessage(s)}>
              <Text style={[styles.chipText, { color: colors.cyan }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
          <TextInput
            style={[styles.input, { color: colors.text1, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your health..."
            placeholderTextColor={colors.text3}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.cyan }]} onPress={() => sendMessage()}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 3 },
  msgList: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '80%', borderRadius: 18, padding: 12, paddingHorizontal: 16, marginBottom: 6 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  botBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 0 },
  botLabel: { fontSize: 11, fontWeight: '600', marginBottom: 3, letterSpacing: 0.5, textTransform: 'uppercase' },
  msgText: { fontSize: 15, lineHeight: 22 },
  typingRow: { marginHorizontal: 16, marginBottom: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: '500' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  sendBtn: { borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  sendText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

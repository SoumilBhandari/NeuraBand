import React, { useRef, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Switch, TouchableOpacity, Alert, useColorScheme, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { generateDemoData, resetDemo } from '../services/DemoService';
import { getNriStatus } from '../utils/thresholds';
import { dark, light } from '../theme/colors';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  const { demoActive, setDemoActive, processData, dataLog, latest } = useData();
  const demoRef = useRef(null);

  useEffect(() => {
    if (demoActive) {
      resetDemo();
      demoRef.current = setInterval(() => processData(generateDemoData()), 1000);
    } else {
      if (demoRef.current) clearInterval(demoRef.current);
    }
    return () => { if (demoRef.current) clearInterval(demoRef.current); };
  }, [demoActive, processData]);

  const exportCSV = async () => {
    const log = dataLog.current;
    if (!log || log.length === 0) { Alert.alert('No Data', 'No session data to export yet.'); return; }
    const headers = 'timestamp,hr,spo2,gsr,gait,ibi,rr,tmp,hum,lux,prs,slp,nri,battery\n';
    const rows = log.map(d =>
      `${d.ts || ''},${d.hr || ''},${d.sp || ''},${d.gsr || ''},${d.gait || ''},${d.ibi || ''},${d.rr || ''},${d.tmp || ''},${d.hum || ''},${d.lux || ''},${d.prs || ''},${d.slp || ''},${d.nri || ''},${d.bt || ''}`
    ).join('\n');
    try {
      await Share.share({ message: headers + rows, title: 'NeuraFy Health Data' });
    } catch (e) { Alert.alert('Export Failed', e.message); }
  };

  const shareWithFamily = async () => {
    const d = latest;
    const nri = getNriStatus(d.nri);
    const brainScore = nri.displayValue !== undefined ? nri.displayValue : '--';
    const hrText = d.hr > 0 ? `${d.hr} BPM (${d.hr >= 60 && d.hr <= 100 ? 'good' : 'check with doctor'})` : 'no reading';
    const spText = d.sp > 0 ? `${d.sp}% (${d.sp >= 95 ? 'good' : 'check with doctor'})` : 'no reading';

    const msg = `NeuraFy Health Update\n\n` +
      `Heart Rate: ${hrText}\n` +
      `Blood Oxygen: ${spText}\n` +
      `Brain Health Score: ${brainScore}/100 (${nri.label})\n` +
      `Movement: ${d.gait > 0.2 ? 'Active' : d.gait > 0.05 ? 'Light' : 'Resting'}\n\n` +
      `Sent from the NeuraFy brain health monitor.`;

    try {
      await Share.share({ message: msg, title: 'NeuraFy Update' });
    } catch (e) { Alert.alert('Share Failed', e.message); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <Text style={[styles.title, { color: colors.text1 }]}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text2 }]}>DEVICE</Text>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text1 }]}>Preview Mode</Text>
            <Switch value={demoActive} onValueChange={setDemoActive}
              trackColor={{ false: colors.text3, true: colors.cyan }} thumbColor="#fff" />
          </View>
          <Text style={[styles.rowHint, { color: colors.text3 }]}>
            See what the app looks like with sample health data — no band needed.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text2 }]}>SHARE & EXPORT</Text>
          <TouchableOpacity style={[styles.btn, { borderColor: colors.cyan }]} onPress={shareWithFamily}>
            <Text style={[styles.btnText, { color: colors.cyan }]}>Share Update with Family</Text>
          </TouchableOpacity>
          <Text style={[styles.rowHint, { color: colors.text3 }]}>
            Send a quick health summary to a family member or caregiver.
          </Text>
          <TouchableOpacity style={[styles.btn, { borderColor: colors.cardBorder, marginTop: 10 }]} onPress={exportCSV}>
            <Text style={[styles.btnText, { color: colors.text2 }]}>Export Full Data (CSV)</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text2 }]}>ABOUT NEURAFY</Text>
          <Text style={[styles.aboutText, { color: colors.text1 }]}>NeuraFy v1.0</Text>
          <Text style={[styles.aboutText, { color: colors.text2 }]}>
            NeuraFy is a wearable band that gently monitors your brain health throughout the day.
            It tracks your heart rhythm, blood oxygen, movement, breathing, sleep, stress levels,
            and more — all from a small, comfortable band.
          </Text>
          <Text style={[styles.aboutText, { color: colors.text2, marginTop: 10 }]}>
            Created by Soumil Bhandari as part of Alzheimer's disease early detection research.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.amber }]}>IMPORTANT</Text>
          <Text style={[styles.aboutText, { color: colors.text2 }]}>
            NeuraFy is a research tool and is not a medical device. It cannot diagnose or treat
            any condition. If you feel unwell or have health concerns, please contact your doctor
            or call emergency services.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 16 },
  rowHint: { fontSize: 15, marginTop: 8, lineHeight: 22 },
  btn: { borderWidth: 1.5, borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '600' },
  aboutText: { fontSize: 16, lineHeight: 24, marginBottom: 4 },
});

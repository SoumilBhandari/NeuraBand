import React, { useRef, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Switch, TouchableOpacity, Alert, useColorScheme, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { generateDemoData, resetDemo } from '../services/DemoService';
import { dark, light } from '../theme/colors';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  const { demoActive, setDemoActive, processData, dataLog, setConnected } = useData();
  const demoRef = useRef(null);

  useEffect(() => {
    if (demoActive) {
      resetDemo();
      demoRef.current = setInterval(() => {
        processData(generateDemoData());
      }, 1000);
    } else {
      if (demoRef.current) clearInterval(demoRef.current);
    }
    return () => { if (demoRef.current) clearInterval(demoRef.current); };
  }, [demoActive, processData]);

  const exportCSV = async () => {
    const log = dataLog.current;
    if (!log || log.length === 0) { Alert.alert('No Data', 'No session data to export.'); return; }
    const headers = 'timestamp,hr,spo2,gsr,gait,ibi,rr,tmp,hum,lux,prs,slp,nri,battery\n';
    const rows = log.map(d =>
      `${d.ts || ''},${d.hr || ''},${d.sp || ''},${d.gsr || ''},${d.gait || ''},${d.ibi || ''},${d.rr || ''},${d.tmp || ''},${d.hum || ''},${d.lux || ''},${d.prs || ''},${d.slp || ''},${d.nri || ''},${d.bt || ''}`
    ).join('\n');
    try {
      await Share.share({ message: headers + rows, title: 'NeuraFy Session Data' });
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    }
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
            <Text style={[styles.rowLabel, { color: colors.text1 }]}>Demo Mode</Text>
            <Switch value={demoActive} onValueChange={setDemoActive}
              trackColor={{ false: colors.text3, true: colors.cyan }}
              thumbColor="#fff" />
          </View>
          <Text style={[styles.rowHint, { color: colors.text3 }]}>
            Simulates sensor data without connecting to a real device.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text2 }]}>DATA</Text>
          <TouchableOpacity style={[styles.btn, { borderColor: colors.cardBorder }]} onPress={exportCSV}>
            <Text style={[styles.btnText, { color: colors.cyan }]}>Export Session as CSV</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text2 }]}>ABOUT</Text>
          <Text style={[styles.aboutText, { color: colors.text1 }]}>NeuraFy v1.0</Text>
          <Text style={[styles.aboutText, { color: colors.text2 }]}>
            Wearable biomarker monitor for Alzheimer's disease early detection research.
          </Text>
          <Text style={[styles.aboutText, { color: colors.text2 }]}>
            10-modality passive monitoring: HR, SpO2, HRV, GSR, Gait, Respiratory Rate,
            Temperature, Humidity, Light, Pressure + Composite Neuro-Risk Index.
          </Text>
          <Text style={[styles.aboutText, { color: colors.text2, marginTop: 8 }]}>
            By Soumil Bhandari
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.red }]}>DISCLAIMER</Text>
          <Text style={[styles.aboutText, { color: colors.text2 }]}>
            This application is a research prototype and is NOT a medical device.
            It is not intended to diagnose, treat, cure, or prevent any disease.
            Do not make medical decisions based on this data. Consult your healthcare provider.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 32 },
  section: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 15 },
  rowHint: { fontSize: 11, marginTop: 6 },
  btn: { borderWidth: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '600' },
  aboutText: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
});

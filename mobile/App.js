import React, { useState, useEffect } from 'react';
import { useColorScheme, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataProvider } from './src/context/DataContext';
import HomeScreen from './src/screens/HomeScreen';
import TrendsScreen from './src/screens/TrendsScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { dark, light } from './src/theme/colors';

const Tab = createBottomTabNavigator();

const NeuraFyDark = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: dark.bg, card: dark.tabBar, border: dark.cardBorder, text: dark.text1, primary: dark.cyan },
};
const NeuraFyLight = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: light.bg, card: light.tabBar, border: light.cardBorder, text: light.text1, primary: light.cyan },
};

// ─── Error Boundary ───
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error('NeuraFy Error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.icon}>⚠️</Text>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.body}>Please restart the app. If this keeps happening, try reinstalling.</Text>
          <TouchableOpacity style={errorStyles.btn} onPress={() => this.setState({ hasError: false })}>
            <Text style={errorStyles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#060a13', padding: 32 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#e8ecf1', marginBottom: 10, textAlign: 'center' },
  body: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  btn: { backgroundColor: '#06b6d4', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

// ─── Tab Bar ───
function CustomTabBar({ state, descriptors, navigation, colors }) {
  return (
    <View style={[tabStyles.container, { backgroundColor: colors.tabBar, borderTopColor: colors.cardBorder }]}>
      <View style={tabStyles.inner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || route.name;
          const isFocused = state.index === index;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={[
                tabStyles.tab,
                {
                  backgroundColor: isFocused ? (colors === dark ? 'rgba(6,182,212,0.12)' : 'rgba(8,145,178,0.08)') : 'transparent',
                  borderColor: isFocused ? colors.tabActive : colors.cardBorder,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[tabStyles.label, { color: isFocused ? colors.tabActive : colors.tabInactive, fontWeight: isFocused ? '700' : '500' }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: { borderTopWidth: 0.5, paddingTop: 10, paddingBottom: 36, paddingHorizontal: 12 },
  inner: { flexDirection: 'row', gap: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  label: { fontSize: 13, letterSpacing: 0.2 },
});

// ─── App ───
export default function App() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('neurafy_onboarded').then(val => {
      setShowOnboarding(val !== 'true');
    });
  }, []);

  const completeOnboarding = () => {
    AsyncStorage.setItem('neurafy_onboarded', 'true');
    setShowOnboarding(false);
  };

  if (showOnboarding === null) return null;

  return (
    <SafeAreaProvider>
    <ErrorBoundary>
    <DataProvider>
      {showOnboarding ? (
        <OnboardingScreen onComplete={completeOnboarding} />
      ) : (
        <NavigationContainer theme={scheme === 'dark' ? NeuraFyDark : NeuraFyLight}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} colors={colors} />}
            screenOptions={{ headerShown: false }}
          >
            <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Vitals' }} />
            <Tab.Screen name="Trends" component={TrendsScreen} options={{ tabBarLabel: 'Trends' }} />
            <Tab.Screen name="Tips" component={InsightsScreen} options={{ tabBarLabel: 'Tips' }} />
            <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: 'Ask' }} />
            <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
          </Tab.Navigator>
        </NavigationContainer>
      )}
    </DataProvider>
    </ErrorBoundary>
    </SafeAreaProvider>
  );
}

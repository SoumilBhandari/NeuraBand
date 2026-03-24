import React from 'react';
import { useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { DataProvider } from './src/context/DataContext';
import HomeScreen from './src/screens/HomeScreen';
import TrendsScreen from './src/screens/TrendsScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
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

export default function App() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;

  return (
    <DataProvider>
      <NavigationContainer theme={scheme === 'dark' ? NeuraFyDark : NeuraFyLight}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.tabActive,
            tabBarInactiveTintColor: colors.tabInactive,
            tabBarStyle: { borderTopColor: colors.cardBorder, paddingTop: 4 },
            tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
          }}
        >
          <Tab.Screen name="Home" component={HomeScreen}
            options={{ tabBarLabel: 'Vitals', tabBarIcon: ({ color }) => <TabIcon emoji="❤️" color={color} /> }} />
          <Tab.Screen name="Trends" component={TrendsScreen}
            options={{ tabBarLabel: 'Trends', tabBarIcon: ({ color }) => <TabIcon emoji="📈" color={color} /> }} />
          <Tab.Screen name="Tips" component={InsightsScreen}
            options={{ tabBarLabel: 'Tips', tabBarIcon: ({ color }) => <TabIcon emoji="💡" color={color} /> }} />
          <Tab.Screen name="Settings" component={SettingsScreen}
            options={{ tabBarLabel: 'Settings', tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} /> }} />
        </Tab.Navigator>
      </NavigationContainer>
    </DataProvider>
  );
}

function TabIcon({ emoji }) {
  return <React.Fragment>{/* Using emoji as tab icons for simplicity */}</ React.Fragment>;
}

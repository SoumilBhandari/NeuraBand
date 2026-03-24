import React from 'react';
import { useColorScheme, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
              <Text style={[tabStyles.label, { color: isFocused ? colors.tabActive : colors.tabInactive }]}>
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
  container: {
    borderTopWidth: 0.5,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 12,
  },
  inner: {
    flexDirection: 'row',
    gap: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default function App() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;

  return (
    <SafeAreaProvider>
    <DataProvider>
      <NavigationContainer theme={scheme === 'dark' ? NeuraFyDark : NeuraFyLight}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Tab.Navigator
          tabBar={(props) => <CustomTabBar {...props} colors={colors} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Vitals' }} />
          <Tab.Screen name="Trends" component={TrendsScreen} options={{ tabBarLabel: 'Trends' }} />
          <Tab.Screen name="Tips" component={InsightsScreen} options={{ tabBarLabel: 'Tips' }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </DataProvider>
    </SafeAreaProvider>
  );
}


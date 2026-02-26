import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { languageReadyPromise } from './i18n/config';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    languageReadyPromise.then(() => setLanguageReady(true));
  }, []);

  if (!languageReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#d4af37" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppRoutes />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
});

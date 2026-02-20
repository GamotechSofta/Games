import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppRoutes />
    </SafeAreaProvider>
  );
}

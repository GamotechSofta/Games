import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GameRate() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Game Rate</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontSize: 18 },
});

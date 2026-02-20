/**
 * Storage abstraction – uses AsyncStorage in React Native (same API as localStorage for get/set/remove).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeService {
  ThemeService._();
  static final ThemeService instance = ThemeService._();

  static const _kThemeModeKey = 'app_theme_mode';
  final ValueNotifier<ThemeMode> mode = ValueNotifier<ThemeMode>(ThemeMode.dark);

  Future<void> loadThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kThemeModeKey);
    if (raw == 'light') {
      mode.value = ThemeMode.light;
      return;
    }
    if (raw == 'dark') {
      mode.value = ThemeMode.dark;
      return;
    }
    mode.value = ThemeMode.dark;
  }

  Future<void> setThemeMode(ThemeMode next) async {
    if (mode.value == next) return;
    mode.value = next;
    final prefs = await SharedPreferences.getInstance();
    final raw = next == ThemeMode.light ? 'light' : 'dark';
    await prefs.setString(_kThemeModeKey, raw);
  }

  Future<void> toggleThemeMode() async {
    final next = mode.value == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    await setThemeMode(next);
  }
}

import 'package:shared_preferences/shared_preferences.dart';

/// Minimal persisted user for demo / integration with your auth flow.
class UserSession {
  static const _keyId = 'userId';
  static const _keyName = 'userName';
  static const _keyPhone = 'userPhone';

  static Future<void> save({
    required String userId,
    String name = '',
    String phone = '',
  }) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_keyId, userId);
    await p.setString(_keyName, name);
    await p.setString(_keyPhone, phone);
  }

  static Future<Map<String, String>> load() async {
    final p = await SharedPreferences.getInstance();
    return {
      'userId': p.getString(_keyId) ?? '',
      'name': p.getString(_keyName) ?? 'Player',
      'phone': p.getString(_keyPhone) ?? '',
    };
  }
}

import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';
import 'device_id_service.dart';
import 'login_device_name.dart';

const _kUserKey = 'user';

/// Auth API aligned with React [Login.jsx] and future signup.
class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  Future<Map<String, dynamic>?> getStoredUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kUserKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Bearer token from stored user (several API shapes).
  static String? sessionToken(Map<String, dynamic>? user) {
    if (user == null) return null;
    for (final key in const [
      'token',
      'accessToken',
      'access_token',
      'userToken',
      'authToken',
    ]) {
      final t = user[key]?.toString().trim();
      if (t != null && t.isNotEmpty) return t;
    }
    return null;
  }

  /// Resolves Mongo/user id from stored session (login `data.id`, legacy `_id`, etc.).
  static String? storedUserId(Map<String, dynamic>? user) {
    if (user == null) return null;
    for (final key in const ['userId', 'id', '_id']) {
      final raw = user[key];
      final parsed = _normalizeIdValue(raw);
      if (parsed != null) return parsed;
    }
    final nested = user['user'];
    if (nested is Map<String, dynamic>) {
      return storedUserId(nested);
    }
    if (nested is Map) {
      return storedUserId(Map<String, dynamic>.from(nested));
    }
    return null;
  }

  static String? _normalizeIdValue(dynamic raw) {
    if (raw == null) return null;
    if (raw is Map) {
      final oid = raw[r'$oid'] ?? raw['oid'];
      if (oid != null) {
        final s = oid.toString().trim();
        if (s.isNotEmpty && s != 'null') return s;
      }
    }
    final s = raw.toString().trim();
    if (s.isEmpty || s == 'null') return null;
    return s;
  }

  /// Matches web [Profile.jsx]: logged in when `user` exists in storage (id), not only JWT.
  static bool isLoggedInUser(Map<String, dynamic>? user) {
    if (user == null) return false;
    if (sessionToken(user) != null) return true;
    return storedUserId(user) != null;
  }

  Future<bool> hasValidSession() async {
    final u = await getStoredUser();
    return isLoggedInUser(u);
  }

  Future<String?> getSessionToken() async {
    final u = await getStoredUser();
    return sessionToken(u);
  }

  Future<void> saveUser(Map<String, dynamic> payload) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kUserKey, jsonEncode(payload));
  }

  Future<void> clearUser() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kUserKey);
  }

  /// Ends **this** device's session on the server, then clears local user and stored device id.
  ///
  /// Always clears locally even if the network call fails, so the user is logged out on this phone.
  /// Uses `POST /users/logout` with the session token (same family as [login] / [heartbeat]).
  Future<void> logoutThisDevice() async {
    final u = await getStoredUser();
    final token = sessionToken(u);
    final deviceId = await DeviceIdService.instance.getOrCreate();
    final phone =
        u?['phone']?.toString().trim() ?? u?['username']?.toString().trim() ?? '';

    if (token != null && token.isNotEmpty) {
      try {
        await http.post(
          Uri.parse('$kApiBaseUrl/users/logout'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode({
            'deviceId': deviceId,
            'deviceID': deviceId,
            if (phone.isNotEmpty) 'phone': phone,
            if (phone.isNotEmpty) 'username': phone,
          }),
        );
      } catch (_) {
        // Offline or unknown route — still clear locally below.
      }
    }

    await clearUser();
    await DeviceIdService.instance.clearStoredId();
  }

  /// Updates [balance] / [walletBalance] in stored user (same keys as React [updateUserBalance]).
  Future<void> updateStoredBalance(num balance) async {
    final u = await getStoredUser();
    if (u == null) return;
    u['balance'] = balance;
    u['walletBalance'] = balance;
    await saveUser(u);
  }

  /// `POST /users/logout-device` — body: [phone], [password], [deviceId] (all required by API).
  Future<AuthResult> logoutDevice({
    required String phone,
    required String password,
    String? deviceId,
  }) async {
    final id = deviceId ?? await DeviceIdService.instance.getOrCreate();
    final uri = Uri.parse('$kApiBaseUrl/users/logout-device');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'phone': phone.trim(),
        'password': password,
        'deviceId': id,
      }),
    );

    return _parseAuthResponse(response, requireUserData: false);
  }

  static const _loginMaxAttempts = 3;
  static const _loginRetryDelayMs = 1200;

  /// `POST /users/login` — same body as web [otpAuthApi.loginWithPassword].
  ///
  /// On `DEVICE_LIMIT_REACHED`, returns [AuthResult.code] and [AuthResult.activeDevices] for the UI
  /// (per-device `logout-device` then retry login — see [AuthForm]).
  Future<AuthResult> login({
    required String phone,
    required String password,
    int attempt = 0,
  }) async {
    final phoneTrim = phone.trim();
    final deviceIdForLogin = await DeviceIdService.instance.getOrCreate();
    final deviceName = getLoginDeviceName();

    Future<AuthResult> postLogin(String id) async {
      final uri = Uri.parse('$kApiBaseUrl/users/login');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone': phoneTrim,
          'password': password,
          'deviceId': id,
          'deviceName': deviceName,
        }),
      );
      return _parseAuthResponse(response);
    }

    AuthResult result;
    try {
      result = await postLogin(deviceIdForLogin);
    } catch (_) {
      if (attempt < _loginMaxAttempts - 1) {
        await Future<void>.delayed(
          Duration(milliseconds: _loginRetryDelayMs * (attempt + 1)),
        );
        return login(phone: phone, password: password, attempt: attempt + 1);
      }
      return const AuthResult(ok: false, message: 'Network error. Please try again.');
    }

    if (!result.ok && _isInactiveDeviceMessage(result.message)) {
      final freshId = await DeviceIdService.instance.regenerate();
      try {
        result = await postLogin(freshId);
      } catch (_) {
        return const AuthResult(ok: false, message: 'Network error. Please try again.');
      }
    }
    return result;
  }

  /// `POST /users/otp/send` — [purpose] is `login` or `signup` (web [AuthForm]).
  Future<AuthResult> sendOtp({
    required String phone,
    String purpose = 'login',
  }) async {
    final uri = Uri.parse('$kApiBaseUrl/users/otp/send');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'phone': phone.trim(),
        'purpose': purpose,
      }),
    );
    return _parseAuthResponse(response, requireUserData: false);
  }

  /// `POST /users/otp/resend` — resend OTP to [phone].
  Future<AuthResult> resendOtp({required String phone}) async {
    final uri = Uri.parse('$kApiBaseUrl/users/otp/resend');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone.trim()}),
    );
    return _parseAuthResponse(response, requireUserData: false);
  }

  /// `POST /users/otp/verify` — verifies OTP; signup creates account (web [AuthForm]).
  Future<AuthResult> verifyOtp({
    required String phone,
    required String otp,
    String purpose = 'login',
    String? firstName,
    String? lastName,
    String? referredBy,
  }) async {
    final deviceId = await DeviceIdService.instance.getOrCreate();
    final uri = Uri.parse('$kApiBaseUrl/users/otp/verify');
    final body = <String, dynamic>{
      'phone': phone.trim(),
      'otp': otp.trim(),
      'purpose': purpose,
      'deviceId': deviceId,
    };
    if (firstName != null && firstName.trim().isNotEmpty) {
      body['firstName'] = firstName.trim();
    }
    if (lastName != null && lastName.trim().isNotEmpty) {
      body['lastName'] = lastName.trim();
    }
    if (referredBy != null && referredBy.trim().isNotEmpty) {
      body['referredBy'] = referredBy.trim();
    }
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    return _parseAuthResponse(response);
  }

  static bool _isInactiveDeviceMessage(String message) {
    final s = message.toLowerCase();
    return (s.contains('device') && s.contains('not active')) ||
        s.contains('device is not active');
  }

  /// `GET /users/me` — refresh profile after login (web [fetchMyProfile]).
  Future<AuthResult> fetchMyProfile({String? token}) async {
    final sessionToken = token ?? await getSessionToken();
    if (sessionToken == null || sessionToken.isEmpty) {
      return const AuthResult(ok: false, message: 'Not authenticated');
    }
    final uri = Uri.parse('$kApiBaseUrl/users/me');
    final response = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $sessionToken',
      },
    );
    return _parseAuthResponse(response);
  }

  /// `POST /users/signup` — same body as web [otpAuthApi.signupUser].
  Future<AuthResult> register({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
    String? referredBy,
  }) async {
    final deviceId = await DeviceIdService.instance.getOrCreate();
    final fName = firstName.trim();
    final lName = lastName.trim();
    final phoneTrim = phone.trim();
    final uri = Uri.parse('$kApiBaseUrl/users/signup');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': '$fName $lName'.trim(),
        'firstName': fName,
        'lastName': lName,
        'phone': phoneTrim,
        'email': '$phoneTrim@player.local',
        'password': password,
        if (referredBy != null && referredBy.trim().isNotEmpty)
          'referredBy': referredBy.trim(),
        'deviceId': deviceId,
      }),
    );

    return _parseAuthResponse(response, requireUserData: false);
  }

  AuthResult _parseAuthResponse(
    http.Response response, {
    bool requireUserData = true,
  }) {
    Map<String, dynamic>? data;
    try {
      data = jsonDecode(response.body) as Map<String, dynamic>?;
    } catch (_) {
      return AuthResult(
        ok: false,
        message: 'Invalid response from server. Please try again.',
      );
    }

    final statusOk = response.statusCode >= 200 && response.statusCode < 300;
    final success =
        data?['success'] == true ||
        data?['ok'] == true ||
        (statusOk && data?['success'] != false);
    final message =
        data?['message']?.toString() ??
        data?['error']?.toString() ??
        data?['msg']?.toString() ??
        (statusOk ? 'Success' : 'Something went wrong');
    if (!success) {
      final code = data?['code']?.toString();
      List<Map<String, dynamic>>? activeDevices;
      if (code != null && code.toUpperCase() == 'DEVICE_LIMIT_REACHED') {
        activeDevices = _parseActiveDevices(data?['data']);
      }
      return AuthResult(
        ok: false,
        message: message,
        code: code,
        activeDevices: activeDevices,
      );
    }

    final inner = data?['data'];
    if (!requireUserData) {
      Map<String, dynamic>? user;
      if (inner is Map<String, dynamic>) {
        user = Map<String, dynamic>.from(inner);
      } else if (data?['user'] is Map<String, dynamic>) {
        user = Map<String, dynamic>.from(data!['user'] as Map<String, dynamic>);
      }
      final topLevelToken = data?['token']?.toString();
      if (user != null &&
          (user['token']?.toString().isEmpty ?? true) &&
          topLevelToken != null &&
          topLevelToken.isNotEmpty) {
        user['token'] = topLevelToken;
      }
      return AuthResult(ok: true, message: message, user: user);
    }

    if (inner is! Map<String, dynamic>) {
      return AuthResult(ok: false, message: 'Invalid response from server.');
    }
    final mergedUser = Map<String, dynamic>.from(inner);
    final topLevelToken = data?['token']?.toString();
    if ((mergedUser['token']?.toString().isEmpty ?? true) &&
        topLevelToken != null &&
        topLevelToken.isNotEmpty) {
      mergedUser['token'] = topLevelToken;
    }
    return AuthResult(ok: true, message: message, user: mergedUser);
  }

  static List<Map<String, dynamic>>? _parseActiveDevices(Object? rawData) {
    if (rawData is! Map) return null;
    final container = Map<String, dynamic>.from(rawData);
    final raw = container['activeDevices'];
    if (raw is! List) return null;
    final out = <Map<String, dynamic>>[];
    for (final e in raw) {
      if (e is Map<String, dynamic>) {
        out.add(e);
      } else if (e is Map) {
        out.add(Map<String, dynamic>.from(e));
      }
    }
    return out.isEmpty ? null : out;
  }
}

class AuthResult {
  const AuthResult({
    required this.ok,
    required this.message,
    this.user,
    this.code,
    this.activeDevices,
  });

  final bool ok;
  final String message;
  final Map<String, dynamic>? user;
  /// e.g. `DEVICE_LIMIT_REACHED` from [Login.jsx].
  final String? code;
  final List<Map<String, dynamic>>? activeDevices;
}

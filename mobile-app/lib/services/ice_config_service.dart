import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import 'webrtc_config.dart';

/// Fetches STUN/TURN from backend so calls work across different networks.
class IceConfigService {
  static Map<String, dynamic>? _cached;
  static DateTime? _cachedAt;
  static const _cacheMinutes = 45;

  static String get _apiBase {
    final socket = AppConfig.socketUrl.replaceAll(RegExp(r'/$'), '');
    return '$socket/api/v1';
  }

  static Future<Map<String, dynamic>> getRtcConfiguration() async {
    if (_cached != null && _cachedAt != null) {
      final age = DateTime.now().difference(_cachedAt!);
      if (age.inMinutes < _cacheMinutes) return _cached!;
    }

    try {
      final uri = Uri.parse('$_apiBase/call/ice-config');
      final res = await http.get(uri).timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        if (json['success'] == true) {
          final data = json['data'] as Map<String, dynamic>?;
          final list = data?['iceServers'] as List<dynamic>?;
          if (list != null && list.isNotEmpty) {
            final turnOk = data?['turnConfigured'] == true;
            final policy = data?['iceTransportPolicy'] as String?
                ?? (turnOk ? 'relay' : 'all');
            _cached = {
              'iceServers': list,
              'iceTransportPolicy': policy,
              'turnConfigured': turnOk,
            };
            _cachedAt = DateTime.now();
            if (!turnOk) {
              // ignore: avoid_print
              print(
                '[call] TURN not configured on server — cross-network calls will fail. '
                'Self-host coturn: backend/turn-server/README.md (TURN_URL in .env).',
              );
            }
            return _cached!;
          }
        }
      }
    } catch (e) {
      // ignore: avoid_print
      print('[call] ICE config fetch failed: $e');
    }

    _cached = {
      ...WebRtcConfig.iceServers,
      'iceTransportPolicy': 'all',
      'turnConfigured': false,
    };
    _cachedAt = DateTime.now();
    return _cached!;
  }
}

import 'package:flutter_dotenv/flutter_dotenv.dart';

/// API base URL loaded from `.env` first, then `--dart-define`, then fallback.
String get kApiBaseUrl {
  final fromEnv = dotenv.env['API_BASE_URL']?.trim() ?? '';
  if (fromEnv.isNotEmpty) return fromEnv;

  const fromDefine = String.fromEnvironment('API_BASE_URL', defaultValue: '');
  if (fromDefine.isNotEmpty) return fromDefine;

  return 'https://api.aakda.in/api/v1';
}

/// Socket.IO origin (no `/api/v1`) — mirrors web [getSocketUrl].
String get kSocketBaseUrl {
  final fromEnv = dotenv.env['SOCKET_URL']?.trim() ?? '';
  if (fromEnv.isNotEmpty) return fromEnv.replaceAll(RegExp(r'/+$'), '');

  const fromDefine = String.fromEnvironment('SOCKET_URL', defaultValue: '');
  if (fromDefine.isNotEmpty) return fromDefine.replaceAll(RegExp(r'/+$'), '');

  final api = kApiBaseUrl.replaceAll(RegExp(r'/+$'), '');
  if (api.endsWith('/api/v1')) {
    return api.substring(0, api.length - '/api/v1'.length);
  }
  return api.replaceAll(RegExp(r'/api/v1/?$'), '');
}

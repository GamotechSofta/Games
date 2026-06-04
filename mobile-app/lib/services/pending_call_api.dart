import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';

class PendingCallApi {
  static String get _base =>
      '${AppConfig.socketUrl.replaceAll(RegExp(r'/$'), '')}/api/v1';

  static Future<Map<String, dynamic>?> fetchByCallId(
    String callId, {
    String? userId,
  }) async {
    final q = userId != null ? '?userId=${Uri.encodeComponent(userId)}' : '';
    final res = await http
        .get(Uri.parse('$_base/call/pending/$callId$q'))
        .timeout(const Duration(seconds: 15));
    if (res.statusCode != 200) return null;
    final json = jsonDecode(res.body) as Map<String, dynamic>;
    if (json['success'] != true) return null;
    return Map<String, dynamic>.from(json['data'] as Map);
  }
}

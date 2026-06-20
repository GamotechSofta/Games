import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../config/api_config.dart';
import 'auth_service.dart';
import 'session_coordinator.dart';

/// Help desk API — [frontend/src/pages/Support/SupportNew.jsx], [SupportStatus.jsx].
class HelpDeskService {
  HelpDeskService._();
  static final HelpDeskService instance = HelpDeskService._();

  Future<SubmitTicketResult> submitTicket({
    required String subject,
    required String description,
    List<String> imagePaths = const [],
  }) async {
    final user = await AuthService.instance.getStoredUser();
    final userId = AuthService.storedUserId(user);
    final token = AuthService.sessionToken(user);
    if (userId == null || userId.isEmpty) {
      return const SubmitTicketResult(
        success: false,
        message: 'Please log in to send a request.',
      );
    }

    final uri = Uri.parse('$kApiBaseUrl/help-desk/tickets');
    final req = http.MultipartRequest('POST', uri);
    if (token != null && token.isNotEmpty) {
      req.headers['Authorization'] = 'Bearer $token';
    }
    // Do not set Content-Type — MultipartRequest sets multipart boundary.
    req.fields['userId'] = userId;
    req.fields['subject'] = subject.trim().isEmpty ? 'Support Request' : subject.trim();
    req.fields['description'] = description.trim();

    for (final raw in imagePaths) {
      final path = raw.trim();
      if (path.isNotEmpty) {
        req.files.add(await _screenshotPart(path));
      }
    }

    http.StreamedResponse streamed;
    try {
      streamed = await req.send();
    } catch (_) {
      return const SubmitTicketResult(success: false, message: 'Network error. Please try again.');
    }

    final res = await http.Response.fromStream(streamed);
    if (res.statusCode == 401) {
      await SessionCoordinator.instance.forceLogoutToLogin();
      return const SubmitTicketResult(success: false, message: 'Session expired. Please log in again.', unauthorized: true);
    }

    return _parseSubmitResponse(res);
  }

  static String _basename(String path) {
    final i = path.lastIndexOf(RegExp(r'[/\\]'));
    return i >= 0 ? path.substring(i + 1) : path;
  }

  static MediaType? _guessImageMediaType(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return MediaType('image', 'png');
    if (lower.endsWith('.gif')) return MediaType('image', 'gif');
    if (lower.endsWith('.webp')) return MediaType('image', 'webp');
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      return MediaType('image', 'jpeg');
    }
    return null;
  }

  static Future<http.MultipartFile> _screenshotPart(String path) async {
    final name = _basename(path);
    final ct = _guessImageMediaType(path);
    return http.MultipartFile.fromPath(
      'screenshots',
      path,
      filename: name.isNotEmpty ? name : 'screenshot.jpg',
      contentType: ct,
    );
  }

  SubmitTicketResult _parseSubmitResponse(http.Response res) {
    final raw = res.body.trim();

    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (raw.isEmpty) {
        return const SubmitTicketResult(
          success: true,
          message: 'Your request has been submitted. We will get back to you soon.',
        );
      }
      try {
        final data = jsonDecode(raw) as Map<String, dynamic>?;
        if (data?['success'] == true) {
          return SubmitTicketResult(
            success: true,
            message: data?['message']?.toString() ??
                'Your request has been submitted. We will get back to you soon.',
          );
        }
        return SubmitTicketResult(
          success: false,
          message: data?['message']?.toString() ?? 'Failed to submit. Please try again.',
        );
      } catch (_) {
        // Some deployments return 200 with plain text or non-JSON.
        return const SubmitTicketResult(
          success: true,
          message: 'Your request has been submitted. We will get back to you soon.',
        );
      }
    }

    if (raw.isEmpty) {
      return SubmitTicketResult(
        success: false,
        message: 'Request failed (HTTP ${res.statusCode}). Please try again.',
      );
    }
    try {
      final data = jsonDecode(raw) as Map<String, dynamic>?;
      return SubmitTicketResult(
        success: false,
        message: data?['message']?.toString() ?? 'Failed to submit. Please try again.',
      );
    } catch (_) {
      return SubmitTicketResult(
        success: false,
        message: 'Request failed (HTTP ${res.statusCode}). Please try again.',
      );
    }
  }

  Future<MyTicketsResult> fetchMyTickets() async {
    final user = await AuthService.instance.getStoredUser();
    final userId = AuthService.storedUserId(user);
    if (userId == null || userId.isEmpty) {
      return const MyTicketsResult(
        success: false,
        message: 'Please log in to see your tickets.',
        tickets: [],
      );
    }

    final token = AuthService.sessionToken(user);
    final headers = <String, String>{};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    final uri = Uri.parse('$kApiBaseUrl/help-desk/my-tickets').replace(
      queryParameters: {'userId': userId},
    );
    http.Response res;
    try {
      res = await http.get(uri, headers: headers);
    } catch (_) {
      return const MyTicketsResult(
        success: false,
        message: 'Network error. Try again.',
        tickets: [],
      );
    }

    if (res.statusCode == 401) {
      await SessionCoordinator.instance.forceLogoutToLogin();
      return const MyTicketsResult(success: false, message: 'Session expired', tickets: [], unauthorized: true);
    }

    try {
      final data = jsonDecode(res.body) as Map<String, dynamic>?;
      if (data?['success'] == true && data?['data'] is List) {
        final list = (data!['data'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        return MyTicketsResult(success: true, tickets: list);
      }
    } catch (_) {
      return const MyTicketsResult(
        success: false,
        message: 'Invalid response from server.',
        tickets: [],
      );
    }
    return MyTicketsResult(
      success: false,
      message: 'Failed to load tickets.',
      tickets: [],
    );
  }
}

class SubmitTicketResult {
  const SubmitTicketResult({
    required this.success,
    this.message,
    this.unauthorized = false,
  });

  final bool success;
  final String? message;
  final bool unauthorized;
}

class MyTicketsResult {
  const MyTicketsResult({
    required this.success,
    this.message,
    this.tickets = const [],
    this.unauthorized = false,
  });

  final bool success;
  final String? message;
  final List<Map<String, dynamic>> tickets;
  final bool unauthorized;
}

import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'auth_service.dart';
import 'session_coordinator.dart';

final _objectId = RegExp(r'^[a-fA-F0-9]{24}$');

String? _toObjectIdString(dynamic v) {
  if (v == null) return null;
  if (v is String) return v.trim().isEmpty ? null : v.trim();
  if (v is Map && v[r'$oid'] != null) return v[r'$oid'].toString().trim();
  final s = v.toString().trim();
  return s.isEmpty ? null : s;
}

bool _isValidObjectId(String? id) => id != null && _objectId.hasMatch(id);

String? _normalizeBetOn(dynamic v) {
  final s = (v ?? '').toString().trim().toLowerCase();
  if (s.isEmpty) return null;
  if (s == 'open' || s == 'openbet') return 'open';
  if (s == 'close' || s == 'closed' || s == 'closebet') return 'close';
  return null;
}

class PlaceBetLine {
  const PlaceBetLine({
    required this.betType,
    required this.betNumber,
    required this.amount,
    this.betOn,
  });

  final String betType;
  final String betNumber;
  final num amount;
  final String? betOn;
}

class PlaceBetResult {
  const PlaceBetResult({
    required this.success,
    this.message,
    this.newBalance,
    this.betIds,
  });

  final bool success;
  final String? message;
  final num? newBalance;
  /// From `POST /bets/place` → `data.betIds` (Mongo `_id` per line, same order as request).
  final List<String>? betIds;
}

/// `POST /bets/place` — same contract as [frontend/src/api/bets.js] `placeBet`.
class BetsService {
  BetsService._();
  static final BetsService instance = BetsService._();

  Future<PlaceBetResult> placeBet({
    required dynamic marketId,
    required List<PlaceBetLine> lines,
    String? scheduledDate,
  }) async {
    final user = await AuthService.instance.getStoredUser();
    final rawUserId = user?['userId'] ?? user?['id'] ?? user?['_id'];
    if (rawUserId == null) {
      return const PlaceBetResult(success: false, message: 'Please log in to place a bet');
    }
    final userId = _toObjectIdString(rawUserId);
    if (!_isValidObjectId(userId)) {
      return const PlaceBetResult(success: false, message: 'Session invalid. Please log in again.');
    }

    final normalizedMarketId = _toObjectIdString(marketId ?? user?['marketId']);
    if (!_isValidObjectId(normalizedMarketId)) {
      return const PlaceBetResult(
        success: false,
        message: 'This market is not available for betting. Please go back and select a market from the list.',
      );
    }

    if (lines.isEmpty) {
      return const PlaceBetResult(success: false, message: 'No bets to place');
    }

    for (final b in lines) {
      final amount = b.amount;
      if (b.betType.trim().isEmpty || b.betNumber.trim().isEmpty || amount <= 0) {
        return const PlaceBetResult(
          success: false,
          message: 'Each bet must have betType, betNumber and amount > 0',
        );
      }
      if (amount > 1000000) {
        return const PlaceBetResult(success: false, message: 'Bet amount cannot exceed ₹10,00,000');
      }
    }

    final total = lines.fold<num>(0, (s, b) => s + b.amount);
    if (total <= 0) {
      return const PlaceBetResult(success: false, message: 'Total bet amount must be greater than 0');
    }

    // Same as web [bets.js] placeBet: server trusts userId in body; route has no JWT middleware.
    final token = AuthService.sessionToken(user);

    final payload = <String, dynamic>{
      'userId': userId,
      'marketId': normalizedMarketId,
      'bets': lines
          .map((b) => {
                // Match [frontend/src/api/bets.js]: lowercase betType for server contract.
                'betType': b.betType.trim().toLowerCase(),
                'betNumber': b.betNumber.trim(),
                'amount': b.amount,
                if (_normalizeBetOn(b.betOn) != null) 'betOn': _normalizeBetOn(b.betOn),
              })
          .toList(),
    };
    if (scheduledDate != null && scheduledDate.isNotEmpty) {
      payload['scheduledDate'] = scheduledDate;
    }

    final uri = Uri.parse('$kApiBaseUrl/bets/place');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    http.Response res;
    try {
      res = await http.post(uri, headers: headers, body: jsonEncode(payload));
    } catch (e) {
      return PlaceBetResult(
        success: false,
        message: 'Could not reach server. Check your connection and try again.',
      );
    }

    Map<String, dynamic>? data;
    try {
      data = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return const PlaceBetResult(success: false, message: 'Invalid response from server');
      }
      return PlaceBetResult(
        success: false,
        message: res.statusCode == 404
            ? 'Bet API not found. Check API_BASE_URL in .env'
            : 'Server error (${res.statusCode}). Please try again.',
      );
    }

    if (res.statusCode == 401) {
      await SessionCoordinator.instance.forceLogoutToLogin();
      return const PlaceBetResult(success: false, message: 'Session expired. Please log in again.');
    }
    if (data?['success'] != true) {
      return PlaceBetResult(
        success: false,
        message: data?['message']?.toString() ?? 'Failed to place bet',
      );
    }

    num? newBal;
    List<String>? betIdList;
    final inner = data?['data'];
    if (inner is Map<String, dynamic>) {
      if (inner['newBalance'] != null) {
        newBal = inner['newBalance'] as num?;
      }
      final rawIds = inner['betIds'];
      if (rawIds is List) {
        betIdList = [];
        for (final e in rawIds) {
          final id = _toObjectIdString(e);
          if (id != null && id.isNotEmpty) betIdList.add(id);
        }
        if (betIdList.isEmpty) betIdList = null;
      }
    }
    return PlaceBetResult(
      success: true,
      message: data?['message']?.toString(),
      newBalance: newBal,
      betIds: betIdList,
    );
  }

  /// `GET /bets/my-history` — [frontend/src/api/bets.js] `getMyBetHistory`.
  Future<({bool success, List<Map<String, dynamic>> bets, String? message})>
      fetchMyBetHistory({
    int days = 30,
    int limit = 200,
  }) async {
    final user = await AuthService.instance.getStoredUser();
    final userId = AuthService.storedUserId(user);
    if (userId == null) {
      return (success: false, bets: <Map<String, dynamic>>[], message: 'Please log in');
    }

    final uri = Uri.parse('$kApiBaseUrl/bets/my-history').replace(
      queryParameters: {
        'userId': userId,
        'days': '$days',
        'limit': '$limit',
      },
    );
    final token = AuthService.sessionToken(user);
    final headers = <String, String>{};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    http.Response res;
    try {
      res = await http.get(uri, headers: headers);
    } catch (_) {
      return (
        success: false,
        bets: <Map<String, dynamic>>[],
        message: 'Could not reach server',
      );
    }

    Map<String, dynamic>? data;
    try {
      data = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {
      return (
        success: false,
        bets: <Map<String, dynamic>>[],
        message: 'Invalid response from server',
      );
    }

    if (res.statusCode == 401) {
      await SessionCoordinator.instance.forceLogoutToLogin();
      return (
        success: false,
        bets: <Map<String, dynamic>>[],
        message: 'Session expired. Please log in again.',
      );
    }
    if (data?['success'] != true) {
      return (
        success: false,
        bets: <Map<String, dynamic>>[],
        message: data?['message']?.toString() ?? 'Failed to fetch bet history',
      );
    }
    final list = data?['data'];
    if (list is! List) {
      return (success: true, bets: <Map<String, dynamic>>[], message: null);
    }
    final bets = list
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    return (success: true, bets: bets, message: null);
  }

  /// `POST /bets/cancel` — [frontend/src/api/bets.js] `cancelBet`.
  Future<CancelBetResult> cancelBet({required String betId}) async {
    final user = await AuthService.instance.getStoredUser();
    final userId = _toObjectIdString(
      user?['userId'] ?? user?['id'] ?? user?['_id'],
    );
    if (!_isValidObjectId(userId)) {
      return const CancelBetResult(
        success: false,
        message: 'Please log in to cancel a bet',
      );
    }
    final normalizedBetId = _toObjectIdString(betId);
    if (!_isValidObjectId(normalizedBetId)) {
      return const CancelBetResult(success: false, message: 'Invalid bet ID');
    }

    final uri = Uri.parse('$kApiBaseUrl/bets/cancel');
    final token = AuthService.sessionToken(user);
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    http.Response res;
    try {
      res = await http.post(
        uri,
        headers: headers,
        body: jsonEncode({'userId': userId, 'betId': normalizedBetId}),
      );
    } catch (_) {
      return const CancelBetResult(
        success: false,
        message: 'Could not reach server',
      );
    }

    Map<String, dynamic>? data;
    try {
      data = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {
      return const CancelBetResult(success: false, message: 'Invalid response from server');
    }

    if (res.statusCode == 401) {
      await SessionCoordinator.instance.forceLogoutToLogin();
      return const CancelBetResult(
        success: false,
        message: 'Session expired. Please log in again.',
      );
    }
    if (data?['success'] != true) {
      return CancelBetResult(
        success: false,
        message: data?['message']?.toString() ?? 'Failed to cancel bet',
      );
    }

    num? newBal;
    num? refunded;
    final inner = data?['data'];
    if (inner is Map<String, dynamic>) {
      newBal = inner['newBalance'] as num?;
      refunded = inner['refundedAmount'] as num?;
    }
    return CancelBetResult(
      success: true,
      message: data?['message']?.toString(),
      newBalance: newBal,
      refundedAmount: refunded,
    );
  }

  Future<Map<String, dynamic>?> fetchRatesCurrent() async {
    final uri = Uri.parse('$kApiBaseUrl/rates/current');
    final res = await http.get(uri);
    try {
      final data = jsonDecode(res.body) as Map<String, dynamic>?;
      if (data?['success'] == true) return data;
    } catch (_) {}
    return null;
  }

  /// `GET /bets/public/top-winners` — [frontend/src/pages/TopWinners.jsx].
  Future<TopWinnersResult> fetchPublicTopWinners({String? timeRange}) async {
    final q = (timeRange != null && timeRange.isNotEmpty && timeRange != 'all')
        ? <String, String>{'timeRange': timeRange}
        : null;
    final uri = Uri.parse('$kApiBaseUrl/bets/public/top-winners').replace(queryParameters: q);
    final res = await http.get(uri);
    try {
      final data = jsonDecode(res.body) as Map<String, dynamic>?;
      if (res.statusCode >= 200 &&
          res.statusCode < 300 &&
          data?['success'] == true &&
          data?['data'] is List) {
        final list = (data!['data'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        return TopWinnersResult(success: true, rows: list);
      }
      return TopWinnersResult(
        success: false,
        message: data?['message']?.toString() ?? 'Failed to load top winners',
      );
    } catch (_) {
      return const TopWinnersResult(success: false, message: 'Failed to load top winners');
    }
  }

  /// `GET /bets/my-history` — aligned with frontend notifications/history calls.
  Future<StatementDownloadResult> fetchMyStatement({
    required String startDateYmd,
    required String endDateYmd,
  }) async {
    final user = await AuthService.instance.getStoredUser();
    final token = AuthService.sessionToken(user);
    if (token == null || token.isEmpty) {
      return const StatementDownloadResult(success: false, message: 'Please log in to download statement');
    }
    final userId = (user?['id'] ?? user?['_id'])?.toString().trim();
    final uri = Uri.parse('$kApiBaseUrl/bets/my-history').replace(
      queryParameters: {
        if (userId != null && userId.isNotEmpty) 'userId': userId,
        'startDate': startDateYmd,
        'endDate': endDateYmd,
      },
    );
    final res = await http.get(
      uri,
      headers: {'Authorization': 'Bearer $token'},
    );
    if (res.statusCode == 401) {
      await SessionCoordinator.instance.forceLogoutToLogin();
      return const StatementDownloadResult(success: false, message: 'Session expired. Please log in again.');
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      try {
        final data = jsonDecode(res.body) as Map<String, dynamic>?;
        return StatementDownloadResult(
          success: false,
          message: data?['message']?.toString() ?? 'Failed to download statement',
        );
      } catch (_) {
        return const StatementDownloadResult(success: false, message: 'Failed to download statement');
      }
    }
    return StatementDownloadResult(
      success: true,
      bytes: res.bodyBytes,
      contentType: res.headers['content-type'],
    );
  }
}

class CancelBetResult {
  const CancelBetResult({
    required this.success,
    this.message,
    this.newBalance,
    this.refundedAmount,
  });

  final bool success;
  final String? message;
  final num? newBalance;
  final num? refundedAmount;
}

class TopWinnersResult {
  const TopWinnersResult({
    required this.success,
    this.message,
    this.rows = const [],
  });

  final bool success;
  final String? message;
  final List<Map<String, dynamic>> rows;
}

class StatementDownloadResult {
  const StatementDownloadResult({
    required this.success,
    this.message,
    this.bytes,
    this.contentType,
  });

  final bool success;
  final String? message;
  final Uint8List? bytes;
  final String? contentType;
}

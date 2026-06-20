import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../config/api_config.dart';
import 'auth_service.dart';
import 'session_coordinator.dart';

/// `GET /payments/config`, `POST /payments/deposit`, `POST /payments/withdraw`,
/// `GET /payments/my-deposits`, `GET /payments/my-withdrawals` — React funds pages.
class PaymentsService {
  PaymentsService._();
  static final PaymentsService instance = PaymentsService._();

  Future<Map<String, String>> _authOnly() async {
    final u = await AuthService.instance.getStoredUser();
    final t = u?['token']?.toString();
    if (t == null || t.isEmpty) return {};
    return {'Authorization': 'Bearer $t'};
  }

  Future<String?> _userId() async {
    return AuthService.storedUserId(await AuthService.instance.getStoredUser());
  }

  Future<Map<String, String>> _jsonHeaders() async {
    final h = await _authOnly();
    if (h.isEmpty) return {};
    return {...h, 'Content-Type': 'application/json'};
  }

  Future<({bool success, Map<String, dynamic>? data, String? message})> fetchConfig() async {
    final userId = await _userId();
    final uri = Uri.parse('$kApiBaseUrl/payments/config').replace(
      queryParameters: {
        if (userId != null) 'userId': userId,
      },
    );
    final res = await http.get(uri);
    Map<String, dynamic>? body;
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {}
    if (body?['success'] == true && body?['data'] is Map) {
      return (
        success: true,
        data: Map<String, dynamic>.from(body!['data'] as Map),
        message: null,
      );
    }
    return (
      success: false,
      data: null,
      message: body?['message']?.toString() ?? 'Failed to load payment config',
    );
  }

  /// PayU Hosted Checkout — keys live on the server ([PAYU_KEY], [PAYU_SALT] in backend `.env`).
  Future<
      ({
        bool success,
        String? formActionUrl,
        Map<String, String>? formData,
        String? paymentId,
        double? amount,
        String? message,
      })> createPayULink({
    required double amount,
    bool returnToApp = true,
    String? firstname,
    String? email,
    String? phone,
  }) async {
    final userId = await _userId();
    if (userId == null) {
      return (
        success: false,
        formActionUrl: null,
        formData: null,
        paymentId: null,
        amount: null,
        message: 'Please log in',
      );
    }

    final uri = Uri.parse('$kApiBaseUrl/payments/payu/create-link');
    final res = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'amount': amount,
        'userId': userId,
        if (returnToApp) 'returnTo': 'app',
        if (firstname != null && firstname.isNotEmpty) 'firstname': firstname,
        if (email != null && email.isNotEmpty) 'email': email,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      }),
    );

    Map<String, dynamic>? body;
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {}

    if (res.statusCode == 429) {
      return (
        success: false,
        formActionUrl: null,
        formData: null,
        paymentId: null,
        amount: null,
        message: 'Too many attempts. Please wait a minute and try again.',
      );
    }

    if (body?['success'] == true && body?['data'] is Map) {
      final data = Map<String, dynamic>.from(body!['data'] as Map);
      final formDataRaw = data['formData'];
      final formData = <String, String>{};
      if (formDataRaw is Map) {
        formDataRaw.forEach((k, v) => formData[k.toString()] = v?.toString() ?? '');
      }
      final amt = num.tryParse(data['amount']?.toString() ?? '');
      return (
        success: true,
        formActionUrl: data['formActionUrl']?.toString(),
        formData: formData.isEmpty ? null : formData,
        paymentId: data['paymentId']?.toString(),
        amount: amt?.toDouble(),
        message: null,
      );
    }

    return (
      success: false,
      formActionUrl: null,
      formData: null,
      paymentId: null,
      amount: null,
      message: body?['message']?.toString() ??
          (res.statusCode >= 500
              ? 'Deposit service error. Please try again later.'
              : 'Failed to start PayU payment'),
    );
  }

  /// After PayU redirect — pass callback query params (status, hash, txnid, …).
  Future<
      ({
        bool success,
        double? amount,
        double? balance,
        bool alreadyProcessed,
        String? message,
      })> verifyPayUPayment({
    required String paymentId,
    required String userId,
    Map<String, String> extraParams = const {},
  }) async {
    final qp = <String, String>{
      'paymentId': paymentId,
      'userId': userId,
    };
    for (final e in extraParams.entries) {
      final k = e.key;
      if (k == 'paymentId' || k == 'userId' || k == 'tab' || k == 'return_to') continue;
      qp[k] = e.value;
    }

    final uri = Uri.parse('$kApiBaseUrl/payments/payu/verify').replace(
      queryParameters: qp,
    );
    final res = await http.get(uri);
    Map<String, dynamic>? body;
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {}

    if (body?['success'] == true) {
      final data = body?['data'];
      double? amount;
      double? balance;
      if (data is Map) {
        amount = num.tryParse(data['amount']?.toString() ?? '')?.toDouble();
        balance = num.tryParse(data['balance']?.toString() ?? '')?.toDouble();
      }
      return (
        success: true,
        amount: amount,
        balance: balance,
        alreadyProcessed: body?['alreadyProcessed'] == true,
        message: body?['message']?.toString(),
      );
    }

    return (
      success: false,
      amount: null,
      balance: null,
      alreadyProcessed: false,
      message: body?['message']?.toString() ?? 'Payment could not be verified',
    );
  }

  Future<({bool success, String? message})> submitDeposit({
    required double amount,
    required String upiTransactionId,
    required String screenshotPath,
  }) async {
    final auth = await _authOnly();
    if (auth.isEmpty) return (success: false, message: 'Please log in');

    final uri = Uri.parse('$kApiBaseUrl/payments/deposit');
    final req = http.MultipartRequest('POST', uri);
    req.headers.addAll(auth);
    req.fields['amount'] = amount == amount.roundToDouble() ? amount.toInt().toString() : amount.toString();
    final txId = upiTransactionId.trim();
    req.fields['upiTransactionId'] = txId;
    // Keep both keys for API compatibility across server versions.
    req.fields['transactionId'] = txId;
    req.files.add(
      await http.MultipartFile.fromPath(
        'screenshot',
        screenshotPath,
        contentType: _imageContentTypeForPath(screenshotPath),
      ),
    );

    final streamed = await req.send();
    final res = await http.Response.fromStream(streamed);
    Map<String, dynamic>? body;
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {}
    if (res.statusCode == 401) {
      await SessionCoordinator.instance.forceLogoutToLogin();
      return (success: false, message: 'Session expired.');
    }
    if (body?['success'] == true) {
      return (success: true, message: body?['message']?.toString());
    }
    return (success: false, message: body?['message']?.toString() ?? 'Deposit request failed');
  }

  MediaType _imageContentTypeForPath(String path) {
    final p = path.toLowerCase();
    if (p.endsWith('.png')) return MediaType('image', 'png');
    if (p.endsWith('.webp')) return MediaType('image', 'webp');
    if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return MediaType('image', 'jpeg');
    return MediaType('application', 'octet-stream');
  }

  Future<({bool success, String? message})> submitWithdraw({
    required double amount,
    required String bankDetailId,
    String userNote = '',
  }) async {
    final h = await _jsonHeaders();
    if (h.isEmpty) return (success: false, message: 'Please log in');
    final uri = Uri.parse('$kApiBaseUrl/payments/withdraw');
    final userId = await _userId();
    if (userId == null) return (success: false, message: 'Please log in');
    final res = await http.post(
      uri,
      headers: h,
      body: jsonEncode({
        'userId': userId,
        'amount': amount,
        'bankDetailId': bankDetailId,
        'userNote': userNote,
      }),
    );
    Map<String, dynamic>? body;
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {}
    if (res.statusCode == 401) {
      await SessionCoordinator.instance.forceLogoutToLogin();
      return (success: false, message: 'Session expired.');
    }
    if (body?['success'] == true) {
      return (success: true, message: body?['message']?.toString());
    }
    return (success: false, message: body?['message']?.toString() ?? 'Withdrawal failed');
  }

  Future<({bool success, List<Map<String, dynamic>> data, String? message})> fetchMyDeposits() async {
    final userId = await _userId();
    if (userId == null || userId.isEmpty) {
      return (
        success: false,
        data: <Map<String, dynamic>>[],
        message: 'Please log in to view deposit history',
      );
    }
    final h = await _authOnly();
    final uri = Uri.parse('$kApiBaseUrl/payments/my-deposits').replace(
      queryParameters: {'userId': userId},
    );
    final res = await http.get(uri, headers: h);
    Map<String, dynamic>? body;
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {}
    if (res.statusCode == 401) {
      await SessionCoordinator.instance.forceLogoutToLogin();
      return (success: false, data: <Map<String, dynamic>>[], message: 'Session expired.');
    }
    if (body?['success'] == true) {
      final raw = body?['data'];
      if (raw is List) {
        final list = <Map<String, dynamic>>[
          for (final e in raw)
            if (e is Map<String, dynamic>)
              Map<String, dynamic>.from(e)
            else if (e is Map)
              Map<String, dynamic>.from(e),
        ];
        return (success: true, data: list, message: null);
      }
      if (raw == null) {
        return (success: true, data: <Map<String, dynamic>>[], message: null);
      }
    }
    return (
      success: false,
      data: <Map<String, dynamic>>[],
      message: body?['message']?.toString() ??
          (res.statusCode == 400 ? 'User ID is required' : 'Failed to load deposits'),
    );
  }

  Future<({bool success, List<Map<String, dynamic>> data, String? message})> fetchMyWithdrawals() async {
    final userId = await _userId();
    if (userId == null || userId.isEmpty) {
      return (
        success: false,
        data: <Map<String, dynamic>>[],
        message: 'Please log in to view withdrawal history',
      );
    }
    final h = await _authOnly();
    final uri = Uri.parse('$kApiBaseUrl/payments/my-withdrawals').replace(
      queryParameters: {'userId': userId},
    );
    final res = await http.get(uri, headers: h);
    Map<String, dynamic>? body;
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {}
    if (res.statusCode == 401) {
      await SessionCoordinator.instance.forceLogoutToLogin();
      return (success: false, data: <Map<String, dynamic>>[], message: 'Session expired.');
    }
    if (body?['success'] == true) {
      final raw = body?['data'];
      if (raw is List) {
        final list = <Map<String, dynamic>>[
          for (final e in raw)
            if (e is Map<String, dynamic>)
              Map<String, dynamic>.from(e)
            else if (e is Map)
              Map<String, dynamic>.from(e),
        ];
        return (success: true, data: list, message: null);
      }
      if (raw == null) {
        return (success: true, data: <Map<String, dynamic>>[], message: null);
      }
    }
    return (
      success: false,
      data: <Map<String, dynamic>>[],
      message: body?['message']?.toString() ?? 'Failed to load withdrawals',
    );
  }
}

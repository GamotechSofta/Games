import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/api_config.dart';
import 'auth_service.dart';

/// Telecaller callback request — mirrors web [callSocketService] + [RequestCallButton].
class CallService {
  CallService._();
  static final CallService instance = CallService._();

  io.Socket? _socket;
  int _consumers = 0;
  bool _registered = false;
  String? _registeredUserId;

  final _requestStateCtrl = StreamController<CallRequestState>.broadcast();
  final _errorCtrl = StreamController<String>.broadcast();

  Stream<CallRequestState> get requestStateStream => _requestStateCtrl.stream;
  Stream<String> get errorStream => _errorCtrl.stream;

  CallRequestState _state = CallRequestState.idle;
  String _issue = '';

  CallRequestState get requestState => _state;
  String get requestIssue => _issue;
  bool get connected => _socket?.connected ?? false;

  void acquire() {
    _consumers += 1;
    _ensureConnected();
  }

  void release() {
    _consumers = (_consumers - 1).clamp(0, 999);
    if (_consumers == 0) {
      _socket?.dispose();
      _socket = null;
      _registered = false;
      _registeredUserId = null;
    }
  }

  Future<void> _ensureConnected() async {
    if (_socket != null) return;

    final url = kSocketBaseUrl;
    if (url.isEmpty) return;

    final token = await AuthService.instance.getSessionToken();
    _socket = io.io(
      url,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableReconnection()
          .setReconnectionDelay(2000)
          .setPath('/socket.io')
          .setAuth(token != null && token.isNotEmpty ? {'token': token} : {})
          .build(),
    );

    _socket!
      ..onConnect((_) => unawaited(_registerCurrentUser()))
      ..on('call-request-ack', (_) {
        _setState(CallRequestState.waiting);
      })
      ..on('call-request-error', (data) {
        final msg = _eventMessage(data) ?? 'Failed to request call';
        _errorCtrl.add(msg);
        _setState(CallRequestState.idle, issue: '');
      })
      ..on('call-request-cancelled', (_) {
        _setState(CallRequestState.idle, issue: '');
      });

    _socket!.connect();
  }

  Future<void> _registerCurrentUser() async {
    final user = await AuthService.instance.getStoredUser();
    final userId = AuthService.storedUserId(user);
    if (userId == null || userId.isEmpty || _socket == null) return;
    if (_registered && _registeredUserId == userId) return;

    final name = user?['username']?.toString().trim() ??
        user?['name']?.toString().trim() ??
        '';
    final phone = user?['phone']?.toString().trim() ?? '';

    _socket!.emit('register', {
      'userId': userId,
      'role': 'user',
      'name': name,
      'phone': phone,
    });
    _registered = true;
    _registeredUserId = userId;
  }

  Future<void> requestCall(String issue) async {
    final trimmed = issue.trim().replaceAll(RegExp(r'\s+'), ' ');
    if (trimmed.length < 5) {
      _errorCtrl.add('Please describe your issue (at least 5 characters)');
      return;
    }

    await _ensureConnected();
    final user = await AuthService.instance.getStoredUser();
    final userId = AuthService.storedUserId(user);
    if (userId == null || userId.isEmpty) {
      _errorCtrl.add('Please log in to request a call');
      return;
    }
    if (_socket == null || !(_socket!.connected)) {
      _errorCtrl.add('Connecting to call service… try again in a moment');
      return;
    }

    final name = user?['username']?.toString().trim() ??
        user?['name']?.toString().trim() ??
        '';
    final phone = user?['phone']?.toString().trim() ?? '';

    _setState(CallRequestState.waiting, issue: trimmed);
    _socket!.emit('call-request', {
      'userId': userId,
      'name': name,
      'phone': phone,
      'issue': trimmed,
    });
  }

  Future<void> cancelCallRequest() async {
    final user = await AuthService.instance.getStoredUser();
    final userId = AuthService.storedUserId(user);
    if (userId == null || userId.isEmpty) return;

    _socket?.emit('cancel-call-request', {'userId': userId});

    try {
      await http.post(
        Uri.parse('$kApiBaseUrl/call/cancel-request'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId}),
      );
    } catch (_) {
      // Socket cancel is primary; HTTP keeps telecaller list in sync.
    }

    _setState(CallRequestState.idle, issue: '');
  }

  void _setState(CallRequestState next, {String issue = ''}) {
    _state = next;
    _issue = issue;
    if (!_requestStateCtrl.isClosed) {
      _requestStateCtrl.add(next);
    }
  }

  static String? _eventMessage(dynamic data) {
    if (data is Map) {
      return data['message']?.toString() ?? data['error']?.toString();
    }
    return null;
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
    _requestStateCtrl.close();
    _errorCtrl.close();
  }
}

enum CallRequestState { idle, waiting }

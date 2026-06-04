import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/app_config.dart';

typedef SocketCallback = void Function(dynamic data);

/// Socket.IO signaling for click-to-call (same events as web user).
class CallSocketService {
  io.Socket? _socket;

  bool get isConnected => _socket?.connected ?? false;

  io.Socket connect() {
    if (_socket?.connected == true) return _socket!;

    _socket = io.io(
      AppConfig.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setPath(AppConfig.socketPath)
          .enableReconnection()
          .setReconnectionDelay(1500)
          .build(),
    );
    return _socket!;
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  void registerUser({
    required String userId,
    String name = '',
    String phone = '',
  }) {
    _socket?.emit('register', {
      'userId': userId,
      'role': 'user',
      'name': name,
      'phone': phone,
    });
  }

  void requestCall({
    required String userId,
    required String name,
    required String phone,
  }) {
    _socket?.emit('call-request', {
      'userId': userId,
      'name': name,
      'phone': phone,
    });
  }

  void answerCall({
    required String from,
    required String to,
    required Map<String, dynamic> answer,
  }) {
    _socket?.emit('answer-call', {'from': from, 'to': to, 'answer': answer});
  }

  void rejectCall({required String from, required String to}) {
    _socket?.emit('reject-call', {'from': from, 'to': to});
  }

  void sendIceCandidate({
    required String from,
    required String to,
    required Map<String, dynamic> candidate,
  }) {
    _socket?.emit('ice-candidate', {
      'from': from,
      'to': to,
      'candidate': candidate,
    });
  }

  void endCall({required String from, required String to}) {
    _socket?.emit('end-call', {'from': from, 'to': to});
  }

  void on(String event, SocketCallback handler) {
    _socket?.on(event, handler);
  }

  void off(String event) {
    _socket?.off(event);
  }
}

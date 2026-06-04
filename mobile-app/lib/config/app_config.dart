/// Backend Socket.IO / API base URL (no trailing slash).
class AppConfig {
  /// Override at build: --dart-define=SOCKET_URL=http://10.0.2.2:3010
  static const String socketUrl = String.fromEnvironment(
    'SOCKET_URL',
    defaultValue: 'http://10.0.2.2:3010',
  );

  static const String socketPath = '/socket.io';
}

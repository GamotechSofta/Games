import 'dart:async';
import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/app_config.dart';
import 'native_call_service.dart';

/// Keeps Socket.IO alive in background so incoming calls ring without Firebase.
class BackgroundCallService {
  static Future<void> configure() async {
    final service = FlutterBackgroundService();
    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: 'aakda_call_service',
        initialNotificationTitle: 'Aakda',
        initialNotificationContent: 'Ready to receive calls',
        foregroundServiceNotificationId: 888,
        foregroundServiceTypes: [AndroidForegroundType.microphone],
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
        onBackground: onIosBackground,
      ),
    );
  }

  @pragma('vm:entry-point')
  static Future<bool> onIosBackground(ServiceInstance service) async {
    WidgetsFlutterBinding.ensureInitialized();
    DartPluginRegistrant.ensureInitialized();
    return true;
  }

  @pragma('vm:entry-point')
  static void onStart(ServiceInstance service) async {
    DartPluginRegistrant.ensureInitialized();

    String? userId;
    String? userName;
    String? userPhone;

    if (service is AndroidServiceInstance) {
      service.setForegroundNotificationInfo(
        title: 'Aakda.in',
        content: 'Listening for incoming calls…',
      );
    }

    io.Socket? socket;
    Timer? pollTimer;

    void connectSocket() {
      socket?.dispose();
      socket = io.io(
        AppConfig.socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .setPath(AppConfig.socketPath)
            .enableReconnection()
            .build(),
      );

      socket!.onConnect((_) {
        if (userId != null) {
          socket!.emit('register', {
            'userId': userId,
            'role': 'user',
            'name': userName ?? '',
            'phone': userPhone ?? '',
          });
        }
      });

      socket!.on('incoming-call', (data) async {
        final map = Map<String, dynamic>.from(data as Map);
        final callId = map['callId']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString();
        final callerName = map['callerName']?.toString() ?? 'Aakda.in';
        await NativeCallService.showIncomingCall(
          callId: callId,
          callerName: callerName,
          handle: 'aakda.in',
        );
        service.invoke('incoming-call', map);
      });
    }

    Future<void> pollPending() async {
      if (userId == null) return;
      try {
        final base = AppConfig.socketUrl.replaceAll(RegExp(r'/$'), '');
        final uri = Uri.parse('$base/api/v1/call/pending-user/$userId');
        final res = await http.get(uri).timeout(const Duration(seconds: 8));
        if (res.statusCode != 200) return;
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        final data = json['data'];
        if (data == null) return;
        final callId = data['callId']?.toString() ?? '';
        if (callId.isEmpty) return;
        await NativeCallService.showIncomingCall(
          callId: callId,
          callerName: data['callerName']?.toString() ?? 'Aakda.in',
          handle: 'aakda.in',
        );
        service.invoke('incoming-call', Map<String, dynamic>.from(data as Map));
      } catch (_) {}
    }

    service.on('setUser').listen((event) {
      if (event == null) return;
      userId = event['userId']?.toString();
      userName = event['name']?.toString();
      userPhone = event['phone']?.toString();
      connectSocket();
      pollTimer?.cancel();
      pollTimer = Timer.periodic(const Duration(seconds: 8), (_) => pollPending());
    });

    service.on('stop').listen((_) {
      pollTimer?.cancel();
      socket?.dispose();
      service.stopSelf();
    });
  }

  static Future<void> start({
    required String userId,
    String name = '',
    String phone = '',
  }) async {
    final service = FlutterBackgroundService();
    final running = await service.isRunning();
    if (!running) {
      await service.startService();
    }
    service.invoke('setUser', {
      'userId': userId,
      'name': name,
      'phone': phone,
    });
  }

  static Future<void> stop() async {
    final service = FlutterBackgroundService();
    if (await service.isRunning()) {
      service.invoke('stop');
    }
  }
}

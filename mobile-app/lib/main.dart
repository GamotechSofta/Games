import 'package:flutter/material.dart';
import 'services/background_call_service.dart';
import 'services/native_call_service.dart';
import 'screens/home_screen.dart';
import 'screens/incoming_call_screen.dart';
import 'services/call_socket_service.dart';

final _navKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await BackgroundCallService.configure();
  runApp(const GamesMobileApp());
}

class GamesMobileApp extends StatefulWidget {
  const GamesMobileApp({super.key});

  @override
  State<GamesMobileApp> createState() => _GamesMobileAppState();
}

class _GamesMobileAppState extends State<GamesMobileApp> {
  final _socket = CallSocketService();
  Map<String, dynamic>? _pendingIncoming;

  @override
  void initState() {
    super.initState();
    NativeCallService.listenEvents(
      onAccept: _onCallkitAccept,
      onDecline: _onCallkitDecline,
    );
    _listenBackgroundIncoming();
  }

  void _listenBackgroundIncoming() {
    // When background service receives incoming-call, open in-app screen if possible
    // (CallKit UI already shown natively)
  }

  void _onCallkitAccept(String callId) {
    _openIncomingByCallId(callId);
  }

  void _onCallkitDecline(String callId) {
    NativeCallService.endCall(callId);
  }

  Future<void> _openIncomingByCallId(String callId) async {
    // Pending offer loaded in IncomingCallScreen via API
    final nav = _navKey.currentState;
    if (nav == null) return;
    nav.push(
      MaterialPageRoute(
        builder: (_) => IncomingCallScreen(
          socket: _socket,
          incoming: {'callId': callId, 'from': '', 'callerName': 'Aakda.in'},
          userId: '',
          loadByCallId: true,
        ),
        fullscreenDialog: true,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: _navKey,
      title: 'Aakda — Call Support',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0D9488)),
        useMaterial3: true,
      ),
      home: HomeScreen(
        onStartBackground: BackgroundCallService.start,
        onStopBackground: BackgroundCallService.stop,
      ),
    );
  }
}

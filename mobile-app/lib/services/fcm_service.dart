/// FCM placeholder: wake app for incoming calls when socket is disconnected.
///
/// Production steps:
/// 1. Add firebase_core + firebase_messaging to pubspec.yaml
/// 2. Configure google-services.json / GoogleService-Info.plist
/// 3. On data message type `incoming_call`, call CallSocketService.connectAndRegister()
///    then navigate to IncomingCallScreen
class FcmService {
  static Future<void> init() async {
    // TODO: FirebaseMessaging.onBackgroundMessage(...)
    // TODO: FirebaseMessaging.onMessage.listen((msg) { ... incoming_call ... });
    debugLog('FCM stub initialized — configure Firebase for background calls');
  }

  static void debugLog(String msg) {
    // ignore: avoid_print
    print('[FCM stub] $msg');
  }
}

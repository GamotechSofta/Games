import 'package:flutter_callkit_incoming/entities/entities.dart';
import 'package:flutter_callkit_incoming/flutter_callkit_incoming.dart';

/// Native incoming call UI on lock screen (CallKit / Android full-screen) — no Firebase.
class NativeCallService {
  static Future<void> showIncomingCall({
    required String callId,
    required String callerName,
    required String handle,
  }) async {
    final params = CallKitParams(
      id: callId,
      nameCaller: callerName,
      appName: 'Aakda',
      handle: handle.isNotEmpty ? handle : 'Aakda.in',
      type: 0,
      duration: 45000,
      textAccept: 'Answer',
      textDecline: 'Decline',
      missedCallNotification: const NotificationParams(
        showNotification: true,
        isShowCallback: false,
        subtitle: 'Missed call from Aakda.in',
      ),
      android: const AndroidParams(
        isCustomNotification: true,
        isShowLogo: false,
        ringtonePath: 'system_ringtone_default',
        backgroundColor: '#0D9488',
        actionColor: '#4CAF50',
        textColor: '#FFFFFF',
        incomingCallNotificationChannelName: 'Aakda Incoming Calls',
        isShowFullLockedScreen: true,
        isImportant: true,
      ),
      ios: const IOSParams(
        handleType: 'generic',
        supportsVideo: false,
        maximumCallGroups: 1,
        maximumCallsPerCallGroup: 1,
      ),
    );
    await FlutterCallkitIncoming.showCallkitIncoming(params);
  }

  static Future<void> endCall(String callId) async {
    await FlutterCallkitIncoming.endCall(callId);
  }

  static void listenEvents({
    required void Function(String callId) onAccept,
    required void Function(String callId) onDecline,
  }) {
    FlutterCallkitIncoming.onEvent.listen((event) {
      if (event == null) return;
      final id = event.body?.id?.toString() ?? '';
      if (id.isEmpty) return;
      switch (event.event) {
        case Event.actionCallAccept:
          onAccept(id);
          break;
        case Event.actionCallDecline:
        case Event.actionCallEnded:
          onDecline(id);
          break;
        default:
          break;
      }
    });
  }
}

/// Fallback STUN-only; production uses IceConfigService from backend.
class WebRtcConfig {
  static Map<String, dynamic> get iceServers => {
        'iceServers': [
          {'urls': 'stun:stun.l.google.com:19302'},
          {'urls': 'stun:stun1.l.google.com:19302'},
        ],
      };

  static const Map<String, dynamic> mediaConstraints = {
    'audio': true,
    'video': false,
  };
}

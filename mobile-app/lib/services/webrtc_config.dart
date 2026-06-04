/// WebRTC ICE servers: STUN + TURN placeholder (audio only).
class WebRtcConfig {
  static Map<String, dynamic> get iceServers => {
        'iceServers': [
          {'urls': 'stun:stun.l.google.com:19302'},
          {
            'urls': 'turn:your-turn-server.com:3478',
            'username': 'turnuser',
            'credential': 'turnpassword',
          },
        ],
      };

  static const Map<String, dynamic> mediaConstraints = {
    'audio': true,
    'video': false,
  };
}

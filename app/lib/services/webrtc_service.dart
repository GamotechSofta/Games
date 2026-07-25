import 'dart:async';
import 'dart:convert';

import 'package:flutter_webrtc/flutter_webrtc.dart' as webrtc;
import 'package:http/http.dart' as http;

import '../config/api_config.dart';

const _fallbackIceServers = [
  {'urls': 'stun:stun.l.google.com:19302'},
  {'urls': 'stun:stun1.l.google.com:19302'},
];

class IceConfig {
  const IceConfig({
    required this.iceServers,
    required this.iceTransportPolicy,
  });

  final List<Map<String, dynamic>> iceServers;
  final String iceTransportPolicy;
}

class WebRtcCallSession {
  WebRtcCallSession({
    required this.peerConnection,
    required this.localStream,
    required this.remoteRenderer,
  });

  final webrtc.RTCPeerConnection peerConnection;
  final webrtc.MediaStream localStream;
  final webrtc.RTCVideoRenderer remoteRenderer;
}

IceConfig? _cachedIceConfig;
Future<IceConfig>? _iceConfigLoading;

Future<IceConfig> fetchIceConfig() async {
  if (_cachedIceConfig != null) return _cachedIceConfig!;
  if (_iceConfigLoading != null) return _iceConfigLoading!;

  _iceConfigLoading = () async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/call/ice-config'));
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final data = json['data'] as Map<String, dynamic>?;
      final servers = data?['iceServers'];
      if (json['success'] == true && servers is List && servers.isNotEmpty) {
        final turnConfigured = data?['turnConfigured'] == true;
        _cachedIceConfig = IceConfig(
          iceServers: servers
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList(),
          iceTransportPolicy: data?['iceTransportPolicy']?.toString() ??
              (turnConfigured ? 'relay' : 'all'),
        );
        return _cachedIceConfig!;
      }
    } catch (_) {}

    _cachedIceConfig = const IceConfig(
      iceServers: _fallbackIceServers,
      iceTransportPolicy: 'all',
    );
    return _cachedIceConfig!;
  }();

  final result = await _iceConfigLoading!;
  _iceConfigLoading = null;
  return result;
}

Future<webrtc.RTCPeerConnection> createCallPeerConnection({
  required void Function(webrtc.RTCIceCandidate candidate) onIceCandidate,
  required void Function(webrtc.MediaStream stream) onRemoteStream,
  void Function(webrtc.RTCPeerConnectionState state)? onConnectionState,
}) async {
  final config = await fetchIceConfig();
  final pc = await webrtc.createPeerConnection(
    {
      'iceServers': config.iceServers,
      'iceTransportPolicy': config.iceTransportPolicy,
      'sdpSemantics': 'unified-plan',
    },
    {
      'mandatory': {},
      'optional': [
        {'DtlsSrtpKeyAgreement': true},
      ],
    },
  );

  pc.onIceCandidate = (candidate) {
    onIceCandidate(candidate);
  };

  pc.onTrack = (event) {
    final stream = event.streams.isNotEmpty ? event.streams.first : null;
    if (stream != null) {
      onRemoteStream(stream);
    }
  };

  pc.onConnectionState = (state) {
    onConnectionState?.call(state);
  };

  return pc;
}

Future<webrtc.MediaStream> getLocalAudioStream() {
  return webrtc.navigator.mediaDevices.getUserMedia({
    'audio': true,
    'video': false,
  });
}

Future<webrtc.RTCSessionDescription> createAnswer(
  webrtc.RTCPeerConnection pc,
  Map<String, dynamic> offer,
) async {
  await pc.setRemoteDescription(
    webrtc.RTCSessionDescription(
      offer['sdp']?.toString() ?? '',
      offer['type']?.toString() ?? 'offer',
    ),
  );
  await _flushPendingIceCandidates(pc);

  final answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

final _pendingIce = <webrtc.RTCPeerConnection, List<Map<String, dynamic>>>{};

Future<void> addIceCandidate(
  webrtc.RTCPeerConnection pc,
  Map<String, dynamic> candidate,
) async {
  if (candidate.isEmpty) return;
  final remote = await pc.getRemoteDescription();
  if (remote == null) {
    _pendingIce.putIfAbsent(pc, () => []).add(candidate);
    return;
  }
  try {
    await pc.addCandidate(
      webrtc.RTCIceCandidate(
        candidate['candidate']?.toString(),
        candidate['sdpMid']?.toString(),
        candidate['sdpMLineIndex'] is int
            ? candidate['sdpMLineIndex'] as int
            : int.tryParse('${candidate['sdpMLineIndex']}'),
      ),
    );
  } catch (_) {
    _pendingIce.putIfAbsent(pc, () => []).add(candidate);
  }
}

Future<void> _flushPendingIceCandidates(webrtc.RTCPeerConnection pc) async {
  final queue = _pendingIce.remove(pc);
  if (queue == null) return;
  for (final candidate in queue) {
    await addIceCandidate(pc, candidate);
  }
}

Map<String, dynamic> serializeIceCandidate(webrtc.RTCIceCandidate candidate) {
  return {
    'candidate': candidate.candidate,
    'sdpMid': candidate.sdpMid,
    'sdpMLineIndex': candidate.sdpMLineIndex,
  };
}

Future<void> closeWebRtcSession(WebRtcCallSession? session) async {
  if (session == null) return;
  _pendingIce.remove(session.peerConnection);
  for (final track in session.localStream.getTracks()) {
    await track.stop();
  }
  await session.localStream.dispose();
  session.remoteRenderer.srcObject = null;
  await session.remoteRenderer.dispose();
  await session.peerConnection.close();
}

Future<WebRtcCallSession> startIncomingAnswer({
  required Map<String, dynamic> offer,
  required void Function(webrtc.RTCIceCandidate candidate) onIceCandidate,
  required void Function() onConnected,
  void Function()? onFailed,
}) async {
  final localStream = await getLocalAudioStream();
  final remoteRenderer = webrtc.RTCVideoRenderer();
  await remoteRenderer.initialize();

  final pc = await createCallPeerConnection(
    onIceCandidate: onIceCandidate,
    onRemoteStream: (stream) {
      remoteRenderer.srcObject = stream;
      onConnected();
    },
    onConnectionState: (state) {
      if (state == webrtc.RTCPeerConnectionState.RTCPeerConnectionStateFailed ||
          state == webrtc.RTCPeerConnectionState.RTCPeerConnectionStateClosed) {
        onFailed?.call();
      }
    },
  );

  for (final track in localStream.getTracks()) {
    await pc.addTrack(track, localStream);
  }

  await createAnswer(pc, offer);
  await webrtc.Helper.setSpeakerphoneOn(true);

  return WebRtcCallSession(
    peerConnection: pc,
    localStream: localStream,
    remoteRenderer: remoteRenderer,
  );
}

Future<void> setLocalAudioEnabled(webrtc.MediaStream? stream, bool enabled) async {
  for (final track in stream?.getAudioTracks() ?? const <webrtc.MediaStreamTrack>[]) {
    track.enabled = enabled;
  }
}

Future<void> setSpeakerphoneOn(bool enabled) {
  return webrtc.Helper.setSpeakerphoneOn(enabled);
}

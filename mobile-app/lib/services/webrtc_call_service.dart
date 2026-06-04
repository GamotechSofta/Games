import 'dart:async';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'ice_config_service.dart';
import 'webrtc_config.dart';

/// Inbound WebRTC audio call (user answers telecaller).
class WebRtcCallService {
  RTCPeerConnection? _pc;
  MediaStream? _localStream;
  final _remoteRenderer = RTCVideoRenderer();
  final List<Map<String, dynamic>> _pendingIce = [];
  bool _remoteReady = false;

  RTCVideoRenderer get remoteRenderer => _remoteRenderer;

  Future<void> initRenderer() async {
    await _remoteRenderer.initialize();
  }

  Future<void> disposeRenderer() async {
    await _remoteRenderer.dispose();
  }

  Future<RTCPeerConnection> _createPc({
    required void Function(RTCIceCandidate candidate) onIceCandidate,
    void Function(MediaStream stream)? onRemoteTrack,
  }) async {
    final rtcConfig = await IceConfigService.getRtcConfiguration();
    final config = <String, dynamic>{
      'iceServers': rtcConfig['iceServers'],
      'iceTransportPolicy': rtcConfig['iceTransportPolicy'] ?? 'all',
      'iceCandidatePoolSize': 10,
      'bundlePolicy': 'max-bundle',
    };

    final pc = await createPeerConnection(config);

    pc.onIceCandidate = (c) {
      if (c.candidate != null && c.candidate!.isNotEmpty) {
        onIceCandidate(c);
      }
    };

    pc.onTrack = (event) {
      if (event.streams.isNotEmpty) {
        _remoteRenderer.srcObject = event.streams[0];
        onRemoteTrack?.call(event.streams[0]);
      }
    };

    return pc;
  }

  Future<void> _flushPendingIce() async {
    if (_pc == null) return;
    final pending = List<Map<String, dynamic>>.from(_pendingIce);
    _pendingIce.clear();
    for (final candidate in pending) {
      await addIceCandidate(candidate);
    }
  }

  Future<void> _waitForIceGathering(RTCPeerConnection pc) async {
    if (pc.iceGatheringState ==
        RTCIceGatheringState.RTCIceGatheringStateComplete) {
      return;
    }
    final completer = Completer<void>();
    void listener(RTCIceGatheringState state) {
      if (state == RTCIceGatheringState.RTCIceGatheringStateComplete &&
          !completer.isCompleted) {
        completer.complete();
      }
    }

    pc.onIceGatheringState = (state) => listener(state);
    Future.delayed(const Duration(seconds: 10), () {
      if (!completer.isCompleted) completer.complete();
    });
    await completer.future;
  }

  /// Accept telecaller offer and return SDP answer map for signaling.
  Future<Map<String, dynamic>> acceptOffer(Map<String, dynamic> offer) async {
    await _cleanup();

    _pc = await _createPc(
      onIceCandidate: (_) {},
      onRemoteTrack: (_) {},
    );

    _localStream = await navigator.mediaDevices.getUserMedia(
      WebRtcConfig.mediaConstraints,
    );
    for (final track in _localStream!.getAudioTracks()) {
      await _pc!.addTrack(track, _localStream!);
    }

    await _pc!.setRemoteDescription(
      RTCSessionDescription(offer['sdp'] as String, offer['type'] as String),
    );
    _remoteReady = true;
    await _flushPendingIce();

    final answer = await _pc!.createAnswer();
    await _pc!.setLocalDescription(answer);
    await _waitForIceGathering(_pc!);

    final local = await _pc!.getLocalDescription();
    return {
      'type': local?.type ?? answer.type,
      'sdp': local?.sdp ?? answer.sdp,
    };
  }

  Future<void> addIceCandidate(Map<String, dynamic> candidate) async {
    if (_pc == null || !_remoteReady) {
      _pendingIce.add(candidate);
      return;
    }
    await _pc!.addCandidate(
      RTCIceCandidate(
        candidate['candidate'] as String?,
        candidate['sdpMid'] as String?,
        candidate['sdpMLineIndex'] as int?,
      ),
    );
  }

  void bindIceHandler(void Function(RTCIceCandidate) onIce) {
    if (_pc == null) return;
    _pc!.onIceCandidate = (c) {
      if (c.candidate != null && c.candidate!.isNotEmpty) onIce(c);
    };
  }

  Future<void> _cleanup() async {
    _remoteReady = false;
    _pendingIce.clear();
    _localStream?.getTracks().forEach((t) => t.stop());
    _localStream?.dispose();
    _localStream = null;
    await _pc?.close();
    _pc = null;
    _remoteRenderer.srcObject = null;
  }

  Future<void> hangUp() => _cleanup();
}

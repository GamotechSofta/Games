import 'package:flutter/material.dart';
import '../services/call_socket_service.dart';
import '../services/webrtc_call_service.dart';

/// Incoming call UI — Accept / Reject + WebRTC audio.
class IncomingCallScreen extends StatefulWidget {
  const IncomingCallScreen({
    super.key,
    required this.socket,
    required this.incoming,
    required this.userId,
  });

  final CallSocketService socket;
  final Map<String, dynamic> incoming;
  final String userId;

  @override
  State<IncomingCallScreen> createState() => _IncomingCallScreenState();
}

class _IncomingCallScreenState extends State<IncomingCallScreen> {
  final _webrtc = WebRtcCallService();
  String _phase = 'ringing'; // ringing | in-call | ended
  String? _telecallerId;

  @override
  void initState() {
    super.initState();
    _telecallerId = widget.incoming['from']?.toString();
    _webrtc.initRenderer();

    widget.socket.on('ice-candidate', (data) async {
      final map = Map<String, dynamic>.from(data as Map);
      if (map['from']?.toString() != _telecallerId) return;
      final cand = map['candidate'];
      if (cand is Map) {
        await _webrtc.addIceCandidate(Map<String, dynamic>.from(cand));
      }
    });

    widget.socket.on('call-ended', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      if (map['from']?.toString() == _telecallerId) {
        _hangUpLocal();
      }
    });
  }

  Future<void> _accept() async {
    final offer = widget.incoming['offer'];
    if (offer == null || _telecallerId == null) return;

    setState(() => _phase = 'connecting');

    try {
      final offerMap = Map<String, dynamic>.from(offer as Map);
      final answer = await _webrtc.acceptOffer(offerMap);

      _webrtc.bindIceHandler((candidate) {
        widget.socket.sendIceCandidate(
          from: widget.userId,
          to: _telecallerId!,
          candidate: candidate.toMap(),
        );
      });

      widget.socket.answerCall(
        from: widget.userId,
        to: _telecallerId!,
        answer: answer,
      );

      setState(() => _phase = 'in-call');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Call failed: $e')),
        );
        Navigator.pop(context);
      }
    }
  }

  void _reject() {
    if (_telecallerId != null) {
      widget.socket.rejectCall(from: widget.userId, to: _telecallerId!);
    }
    Navigator.pop(context);
  }

  Future<void> _hangUpLocal() async {
    if (_telecallerId != null) {
      widget.socket.endCall(from: widget.userId, to: _telecallerId!);
    }
    await _webrtc.hangUp();
    if (mounted) Navigator.pop(context);
  }

  @override
  void dispose() {
    _webrtc.hangUp();
    _webrtc.disposeRenderer();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final callerName =
        widget.incoming['callerName']?.toString() ?? 'Telecaller';

    return Scaffold(
      backgroundColor: Colors.black87,
      body: SafeArea(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.support_agent, size: 80, color: Colors.tealAccent),
            const SizedBox(height: 24),
            Text(
              _phase == 'in-call' ? 'On call' : 'Incoming call',
              style: const TextStyle(color: Colors.white70, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              callerName,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Spacer(),
            if (_phase == 'ringing' || _phase == 'connecting')
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Row(
                  children: [
                    Expanded(
                      child: FilledButton(
                        onPressed: _reject,
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.red,
                          minimumSize: const Size.fromHeight(56),
                        ),
                        child: const Text('Reject'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: FilledButton(
                        onPressed:
                            _phase == 'connecting' ? null : _accept,
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.green,
                          minimumSize: const Size.fromHeight(56),
                        ),
                        child: Text(
                          _phase == 'connecting' ? 'Connecting…' : 'Accept',
                        ),
                      ),
                    ),
                  ],
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.all(32),
                child: FilledButton(
                  onPressed: _hangUpLocal,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.red,
                    minimumSize: const Size.fromHeight(56),
                  ),
                  child: const Text('End call'),
                ),
              ),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }
}

import 'dart:async';

import 'package:flutter/material.dart';

import '../services/call_service.dart';
import '../theme/app_colors.dart';

/// Full-screen incoming / active call UI — mirrors web [CallSessionOverlay.jsx].
class CallSessionOverlay extends StatefulWidget {
  const CallSessionOverlay({super.key});

  @override
  State<CallSessionOverlay> createState() => _CallSessionOverlayState();
}

class _CallSessionOverlayState extends State<CallSessionOverlay> {
  CallStatus _status = CallStatus.idle;
  ActiveCallSession? _session;
  int _durationSec = 0;
  bool _isMuted = false;
  bool _speakerOn = true;
  bool _endedVisible = false;

  StreamSubscription<CallStatus>? _statusSub;
  StreamSubscription<ActiveCallSession?>? _sessionSub;
  StreamSubscription<int>? _durationSub;
  StreamSubscription<bool>? _muteSub;
  StreamSubscription<bool>? _speakerSub;

  @override
  void initState() {
    super.initState();
    final svc = CallService.instance;
    _status = svc.callStatus;
    _session = svc.activeSession;
    _durationSec = svc.callDurationSec;
    _isMuted = svc.isMuted;
    _speakerOn = svc.speakerOn;

    _statusSub = svc.callStatusStream.listen((s) {
      setState(() => _status = s);
      if (s == CallStatus.ended || s == CallStatus.rejected) {
        setState(() => _endedVisible = true);
        Future<void>.delayed(const Duration(milliseconds: 1800), () {
          if (mounted) setState(() => _endedVisible = false);
        });
      } else {
        setState(() => _endedVisible = false);
      }
    });
    _sessionSub = svc.activeSessionStream.listen((s) {
      setState(() => _session = s);
    });
    _durationSub = svc.callDurationStream.listen((d) {
      setState(() => _durationSec = d);
    });
    _muteSub = svc.isMutedStream.listen((v) {
      setState(() => _isMuted = v);
    });
    _speakerSub = svc.speakerOnStream.listen((v) {
      setState(() => _speakerOn = v);
    });
  }

  @override
  void dispose() {
    _statusSub?.cancel();
    _sessionSub?.cancel();
    _durationSub?.cancel();
    _muteSub?.cancel();
    _speakerSub?.cancel();
    super.dispose();
  }

  bool get _showOverlay {
    if (_session == null) return false;
    return CallService.instance.isCallOverlayOpen || _endedVisible;
  }

  String _formatDuration(int totalSec) {
    final m = totalSec ~/ 60;
    final s = totalSec % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return (parts.first.isNotEmpty ? parts.first[0] : 'A').toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    if (!_showOverlay || _session == null) {
      return const SizedBox.shrink();
    }

    final session = _session!;
    final isRinging = _status == CallStatus.ringing;
    final isConnecting = _status == CallStatus.connecting;
    final isLive = _status == CallStatus.inCall;
    final isDone = _status == CallStatus.ended ||
        _status == CallStatus.rejected ||
        _endedVisible;

    final statusLabel = isRinging
        ? 'Incoming call'
        : isConnecting
            ? 'Connecting'
            : isLive
                ? 'On call'
                : _status == CallStatus.rejected
                    ? 'Declined'
                    : 'Call ended';

    return Material(
      color: Colors.transparent,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Container(color: const Color(0xFF06080F)),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: const Alignment(0, -0.8),
                radius: 1.2,
                colors: [
                  AppColors.accentEmerald.withValues(alpha: 0.18),
                  Colors.transparent,
                ],
              ),
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                const SizedBox(height: 8),
                Text(
                  statusLabel.toUpperCase(),
                  style: TextStyle(
                    color: AppColors.accentEmerald.withValues(alpha: 0.9),
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 2.8,
                  ),
                ),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _CallerAvatar(
                        initials: _initials(session.callerName),
                        pulsing: isRinging || isConnecting,
                      ),
                      const SizedBox(height: 24),
                      Text(
                        session.callerName,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Aakda Support · Audio only',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.5),
                          fontSize: 14,
                        ),
                      ),
                      if (isRinging) ...[
                        const SizedBox(height: 16),
                        Text(
                          'Support team is calling you now',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.7),
                            fontSize: 14,
                          ),
                        ),
                      ],
                      if (isConnecting) ...[
                        const SizedBox(height: 20),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppColors.accentEmerald,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Connecting secure voice…',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.8),
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (isLive) ...[
                        const SizedBox(height: 20),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.accentEmerald.withValues(alpha: 0.15),
                            border: Border.all(
                              color: AppColors.accentEmerald.withValues(alpha: 0.35),
                            ),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            _formatDuration(_durationSec),
                            style: const TextStyle(
                              color: Color(0xFFD1FAE5),
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                        ),
                      ],
                      if (isDone) ...[
                        const SizedBox(height: 16),
                        Text(
                          'Returning to the app…',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.55),
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (!isDone)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 24,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(32),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.1),
                        ),
                      ),
                      child: isRinging
                          ? Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                _CallControl(
                                  label: 'Decline',
                                  color: AppColors.accentRose,
                                  icon: Icons.call_end,
                                  large: true,
                                  onTap: () {
                                    unawaited(CallService.instance.rejectIncoming());
                                  },
                                ),
                                _CallControl(
                                  label: 'Accept',
                                  color: AppColors.accentEmerald,
                                  icon: Icons.call,
                                  large: true,
                                  onTap: () {
                                    unawaited(CallService.instance.acceptIncoming());
                                  },
                                ),
                              ],
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                _CallControl(
                                  label: _isMuted ? 'Unmute' : 'Mute',
                                  color: _isMuted
                                      ? Colors.amber
                                      : Colors.white.withValues(alpha: 0.12),
                                  icon: Icons.mic,
                                  onTap: () {
                                    unawaited(CallService.instance.toggleMute());
                                  },
                                ),
                                _CallControl(
                                  label: 'End call',
                                  color: AppColors.accentRose,
                                  icon: Icons.call_end,
                                  large: true,
                                  onTap: () {
                                    unawaited(CallService.instance.endCall());
                                  },
                                ),
                                _CallControl(
                                  label: _speakerOn ? 'Speaker' : 'Muted',
                                  color: !_speakerOn
                                      ? Colors.amber
                                      : Colors.white.withValues(alpha: 0.12),
                                  icon: _speakerOn
                                      ? Icons.volume_up
                                      : Icons.volume_off,
                                  onTap: () {
                                    unawaited(CallService.instance.toggleSpeaker());
                                  },
                                ),
                              ],
                            ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CallerAvatar extends StatelessWidget {
  const _CallerAvatar({required this.initials, required this.pulsing});

  final String initials;
  final bool pulsing;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 144,
      height: 144,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (pulsing)
            Container(
              width: 144,
              height: 144,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.accentEmerald.withValues(alpha: 0.25),
                ),
              ),
            ),
          Container(
            width: 120,
            height: 120,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1E3A5F), Color(0xFF0F766E), Color(0xFF065F46)],
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.accentEmerald.withValues(alpha: 0.35),
                  blurRadius: 30,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: Text(
              initials,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 36,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CallControl extends StatelessWidget {
  const _CallControl({
    required this.label,
    required this.color,
    required this.icon,
    required this.onTap,
    this.large = false,
  });

  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final size = large ? 72.0 : 56.0;
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.white, size: large ? 32 : 24),
          ),
          const SizedBox(height: 10),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.75),
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

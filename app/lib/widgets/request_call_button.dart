import 'dart:async';

import 'package:flutter/material.dart';

import '../services/call_service.dart';
import '../theme/casino_ui.dart';

/// Support-page callback request — mirrors web [RequestCallButton.jsx].
class RequestCallButton extends StatefulWidget {
  const RequestCallButton({super.key});

  @override
  State<RequestCallButton> createState() => _RequestCallButtonState();
}

class _RequestCallButtonState extends State<RequestCallButton> {
  static const _maxIssueLen = 500;

  final _issueCtrl = TextEditingController();
  String? _localError;
  StreamSubscription<CallRequestState>? _stateSub;
  StreamSubscription<String>? _errorSub;

  CallRequestState _requestState = CallRequestState.idle;
  String _requestIssue = '';
  bool _connected = false;

  @override
  void initState() {
    super.initState();
    CallService.instance.acquire();
    _requestState = CallService.instance.requestState;
    _requestIssue = CallService.instance.requestIssue;
    _connected = CallService.instance.connected;
    _stateSub = CallService.instance.requestStateStream.listen((s) {
      if (!mounted) return;
      setState(() {
        _requestState = s;
        _requestIssue = CallService.instance.requestIssue;
      });
    });
    _errorSub = CallService.instance.errorStream.listen((msg) {
      if (!mounted || msg.isEmpty) return;
      setState(() => _localError = msg);
    });
    _pollConnection();
  }

  Future<void> _pollConnection() async {
    for (var i = 0; i < 20; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 500));
      if (!mounted) return;
      final c = CallService.instance.connected;
      if (c != _connected) setState(() => _connected = c);
      if (c) return;
    }
  }

  @override
  void dispose() {
    _stateSub?.cancel();
    _errorSub?.cancel();
    _issueCtrl.dispose();
    CallService.instance.release();
    super.dispose();
  }

  Future<void> _submit() async {
    final trimmed = _issueCtrl.text.trim();
    if (trimmed.length < 5 || !_connected) return;
    setState(() => _localError = null);
    _issueCtrl.clear();
    await CallService.instance.requestCall(trimmed);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_requestState == CallRequestState.waiting) {
      return _waitingCard(context, isDark);
    }

    final trimmedLen = _issueCtrl.text.trim().length;
    final canRequest = _connected && trimmedLen >= 5;
    final displayError = _localError;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Describe your issue',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _issueCtrl,
          maxLines: 3,
          maxLength: _maxIssueLen,
          onChanged: (_) {
            if (_localError != null) setState(() => _localError = null);
            setState(() {});
          },
          style: TextStyle(
            fontSize: 14,
            color: CasinoUi.supportText(context),
          ),
          decoration: InputDecoration(
            hintText: 'e.g. Withdrawal pending, game not loading, need help with deposit…',
            counterText: '${_issueCtrl.text.length}/$_maxIssueLen',
            filled: true,
            fillColor: isDark
                ? const Color(0xFF1A1A1C)
                : Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.15)
                    : Colors.grey.shade200,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF14B8A6), width: 2),
            ),
          ),
        ),
        if (displayError != null && displayError.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            displayError,
            style: const TextStyle(fontSize: 12, color: Colors.red),
          ),
        ],
        const SizedBox(height: 12),
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0D9488), Color(0xFF059669)],
            ),
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0D9488).withValues(alpha: 0.25),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: canRequest ? _submit : null,
              borderRadius: BorderRadius.circular(12),
              child: Opacity(
                opacity: canRequest ? 1 : 0.5,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.phone_outlined, color: Colors.white, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Request a Call',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        if (!_connected) ...[
          const SizedBox(height: 8),
          Text(
            'Connecting to call service…',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              color: CasinoUi.supportMuted(context, 0.75),
            ),
          ),
        ],
      ],
    );
  }

  Widget _waitingCard(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF14B8A6).withValues(alpha: 0.1),
            const Color(0xFF10B981).withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF14B8A6).withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFF0D9488).withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.phone_outlined, color: Color(0xFF0D9488)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Request sent',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: CasinoUi.supportText(context),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'A telecaller will call you shortly.',
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.4,
                        color: CasinoUi.supportMuted(context, 0.9),
                      ),
                    ),
                    if (_requestIssue.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isDark
                              ? Colors.black.withValues(alpha: 0.25)
                              : Colors.white.withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text.rich(
                          TextSpan(
                            style: TextStyle(
                              fontSize: 12,
                              height: 1.4,
                              color: CasinoUi.supportText(context),
                            ),
                            children: [
                              TextSpan(
                                text: 'Your issue: ',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: CasinoUi.supportText(context),
                                ),
                              ),
                              TextSpan(text: _requestIssue),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => CallService.instance.cancelCallRequest(),
            icon: const Icon(Icons.close, size: 18),
            label: const Text('Cancel request'),
            style: OutlinedButton.styleFrom(
              foregroundColor: CasinoUi.supportText(context),
              side: BorderSide(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.15)
                    : Colors.grey.shade200,
              ),
              backgroundColor: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

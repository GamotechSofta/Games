import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/auth_service.dart';
import '../services/session_coordinator.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import 'auth_widgets.dart';

const _resendCooldownSec = 30;
final _phoneRegex = RegExp(r'^[6-9]\d{9}$');

/// Reusable login / sign-up form mirroring web [AuthForm.jsx].
class AuthForm extends StatefulWidget {
  const AuthForm({
    super.key,
    this.initialPasswordLogin = false,
    this.initialIsLogin = true,
    this.referredBy,
    required this.mobileStyle,
    this.onLoginTabTap,
    this.onSignupTabTap,
  });

  final bool initialPasswordLogin;
  final bool initialIsLogin;
  final String? referredBy;
  final bool mobileStyle;
  final VoidCallback? onLoginTabTap;
  final VoidCallback? onSignupTabTap;

  @override
  State<AuthForm> createState() => _AuthFormState();
}

class _AuthFormState extends State<AuthForm> {
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _otp = TextEditingController();

  late bool _isPasswordLogin;
  late bool _isLogin;
  String _step = 'phone';

  bool _showPassword = false;
  bool _showConfirmPassword = false;
  bool _isAbove18 = false;
  String? _error;
  bool _loading = false;
  int _resendTimer = 0;
  Timer? _resendCountdown;

  String? _deviceLimitMessage;
  List<Map<String, dynamic>> _deviceLimitDevices = const [];
  String? _deviceActionLoadingId;

  @override
  void initState() {
    super.initState();
    _isPasswordLogin = widget.initialPasswordLogin;
    _isLogin = widget.initialIsLogin;
  }

  @override
  void dispose() {
    _resendCountdown?.cancel();
    _phone.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    _firstName.dispose();
    _lastName.dispose();
    _otp.dispose();
    super.dispose();
  }

  void _startResendCooldown() {
    _resendCountdown?.cancel();
    setState(() => _resendTimer = _resendCooldownSec);
    _resendCountdown = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        _resendTimer = (_resendTimer - 1).clamp(0, _resendCooldownSec);
        if (_resendTimer <= 0) t.cancel();
      });
    });
  }

  void _resetOtpStep() {
    setState(() {
      _step = 'phone';
      _otp.clear();
      _resendTimer = 0;
    });
    _resendCountdown?.cancel();
  }

  void _switchTab(bool loginMode) {
    setState(() {
      _isLogin = loginMode;
      _error = null;
    });
    _resetOtpStep();
  }

  Future<void> _persistSessionAndGoHome(Map<String, dynamic> userFromResponse) async {
    final previous = await AuthService.instance.getStoredUser();
    String? previousCreatedAt;
    if (previous != null) {
      previousCreatedAt = previous['createdAt']?.toString() ??
          previous['created_at']?.toString() ??
          previous['createdOn']?.toString();
    }
    final merged = Map<String, dynamic>.from(userFromResponse);
    merged['createdAt'] = merged['createdAt'] ??
        merged['created_at'] ??
        merged['createdOn'] ??
        previousCreatedAt;

    final token = AuthService.sessionToken(merged);
    if (token != null) {
      try {
        final profile = await AuthService.instance.fetchMyProfile(token: token);
        if (profile.ok && profile.user != null) {
          merged.addAll(profile.user!);
          if (AuthService.sessionToken(profile.user) == null) {
            merged['token'] = token;
          }
        }
      } catch (_) {
        // Profile refresh is best-effort after login.
      }
    }

    await AuthService.instance.saveUser(merged);
    SessionCoordinator.instance.startHeartbeatIfLoggedIn();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/', (_) => false);
  }

  Future<void> _handleAuthSuccess(Map<String, dynamic>? user) async {
    final token = AuthService.sessionToken(user);
    if (user != null && token != null) {
      await _persistSessionAndGoHome(user);
      return;
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          user != null ? 'Account created. Please sign in.' : 'Invalid response from server.',
        ),
      ),
    );
    _switchTab(true);
    setState(() => _isPasswordLogin = true);
  }

  Future<void> _sendOtp() async {
    setState(() {
      _error = null;
      _deviceLimitMessage = null;
      _deviceLimitDevices = const [];
    });

    if (!_isAbove18) {
      setState(() => _error = 'Please confirm 18+');
      return;
    }
    if (!_phoneRegex.hasMatch(_phone.text.trim())) {
      setState(() => _error = 'Please enter valid phone number');
      return;
    }
    if (!_isLogin &&
        (_firstName.text.trim().isEmpty || _lastName.text.trim().isEmpty)) {
      setState(() => _error = 'First name and last name are required');
      return;
    }

    setState(() => _loading = true);
    try {
      final result = await AuthService.instance.sendOtp(
        phone: _phone.text.trim(),
        purpose: _isLogin ? 'login' : 'signup',
      );
      if (!mounted) return;
      if (!result.ok) {
        setState(() => _error = result.message);
        return;
      }
      setState(() => _step = 'otp');
      _startResendCooldown();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message.isNotEmpty ? result.message : 'OTP sent to your phone'),
        ),
      );
    } catch (_) {
      if (mounted) setState(() => _error = 'Network error. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _error = null;
      _deviceLimitMessage = null;
      _deviceLimitDevices = const [];
    });

    final otp = _otp.text.trim();
    if (otp.length < 4) {
      setState(() => _error = 'Please enter the OTP');
      return;
    }

    setState(() => _loading = true);
    try {
      final result = await AuthService.instance.verifyOtp(
        phone: _phone.text.trim(),
        otp: otp,
        purpose: _isLogin ? 'login' : 'signup',
        firstName: _isLogin ? null : _firstName.text.trim(),
        lastName: _isLogin ? null : _lastName.text.trim(),
        referredBy: widget.referredBy,
      );
      if (!mounted) return;

      if (result.ok && result.user != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result.message.isNotEmpty ? result.message : 'Authentication successful',
            ),
          ),
        );
        await _persistSessionAndGoHome(result.user!);
      } else if (result.code?.toUpperCase() == 'DEVICE_LIMIT_REACHED') {
        setState(() {
          _deviceLimitMessage = result.message.isNotEmpty
              ? result.message
              : 'Login pending, device limit reached';
          _deviceLimitDevices = result.activeDevices ?? const [];
        });
      } else {
        setState(() => _error = result.message);
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Network error. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resendOtp() async {
    if (_resendTimer > 0 || _loading) return;
    setState(() => _error = null);
    setState(() => _loading = true);
    try {
      final result = await AuthService.instance.resendOtp(phone: _phone.text.trim());
      if (!mounted) return;
      if (!result.ok) {
        setState(() => _error = result.message);
        return;
      }
      _startResendCooldown();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.message.isNotEmpty ? result.message : 'OTP resent')),
      );
    } catch (_) {
      if (mounted) setState(() => _error = 'Network error. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitPassword() async {
    setState(() {
      _error = null;
      _deviceLimitMessage = null;
      _deviceLimitDevices = const [];
    });

    if (!_isAbove18) {
      setState(() => _error = 'Please confirm 18+');
      return;
    }
    if (!_phoneRegex.hasMatch(_phone.text.trim())) {
      setState(() => _error = 'Please enter valid phone number');
      return;
    }

    if (_isLogin) {
      if (_password.text.isEmpty) {
        setState(() => _error = 'Password is required');
        return;
      }
    } else {
      if (_firstName.text.trim().isEmpty ||
          _lastName.text.trim().isEmpty ||
          _password.text.isEmpty ||
          _confirmPassword.text.isEmpty) {
        setState(() => _error = 'All fields are required');
        return;
      }
      if (_password.text != _confirmPassword.text) {
        setState(() => _error = 'Passwords do not match');
        return;
      }
    }

    setState(() => _loading = true);
    try {
      final AuthResult result;
      if (_isLogin) {
        result = await AuthService.instance.login(
          phone: _phone.text.trim(),
          password: _password.text,
        );
      } else {
        result = await AuthService.instance.register(
          firstName: _firstName.text.trim(),
          lastName: _lastName.text.trim(),
          phone: _phone.text.trim(),
          password: _password.text,
          referredBy: widget.referredBy,
        );
      }

      if (!mounted) return;

      if (result.ok && result.user != null && _isLogin) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result.message.isNotEmpty ? result.message : 'Authentication successful',
            ),
          ),
        );
        await _persistSessionAndGoHome(result.user!);
      } else if (result.ok && !_isLogin) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result.message.isNotEmpty ? result.message : 'Authentication successful',
            ),
          ),
        );
        await _handleAuthSuccess(result.user);
      } else if (result.code?.toUpperCase() == 'DEVICE_LIMIT_REACHED') {
        setState(() {
          _deviceLimitMessage =
              result.message.isNotEmpty ? result.message : 'Login pending, device limit reached';
          _deviceLimitDevices = result.activeDevices ?? const [];
        });
      } else {
        setState(() => _error = result.message);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Network error. Please check if the server is running.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logoutRemoteDevice(String remoteDeviceId) async {
    if (remoteDeviceId.isEmpty || _loading || _deviceActionLoadingId != null) return;
    setState(() {
      _error = null;
      _deviceActionLoadingId = remoteDeviceId;
    });
    try {
      final res = await AuthService.instance.logoutDevice(
        phone: _phone.text.trim(),
        password: _password.text,
        deviceId: remoteDeviceId,
      );
      if (!mounted) return;
      if (!res.ok) {
        setState(() => _error = res.message.isNotEmpty ? res.message : 'Failed to log out device');
        return;
      }
      setState(() {
        _deviceLimitMessage = null;
        _deviceLimitDevices = const [];
      });
      await _submitPassword();
    } catch (_) {
      if (mounted) setState(() => _error = 'Network error. Please try again.');
    } finally {
      if (mounted) setState(() => _deviceActionLoadingId = null);
    }
  }

  String _formatLastSeen(Object? iso) {
    if (iso == null || iso.toString().trim().isEmpty) return 'Last used: recently';
    final ts = DateTime.tryParse(iso.toString())?.millisecondsSinceEpoch;
    if (ts == null) return 'Last used: recently';
    final diff = DateTime.now().millisecondsSinceEpoch - ts;
    final mins = diff ~/ 60000;
    if (mins < 1) return 'Last used: just now';
    if (mins < 60) return 'Last used: $mins min ago';
    final hrs = mins ~/ 60;
    if (hrs < 24) return 'Last used: $hrs hour${hrs > 1 ? 's' : ''} ago';
    final days = hrs ~/ 24;
    return 'Last used: $days day${days > 1 ? 's' : ''} ago';
  }

  InputDecoration _inputDecoration({
    required String label,
    required String hint,
    IconData? prefixIcon,
    Widget? suffix,
    TextAlign textAlign = TextAlign.start,
  }) {
    final mobile = widget.mobileStyle;
    return InputDecoration(
      labelText: label.isEmpty ? null : label,
      hintText: hint,
      counterText: '',
      isDense: true,
      alignLabelWithHint: textAlign == TextAlign.center,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.inputPaddingH,
        vertical: AppSpacing.inputPaddingV,
      ),
      prefixIcon: prefixIcon != null
          ? Icon(prefixIcon, color: mobile ? Colors.grey.shade400 : Colors.grey.shade600, size: 20)
          : null,
      suffixIcon: suffix,
      filled: true,
      fillColor: mobile
          ? Colors.grey.shade900.withValues(alpha: 0.45)
          : Colors.white.withValues(alpha: 0.95),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(mobile ? 12 : 10)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(mobile ? 12 : 10),
        borderSide: BorderSide(
          color: mobile
              ? Colors.grey.shade700.withValues(alpha: 0.6)
              : Colors.grey.shade300,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(mobile ? 12 : 10),
        borderSide: const BorderSide(color: Color(0xFFEAB308), width: 2),
      ),
      labelStyle: mobile ? TextStyle(color: Colors.grey.shade300) : null,
      hintStyle: TextStyle(color: mobile ? Colors.grey.shade500 : Colors.grey.shade500),
    );
  }

  Widget _primaryButton({required String label, required VoidCallback? onPressed}) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFEAB308), Color(0xFFD97706)]),
        borderRadius: BorderRadius.circular(12),
      ),
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.black,
          shadowColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(
            vertical: AppSpacing.buttonPaddingV,
            horizontal: AppSpacing.buttonPaddingH,
          ),
          minimumSize: const Size(0, AppSpacing.buttonMinHeight),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          visualDensity: VisualDensity.compact,
          disabledBackgroundColor: Colors.grey.shade400.withValues(alpha: 0.35),
          disabledForegroundColor: Colors.grey.shade600,
        ),
        child: _loading
            ? const SizedBox(
                height: 22,
                width: 22,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
              )
            : Text(label),
      ),
    );
  }

  Widget _linkButton({required String label, required VoidCallback onTap}) {
    return TextButton(
      onPressed: onTap,
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          color: widget.mobileStyle ? Colors.grey.shade400 : Colors.grey.shade600,
          decoration: TextDecoration.underline,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mobile = widget.mobileStyle;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _AuthTabBar(
          isLogin: _isLogin,
          mobileStyle: mobile,
          onLoginTap: () {
            if (!_isLogin) {
              widget.onLoginTabTap?.call();
              _switchTab(true);
            }
          },
          onSignupTap: () {
            if (_isLogin) {
              widget.onSignupTabTap?.call();
              _switchTab(false);
            }
          },
        ),
        const SizedBox(height: 12),
        if (_error != null) AuthErrorBanner(message: _error!, mobileStyle: mobile),
        if (_isPasswordLogin)
          _buildPasswordForm()
        else if (_step == 'phone')
          _buildPhoneOtpForm()
        else
          _buildOtpVerifyForm(),
        if (_deviceLimitMessage != null) ...[
          const SizedBox(height: 14),
          AuthDeviceLimitPanel(
            mobileStyle: mobile,
            message: _deviceLimitMessage!,
            devices: _deviceLimitDevices,
            actionLoadingId: _deviceActionLoadingId,
            onLogoutDevice: _logoutRemoteDevice,
            formatLastSeen: _formatLastSeen,
          ),
        ],
      ],
    );
  }

  Widget _buildPasswordForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!_isLogin) ...[
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _firstName,
                  textCapitalization: TextCapitalization.words,
                  decoration: _inputDecoration(label: '', hint: 'First Name'),
                  style: TextStyle(color: widget.mobileStyle ? Colors.white : null),
                  onChanged: (_) => setState(() => _error = null),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _lastName,
                  textCapitalization: TextCapitalization.words,
                  decoration: _inputDecoration(label: '', hint: 'Last Name'),
                  style: TextStyle(color: widget.mobileStyle ? Colors.white : null),
                  onChanged: (_) => setState(() => _error = null),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        if (_isLogin || !_isLogin) ...[
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            maxLength: 10,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: _inputDecoration(
              label: 'Phone Number *',
              hint: '10-digit phone number',
              prefixIcon: Icons.phone_outlined,
            ),
            style: TextStyle(color: widget.mobileStyle ? Colors.white : null),
            onChanged: (_) => setState(() {
              _error = null;
              _deviceLimitMessage = null;
              _deviceLimitDevices = const [];
            }),
          ),
          const SizedBox(height: 12),
        ],
        if (!_isLogin || _isLogin)
          TextField(
            controller: _password,
            obscureText: !_showPassword,
            decoration: _inputDecoration(
              label: _isLogin ? 'Password *' : '',
              hint: _isLogin ? 'Enter your password' : 'Create Password',
              prefixIcon: _isLogin ? Icons.lock_outline : null,
              suffix: IconButton(
                icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                onPressed: () => setState(() => _showPassword = !_showPassword),
              ),
            ),
            style: TextStyle(color: widget.mobileStyle ? Colors.white : null),
            onChanged: (_) => setState(() {
              _error = null;
              _deviceLimitMessage = null;
              _deviceLimitDevices = const [];
            }),
          ),
        if (!_isLogin) ...[
          const SizedBox(height: 12),
          TextField(
            controller: _confirmPassword,
            obscureText: !_showConfirmPassword,
            decoration: _inputDecoration(
              label: '',
              hint: 'Confirm Password',
              suffix: IconButton(
                icon: Icon(_showConfirmPassword ? Icons.visibility_off : Icons.visibility),
                onPressed: () => setState(() => _showConfirmPassword = !_showConfirmPassword),
              ),
            ),
            style: TextStyle(color: widget.mobileStyle ? Colors.white : null),
            onChanged: (_) => setState(() => _error = null),
          ),
        ],
        const SizedBox(height: 12),
        AuthAgeCheckbox(
          value: _isAbove18,
          onChanged: (v) => setState(() {
            _isAbove18 = v ?? false;
            _error = null;
          }),
          mobileStyle: widget.mobileStyle,
        ),
        const SizedBox(height: 10),
        _primaryButton(
          label: _isLogin ? 'SIGN IN' : 'SIGN UP',
          onPressed: (_loading || !_isAbove18 || _deviceActionLoadingId != null)
              ? null
              : _submitPassword,
        ),
        _linkButton(
          label: 'Use OTP login instead',
          onTap: () => setState(() {
            _isPasswordLogin = false;
            _resetOtpStep();
            _error = null;
          }),
        ),
      ],
    );
  }

  Widget _buildPhoneOtpForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!_isLogin) ...[
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _firstName,
                  textCapitalization: TextCapitalization.words,
                  decoration: _inputDecoration(label: '', hint: 'First Name'),
                  style: TextStyle(color: widget.mobileStyle ? Colors.white : null),
                  onChanged: (_) => setState(() => _error = null),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _lastName,
                  textCapitalization: TextCapitalization.words,
                  decoration: _inputDecoration(label: '', hint: 'Last Name'),
                  style: TextStyle(color: widget.mobileStyle ? Colors.white : null),
                  onChanged: (_) => setState(() => _error = null),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          maxLength: 10,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: _inputDecoration(
            label: 'Phone Number *',
            hint: '10-digit phone number',
            prefixIcon: Icons.phone_outlined,
          ),
          style: TextStyle(color: widget.mobileStyle ? Colors.white : null),
          onChanged: (_) => setState(() => _error = null),
        ),
        const SizedBox(height: 12),
        AuthAgeCheckbox(
          value: _isAbove18,
          onChanged: (v) => setState(() {
            _isAbove18 = v ?? false;
            _error = null;
          }),
          mobileStyle: widget.mobileStyle,
        ),
        const SizedBox(height: 10),
        _primaryButton(
          label: 'SEND OTP',
          onPressed: (_loading || !_isAbove18) ? null : _sendOtp,
        ),
        _linkButton(
          label: 'Login with password instead',
          onTap: () => setState(() {
            _isPasswordLogin = true;
            _error = null;
          }),
        ),
      ],
    );
  }

  Widget _buildOtpVerifyForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Enter the OTP sent to +91 ${_phone.text.trim()}',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 12,
            color: widget.mobileStyle ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _otp,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          autofillHints: const [AutofillHints.oneTimeCode],
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: TextStyle(
            color: widget.mobileStyle ? Colors.white : null,
            fontSize: 18,
            letterSpacing: 6,
          ),
          decoration: _inputDecoration(
            label: 'OTP *',
            hint: '------',
            textAlign: TextAlign.center,
          ),
          onChanged: (_) => setState(() => _error = null),
        ),
        const SizedBox(height: 10),
        _primaryButton(
          label: _isLogin ? 'VERIFY & SIGN IN' : 'VERIFY & SIGN UP',
          onPressed: _loading ? null : _verifyOtp,
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _linkButton(label: 'Change number', onTap: _resetOtpStep),
            TextButton(
              onPressed: (_resendTimer > 0 || _loading) ? null : _resendOtp,
              child: Text(
                _resendTimer > 0 ? 'Resend in ${_resendTimer}s' : 'Resend OTP',
                style: TextStyle(
                  fontSize: 12,
                  color: widget.mobileStyle ? Colors.grey.shade400 : Colors.grey.shade600,
                  decoration: _resendTimer > 0 ? null : TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _AuthTabBar extends StatelessWidget {
  const _AuthTabBar({
    required this.isLogin,
    required this.mobileStyle,
    required this.onLoginTap,
    required this.onSignupTap,
  });

  final bool isLogin;
  final bool mobileStyle;
  final VoidCallback onLoginTap;
  final VoidCallback onSignupTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: mobileStyle
                ? Colors.grey.shade700.withValues(alpha: 0.7)
                : Colors.grey.shade300,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: _AuthTabButton(label: 'Login', active: isLogin, onTap: onLoginTap),
          ),
          Expanded(
            child: _AuthTabButton(label: 'Sign Up', active: !isLogin, onTap: onSignupTap),
          ),
        ],
      ),
    );
  }
}

class _AuthTabButton extends StatelessWidget {
  const _AuthTabButton({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: active ? const Color(0xFFEAB308) : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: active
                ? const Color(0xFFEAB308)
                : (Theme.of(context).brightness == Brightness.dark
                    ? Colors.grey.shade400
                    : Colors.grey.shade600),
          ),
        ),
      ),
    );
  }
}

/// Device-limit panel (password login retry flow).
class AuthDeviceLimitPanel extends StatelessWidget {
  const AuthDeviceLimitPanel({
    super.key,
    required this.mobileStyle,
    required this.message,
    required this.devices,
    required this.actionLoadingId,
    required this.onLogoutDevice,
    required this.formatLastSeen,
  });

  final bool mobileStyle;
  final String message;
  final List<Map<String, dynamic>> devices;
  final String? actionLoadingId;
  final Future<void> Function(String deviceId) onLogoutDevice;
  final String Function(Object? iso) formatLastSeen;

  String _deviceIdOf(Map<String, dynamic> d) =>
      d['deviceId']?.toString() ?? d['id']?.toString() ?? d['_id']?.toString() ?? '';

  @override
  Widget build(BuildContext context) {
    final borderColor =
        mobileStyle ? Colors.grey.shade600.withValues(alpha: 0.55) : Colors.grey.shade300;
    final bg = mobileStyle ? Colors.grey.shade900.withValues(alpha: 0.35) : Colors.grey.shade50;
    final titleColor = mobileStyle ? Colors.white : const Color(0xFF1B3150);
    final subColor = mobileStyle ? Colors.grey.shade400 : Colors.grey.shade600;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            message,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: titleColor),
          ),
          const SizedBox(height: 6),
          Text(
            'You can log out other devices to log in on this device',
            style: TextStyle(fontSize: 12, color: subColor),
          ),
          if (devices.isNotEmpty) const SizedBox(height: 12),
          for (final d in devices) ...[
            Builder(
              builder: (context) {
                final id = _deviceIdOf(d);
                final busy = actionLoadingId == id;
                return Padding(
                  key: ValueKey<String>('dl-$id'),
                  padding: const EdgeInsets.only(bottom: 8),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: mobileStyle
                          ? Colors.grey.shade800.withValues(alpha: 0.45)
                          : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: borderColor.withValues(alpha: 0.85)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  d['deviceName']?.toString() ?? 'Active Device',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: mobileStyle ? Colors.white : const Color(0xFF1B3150),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  formatLastSeen(d['lastSeenAt']),
                                  style: TextStyle(fontSize: 11, color: subColor),
                                ),
                              ],
                            ),
                          ),
                          FilledButton(
                            onPressed: (actionLoadingId != null || id.isEmpty)
                                ? null
                                : () => onLogoutDevice(id),
                            style: FilledButton.styleFrom(
                              visualDensity: VisualDensity.compact,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              backgroundColor:
                                  mobileStyle ? AppColors.neonGreen : AppColors.neonGreenDeep,
                              foregroundColor:
                                  mobileStyle ? const Color(0xFF04140C) : Colors.white,
                            ),
                            child: busy
                                ? SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: mobileStyle ? const Color(0xFF04140C) : Colors.white,
                                    ),
                                  )
                                : const Text(
                                    'Log out',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}

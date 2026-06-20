import 'package:flutter/material.dart';

import '../services/session_coordinator.dart';
import '../theme/app_colors.dart';
import '../widgets/auth_form.dart';
import '../widgets/auth_widgets.dart';
import 'signup_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, this.initialPasswordLogin = false});

  static const String routeName = '/login';

  final bool initialPasswordLogin;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final msg = SessionCoordinator.instance.consumePendingLoginMessage();
      if (msg != null && msg.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 768;
    final form = AuthForm(
      initialPasswordLogin: widget.initialPasswordLogin,
      initialIsLogin: true,
      mobileStyle: !wide,
      onSignupTabTap: () => Navigator.of(context).pushNamed(SignupPage.routeName),
    );

    if (wide) {
      final scheme = Theme.of(context).colorScheme;
      return Scaffold(
        backgroundColor: scheme.surface,
        body: Row(
          children: [
            Expanded(
              child: Container(
                width: double.infinity,
                height: double.infinity,
                decoration: const BoxDecoration(gradient: AppColors.authBackgroundGradient),
                child: Center(
                  child: Image.asset(kAakdaLogoAsset, width: 180, fit: BoxFit.contain),
                ),
              ),
            ),
            Expanded(
              child: ColoredBox(
                color: scheme.surface,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(10),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 400),
                      child: form,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(gradient: AppColors.authBackgroundGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Column(
              children: [
                const SizedBox(height: 8),
                Image.asset(kAakdaLogoAsset, height: 96, fit: BoxFit.contain),
                const SizedBox(height: 10),
                form,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

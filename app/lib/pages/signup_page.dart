import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../widgets/auth_form.dart';
import '../widgets/auth_widgets.dart';

class SignupPage extends StatelessWidget {
  const SignupPage({super.key, this.referredBy});

  static const String routeName = '/signup';

  final String? referredBy;

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 768;
    final form = AuthForm(
      initialIsLogin: false,
      referredBy: referredBy,
      mobileStyle: !wide,
      onLoginTabTap: () => Navigator.of(context).pop(),
    );

    if (wide) {
      final scheme = Theme.of(context).colorScheme;
      return Scaffold(
        backgroundColor: scheme.surface,
        appBar: AppBar(
          backgroundColor: scheme.surface,
          elevation: 0,
          foregroundColor: scheme.primary,
        ),
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
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.gold,
      ),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(gradient: AppColors.authBackgroundGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(10),
            child: form,
          ),
        ),
      ),
    );
  }
}

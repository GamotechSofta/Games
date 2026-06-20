import 'package:flutter/material.dart';

import '../../theme/casino_ui.dart';
import '../../utils/nav_main_route.dart';
import '../../utils/nav_pop_or_home.dart';

/// `/support` hub — mirrors [SupportLanding.jsx].
class SupportLandingPage extends StatelessWidget {
  const SupportLandingPage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 512),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    IconButton(
                      onPressed: () => popOrGoHome(context),
                      icon: const Icon(Icons.arrow_back),
                      color: CasinoUi.supportMuted(context, 0.95),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Help Desk',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: CasinoUi.supportText(context),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Choose an option below',
                            style: TextStyle(
                              fontSize: 13,
                              color: CasinoUi.supportMuted(context, 0.9),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                _SupportOptionCard(
                  title: 'Raise help ticket',
                  subtitle: 'Submit a new problem with description and screenshots.',
                  gradient: const [Color(0xFFB91C1C), Color(0xFFDC2626)],
                  icon: Icons.upload_outlined,
                  onTap: () => pushMainSubRoute(context, '/support/new'),
                ),
                const SizedBox(height: 16),
                _SupportOptionCard(
                  title: 'Check previous problem status',
                  subtitle: 'See status and reply for your submitted tickets.',
                  gradient: [Colors.grey.shade700, Colors.grey.shade600],
                  icon: Icons.fact_check_outlined,
                  onTap: () => pushMainSubRoute(context, '/support/status'),
                ),
                const SizedBox(height: 32),
                Text(
                  'We typically respond within 24 hours',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: CasinoUi.supportMuted(context, isDark ? 0.75 : 0.85),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _SupportOptionCard extends StatelessWidget {
  const _SupportOptionCard({
    required this.title,
    required this.subtitle,
    required this.gradient,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final List<Color> gradient;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            color: CasinoUi.supportCardFill(context),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: CasinoUi.supportCardBorder(context)),
            boxShadow: isDark
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                height: 3,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: gradient),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: gradient),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: gradient.first.withValues(alpha: 0.25),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Icon(icon, color: Colors.white, size: 28),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: CasinoUi.supportText(context),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            subtitle,
                            style: TextStyle(
                              fontSize: 13,
                              height: 1.4,
                              color: CasinoUi.supportMuted(context, 0.9),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right,
                      color: CasinoUi.supportMuted(context, 0.6),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

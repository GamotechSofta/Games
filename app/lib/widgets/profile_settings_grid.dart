import 'package:flutter/material.dart';

import '../theme/casino_ui.dart';
import '../utils/nav_main_route.dart';

/// Settings shortcuts on profile — mirrors [Profile.jsx] `settingsItems` / `SettingsCard`.
class ProfileSettingsGrid extends StatelessWidget {
  const ProfileSettingsGrid({super.key});

  static const _items = <_ProfileSettingItem>[
    _ProfileSettingItem(
      label: 'My Bets',
      icon: Icons.receipt_long_outlined,
      route: '/bids',
    ),
    _ProfileSettingItem(
      label: 'Bet History',
      icon: Icons.history,
      route: '/bet-history',
    ),
    _ProfileSettingItem(
      label: 'Passbook',
      icon: Icons.menu_book_outlined,
      route: '/passbook',
    ),
    _ProfileSettingItem(
      label: 'Bank Detail',
      icon: Icons.account_balance_outlined,
      route: '/funds/bank-detail',
    ),
    _ProfileSettingItem(
      label: 'Update Rate',
      icon: Icons.bar_chart_outlined,
      route: '/game-rate',
    ),
    _ProfileSettingItem(
      label: 'Markets',
      icon: Icons.currency_exchange,
      route: '/',
    ),
    _ProfileSettingItem(
      label: 'Starline',
      icon: Icons.star_outline,
      route: '/startline-dashboard',
    ),
    _ProfileSettingItem(
      label: 'Top Winners',
      icon: Icons.trending_up,
      route: '/top-winners',
    ),
    _ProfileSettingItem(
      label: 'Help Desk',
      icon: Icons.support_agent_outlined,
      route: '/support',
    ),
    _ProfileSettingItem(
      label: 'My Tickets',
      icon: Icons.confirmation_number_outlined,
      route: '/support/status',
    ),
    _ProfileSettingItem(
      label: 'Download App',
      icon: Icons.download_outlined,
      route: '/download',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 720;
    return DecoratedBox(
      decoration: CasinoUi.profileSectionDecoration(context, radius: 16),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Settings',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: CasinoUi.profileText(context),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Quick links to account tools and history',
              style: TextStyle(
                fontSize: 11,
                color: CasinoUi.profileMuted(context),
              ),
            ),
            const SizedBox(height: 12),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: wide ? 4 : 2,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                mainAxisExtent: 72,
              ),
              itemCount: _items.length,
              itemBuilder: (context, i) {
                final item = _items[i];
                return _SettingsTile(
                  item: item,
                  onTap: () => _open(context, item),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _open(BuildContext context, _ProfileSettingItem item) {
    if (item.route == '/download') {
      Navigator.of(context).pushNamed('/download');
      return;
    }
    navigateMainRoute(context, item.route);
  }
}

class _ProfileSettingItem {
  const _ProfileSettingItem({
    required this.label,
    required this.icon,
    required this.route,
  });

  final String label;
  final IconData icon;
  final String route;
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({required this.item, required this.onTap});

  final _ProfileSettingItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          decoration: BoxDecoration(
            color: CasinoUi.profileNestedFill(context),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: CasinoUi.profileCardBorder(context, nested: true)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                item.icon,
                size: 18,
                color: CasinoUi.profileIconColor(context),
              ),
              const SizedBox(height: 6),
              Text(
                item.label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  height: 1.15,
                  color: CasinoUi.profileText(context),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../utils/nav_main_route.dart';
import 'app_nav_metrics.dart';

/// Bottom bar — Home, My Bets, Menu, Support, Funds.
class AppBottomNav extends StatelessWidget {
  const AppBottomNav({
    super.key,
    required this.shellContext,
    required this.currentPath,
    required this.onOpenMenu,
  });

  final BuildContext shellContext;
  final String currentPath;
  final VoidCallback onOpenMenu;

  static const _navActive = Color(0xFFFF6A63);
  static const _navInactive = Color(0xA6FFFFFF);
  static const _menuSvg = 'assets/icons/menu_grid.svg';

  bool _isActive(_BottomNavDef item) {
    if (item.id == 'menu') return false;
    if (item.id == 'home') {
      return currentPath == '/' || currentPath == '/markets';
    }
    if (item.id == 'my-bids') {
      return currentPath == '/bids' ||
          currentPath == '/bet-history' ||
          currentPath == '/game-bet-history' ||
          currentPath == '/market-result-history';
    }
    if (item.id == 'funds') {
      return currentPath == '/funds' || currentPath.startsWith('/funds/');
    }
    final path = item.path;
    if (path == null) return false;
    final base = path.split('?').first;
    return currentPath == base || currentPath.startsWith('$base/');
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final barColor = isDark ? const Color(0xFF101010) : Colors.white;
    final hairline = isDark ? const Color(0x1AFFFFFF) : const Color(0x1A111827);
    final shadowColor =
        isDark ? const Color(0x47000000) : const Color(0x14111827);
    final navInactive = isDark ? _navInactive : const Color(0x99475567);

    return Material(
      color: barColor,
      elevation: 0,
      child: Container(
        decoration: BoxDecoration(
          color: barColor,
          border: Border(top: BorderSide(color: hairline, width: 1)),
          boxShadow: [
            BoxShadow(
              color: shadowColor,
              blurRadius: 24,
              offset: const Offset(0, -10),
            ),
          ],
        ),
        child: Padding(
          padding: EdgeInsets.fromLTRB(4, 8, 4, bottomInset + 8),
          child: SizedBox(
            height: AppNavMetrics.innerHeight - 8,
            child: Row(
              children: [
                for (final item in _items)
                  _NavItem(
                    item: item,
                    active: _isActive(item),
                    shellContext: shellContext,
                    onOpenMenu: onOpenMenu,
                    activeColor: _navActive,
                    inactiveColor: navInactive,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static const _items = <_BottomNavDef>[
    _BottomNavDef(
      id: 'home',
      label: 'Home',
      path: '/',
      icon: Icons.home_outlined,
      activeIcon: Icons.home_rounded,
    ),
    _BottomNavDef(
      id: 'my-bids',
      label: 'My Bets',
      path: '/bids',
      icon: Icons.receipt_long_outlined,
      activeIcon: Icons.receipt_long_rounded,
    ),
    _BottomNavDef(
      id: 'menu',
      label: 'Menu',
      svgAsset: _menuSvg,
    ),
    _BottomNavDef(
      id: 'support',
      label: 'Support',
      path: '/support',
      icon: Icons.support_agent_outlined,
      activeIcon: Icons.support_agent_rounded,
    ),
    _BottomNavDef(
      id: 'funds',
      label: 'Funds',
      path: '/funds',
      icon: Icons.account_balance_wallet_outlined,
      activeIcon: Icons.account_balance_wallet_rounded,
    ),
  ];
}

class _BottomNavDef {
  const _BottomNavDef({
    required this.id,
    required this.label,
    this.path,
    this.icon,
    this.activeIcon,
    this.svgAsset,
  }) : assert(
          svgAsset != null || (icon != null && activeIcon != null),
          'Provide svgAsset or both icon and activeIcon',
        );

  final String id;
  final String label;
  final String? path;
  final IconData? icon;
  final IconData? activeIcon;
  final String? svgAsset;
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.item,
    required this.active,
    required this.shellContext,
    required this.onOpenMenu,
    required this.activeColor,
    required this.inactiveColor,
  });

  final _BottomNavDef item;
  final bool active;
  final BuildContext shellContext;
  final VoidCallback onOpenMenu;
  final Color activeColor;
  final Color inactiveColor;

  @override
  Widget build(BuildContext context) {
    final fg = active ? activeColor : inactiveColor;
    const iconSize = 20.0;

    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            if (item.id == 'menu') {
              onOpenMenu();
              return;
            }
            if (item.path != null) {
              navigateMainRoute(shellContext, item.path!);
            }
          },
          borderRadius: BorderRadius.circular(12),
          splashColor: activeColor.withValues(alpha: 0.12),
          highlightColor: Colors.transparent,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  height: 2,
                  width: 24,
                  margin: const EdgeInsets.only(bottom: 4),
                  decoration: BoxDecoration(
                    color: active ? activeColor : Colors.transparent,
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
                if (item.svgAsset != null)
                  SvgPicture.asset(
                    item.svgAsset!,
                    width: iconSize,
                    height: iconSize,
                    colorFilter: ColorFilter.mode(fg, BlendMode.srcIn),
                  )
                else
                  Icon(
                    active ? item.activeIcon! : item.icon!,
                    size: iconSize,
                    color: fg,
                  ),
                const SizedBox(height: 4),
                Text(
                  item.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10,
                    height: 1.05,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.1,
                    color: fg,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

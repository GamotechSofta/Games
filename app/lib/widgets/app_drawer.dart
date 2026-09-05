import 'package:flutter/material.dart';

import '../constants/app_brand_assets.dart';
import '../pages/login_page.dart';
import '../services/auth_service.dart';
import '../services/session_coordinator.dart';
import '../services/theme_service.dart';
import '../theme/app_colors.dart';
import '../utils/nav_main_route.dart';

/// Slide-over menu from the right — mirrors [BottomNavbar.jsx] drawer.
class AppDrawer extends StatefulWidget {
  const AppDrawer({
    super.key,
    required this.shellContext,
    required this.currentPath,
  });

  final BuildContext shellContext;
  final String currentPath;

  @override
  State<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends State<AppDrawer> {
  static const _navActive = Color(0xFFFF6A63);

  final Map<String, bool> _openMenus = {'sports': true};

  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final u = await AuthService.instance.getStoredUser();
    if (mounted) setState(() => _user = u);
  }

  void _closeDrawer() {
    final nav = Navigator.of(widget.shellContext);
    if (nav.canPop()) nav.pop();
  }

  bool _pathMatches(String pathname, String path) {
    final base = path.split('?').first;
    if (base == '/') return pathname == '/';
    return pathname == base || pathname.startsWith('$base/');
  }

  bool _isPathActive(String path) => _pathMatches(widget.currentPath, path);

  bool _groupActive(_MenuEntry item) {
    if (item.path != null && _isPathActive(item.path!)) return true;
    for (final child in item.children) {
      if (child.path != null && _isPathActive(child.path!)) return true;
    }
    return false;
  }

  void _navigate(String path, {Object? arguments}) {
    _closeDrawer();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!widget.shellContext.mounted) return;
      navigateMainRoute(widget.shellContext, path, arguments: arguments);
    });
  }

  Future<void> _logout() async {
    _closeDrawer();
    SessionCoordinator.instance.stopHeartbeat();
    await AuthService.instance.logoutThisDevice();
    if (!widget.shellContext.mounted) return;
    Navigator.of(widget.shellContext).pushNamedAndRemoveUntil(
      LoginPage.routeName,
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = (MediaQuery.sizeOf(context).width * 0.86).clamp(0.0, 360.0);
    final scheme = Theme.of(context).colorScheme;
    final dividerColor = scheme.outlineVariant.withValues(alpha: 0.35);

    return Drawer(
      width: width,
      backgroundColor: scheme.surfaceContainer,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(left: Radius.circular(0)),
      ),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildHeader(),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(12, 16, 12, 24),
                children: [
                  _buildProfileRow(),
                  const SizedBox(height: 12),
                  _sectionTitle('MENU'),
                  ..._mainMenu.map(_buildMenuEntry),
                  const SizedBox(height: 16),
                  Divider(height: 1, color: dividerColor),
                  const SizedBox(height: 16),
                  _sectionTitle('ACCOUNT'),
                  ..._accountMenu.map(_buildMenuEntry),
                  const SizedBox(height: 16),
                  Divider(height: 1, color: dividerColor),
                  const SizedBox(height: 16),
                  _sectionTitle('MORE'),
                  _buildMenuEntry(_supportEntry),
                  const SizedBox(height: 16),
                  Divider(height: 1, color: dividerColor),
                  const SizedBox(height: 16),
                  _sectionTitle('PREFERENCES'),
                  _buildThemeToggle(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 16),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: scheme.outlineVariant.withValues(alpha: 0.35),
          ),
        ),
      ),
      child: Row(
        children: [
          Image.asset(
            AppBrandAssets.logo,
            height: 36,
            fit: BoxFit.contain,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Menu',
              style: TextStyle(
                color: scheme.onSurface,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          IconButton(
            onPressed: _closeDrawer,
            style: IconButton.styleFrom(
              backgroundColor: scheme.surfaceContainerHigh,
              foregroundColor: scheme.onSurface,
              minimumSize: const Size(40, 40),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.35)),
              ),
            ),
            icon: const Icon(Icons.close_rounded, size: 22),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileRow() {
    final scheme = Theme.of(context).colorScheme;
    final user = _user;
    final loggedIn = AuthService.isLoggedInUser(user);
    final name = loggedIn
        ? (user?['username']?.toString().trim().isNotEmpty == true
            ? user!['username'].toString()
            : 'Player')
        : 'Log In';
    final initial =
        name.isNotEmpty ? name[0].toUpperCase() : (loggedIn ? 'U' : '?');

    return Material(
      color: scheme.surfaceContainerHigh,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: () {
          if (loggedIn) {
            _navigate('/profile');
          } else {
            _closeDrawer();
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (widget.shellContext.mounted) {
                Navigator.of(widget.shellContext).pushNamed(LoginPage.routeName);
              }
            });
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.45)),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: scheme.surfaceContainerHighest,
                child: loggedIn
                    ? Text(
                        initial,
                        style: TextStyle(
                          color: scheme.onSurface,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      )
                    : Icon(
                        Icons.person_outline_rounded,
                        size: 20,
                        color: scheme.onSurface,
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: scheme.onSurface,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: scheme.onSurfaceVariant.withValues(alpha: 0.7),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionTitle(String text) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.2,
          color: scheme.onSurfaceVariant.withValues(alpha: 0.8),
        ),
      ),
    );
  }

  Widget _buildMenuEntry(_MenuEntry item) {
    final scheme = Theme.of(context).colorScheme;
    final rowActiveBg = scheme.primaryContainer.withValues(alpha: 0.35);
    final iconBoxBg = scheme.surfaceContainerHighest;
    final hasChildren = item.children.isNotEmpty;
    final open = _openMenus[item.id] ?? false;
    final active = _groupActive(item);

    return Column(
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () {
              if (hasChildren) {
                setState(() => _openMenus[item.id] = !open);
                return;
              }
              if (item.action == _MenuAction.logout) {
                _logout();
                return;
              }
              if (item.path != null) {
                _navigate(item.path!, arguments: item.arguments);
              }
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                color: active && !hasChildren ? rowActiveBg : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  if (item.icon != null)
                    Container(
                      width: 32,
                      height: 32,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: iconBoxBg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        item.icon,
                        size: 18,
                        color: active ? _navActive : scheme.onSurface,
                      ),
                    )
                  else
                    Container(
                      width: 8,
                      height: 8,
                      margin: const EdgeInsets.only(left: 12, right: 20),
                      decoration: BoxDecoration(
                        color: scheme.onSurfaceVariant.withValues(alpha: 0.7),
                        shape: BoxShape.circle,
                      ),
                    ),
                  if (item.icon != null) const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      item.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: hasChildren ? 14 : 13,
                        fontWeight: FontWeight.w600,
                        color: item.action == _MenuAction.logout
                            ? AppColors.accentRose
                            : (active ? _navActive : scheme.onSurface),
                      ),
                    ),
                  ),
                  if (hasChildren)
                    AnimatedRotation(
                      turns: open ? 0.5 : 0,
                      duration: const Duration(milliseconds: 200),
                      child: Icon(
                        Icons.keyboard_arrow_down_rounded,
                        size: 18,
                        color: scheme.onSurfaceVariant.withValues(alpha: 0.7),
                      ),
                    )
                  else if (item.path != null &&
                      item.action != _MenuAction.logout)
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 18,
                      color: scheme.onSurfaceVariant.withValues(alpha: 0.6),
                    ),
                ],
              ),
            ),
          ),
        ),
        if (hasChildren && open)
          Padding(
            padding: const EdgeInsets.only(left: 16, top: 4),
            child: Column(
              children: item.children.map((c) => _buildChildEntry(c)).toList(),
            ),
          ),
      ],
    );
  }

  Widget _buildChildEntry(_MenuEntry item) {
    final scheme = Theme.of(context).colorScheme;
    final rowActiveBg = scheme.primaryContainer.withValues(alpha: 0.35);
    final active = item.path != null && _isPathActive(item.path!);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          if (item.path != null) {
            _navigate(item.path!, arguments: item.arguments);
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: active ? rowActiveBg : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(right: 12),
                decoration: BoxDecoration(
                  color: active
                      ? _navActive
                      : scheme.onSurfaceVariant.withValues(alpha: 0.7),
                  shape: BoxShape.circle,
                ),
              ),
              Expanded(
                child: Text(
                  item.label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: active ? _navActive : scheme.onSurface,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildThemeToggle() {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeService.instance.mode,
      builder: (context, mode, _) {
        final scheme = Theme.of(context).colorScheme;
        final iconBoxBg = scheme.surfaceContainerHighest;
        final isLight = mode == ThemeMode.light;
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: scheme.surfaceContainerHigh,
            border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.45)),
          ),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: iconBoxBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  isLight ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                  size: 18,
                  color: scheme.onSurface,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Light Mode',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: scheme.onSurface,
                  ),
                ),
              ),
              Switch.adaptive(
                value: isLight,
                activeColor: _navActive,
                onChanged: (v) => ThemeService.instance.setThemeMode(
                  v ? ThemeMode.light : ThemeMode.dark,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  static const _mainMenu = <_MenuEntry>[
    _MenuEntry(id: 'home', label: 'Home', path: '/', icon: Icons.home_rounded),
    _MenuEntry(
      id: 'games',
      label: 'Games',
      path: '/games',
      icon: Icons.sports_esports_outlined,
    ),
    _MenuEntry(
      id: 'sports',
      label: 'Sports',
      icon: Icons.sports_soccer_outlined,
      children: [
        _MenuEntry(
          id: 'starline',
          label: 'Starline',
          path: '/startline-dashboard',
        ),
        _MenuEntry(
          id: 'king-bazaar',
          label: 'King Bazaar',
          path: '/king-bazaar-market',
        ),
      ],
    ),
    _MenuEntry(
      id: 'markets',
      label: 'Markets',
      path: '/',
      icon: Icons.currency_exchange_rounded,
    ),
  ];

  static const _accountMenu = <_MenuEntry>[
    _MenuEntry(
      id: 'profile',
      label: 'My Profile',
      path: '/profile',
      icon: Icons.person_outline,
    ),
    _MenuEntry(
      id: 'my-bets',
      label: 'My Bets',
      path: '/bids',
      icon: Icons.receipt_long_outlined,
    ),
    _MenuEntry(
      id: 'passbook',
      label: 'Passbook',
      path: '/passbook',
      icon: Icons.menu_book_outlined,
    ),
    _MenuEntry(
      id: 'funds',
      label: 'Funds',
      path: '/funds',
      icon: Icons.payments_outlined,
    ),
    _MenuEntry(
      id: 'bank-detail',
      label: 'Bank Detail',
      path: '/funds/bank-detail',
      icon: Icons.account_balance_outlined,
    ),
    _MenuEntry(
      id: 'game-rate',
      label: 'Update Rate',
      path: '/game-rate',
      icon: Icons.bar_chart_rounded,
    ),
    _MenuEntry(
      id: 'top-winners',
      label: 'Top Winners',
      path: '/top-winners',
      icon: Icons.trending_up,
    ),
    _MenuEntry(
      id: 'tickets',
      label: 'My Tickets',
      path: '/support/status',
      icon: Icons.confirmation_number_outlined,
    ),
    _MenuEntry(
      id: 'logout',
      label: 'Logout',
      icon: Icons.logout_rounded,
      action: _MenuAction.logout,
    ),
  ];

  static const _supportEntry = _MenuEntry(
    id: 'support',
    label: 'Support',
    path: '/support',
    icon: Icons.support_agent_outlined,
  );
}

enum _MenuAction { logout }

class _MenuEntry {
  const _MenuEntry({
    required this.id,
    required this.label,
    this.path,
    this.arguments,
    this.icon,
    this.action,
    this.children = const [],
  });

  final String id;
  final String label;
  final String? path;
  final Object? arguments;
  final IconData? icon;
  final _MenuAction? action;
  final List<_MenuEntry> children;
}

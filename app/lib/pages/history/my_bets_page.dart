import 'package:flutter/material.dart';

import '../../constants/remote_assets.dart';
import '../../theme/app_colors.dart';
import '../../utils/nav_main_route.dart';
import '../../theme/casino_ui.dart';
import '../../utils/nav_pop_or_home.dart';
import 'bet_history_screen.dart';
import 'market_results_screen.dart';

/// Hub for bet history + market results — [frontend/src/pages/Bids.jsx].
class MyBetsPage extends StatefulWidget {
  const MyBetsPage({super.key});

  @override
  State<MyBetsPage> createState() => _MyBetsPageState();
}

class _MyBetsPageState extends State<MyBetsPage> {
  static const _kGameResultsTab = 'game-results';
  static const _kBetHistoryTab = 'bet-history';
  static const _kStarlineBetHistoryTab = 'starline-bet-history';
  static const _kKingBazaarBetHistoryTab = 'king-bazaar-bet-history';

  String _desktopPanel = _kBetHistoryTab;
  bool _argsRead = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_argsRead) return;
    _argsRead = true;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map && args['tab'] != null) {
      final tab = args['tab']?.toString();
      if (tab == _kGameResultsTab ||
          tab == _kStarlineBetHistoryTab ||
          tab == _kKingBazaarBetHistoryTab) {
        _desktopPanel = tab!;
      }
    }
  }

  void _onBack(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 768;
    if (wide) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    } else {
      popOrGoHome(context);
    }
  }

  void _openMobileBetHistory(BuildContext context) {
    pushMainSubRoute(context, '/bet-history');
  }

  void _openMobileResults(BuildContext context) {
    pushMainSubRoute(context, '/market-result-history');
  }

  void _openMobileStarlineBetHistory(BuildContext context) {
    pushMainSubRoute(
      context,
      '/bet-history',
      arguments: const {'scope': 'starline'},
    );
  }

  void _openMobileKingBazaarBetHistory(BuildContext context) {
    pushMainSubRoute(
      context,
      '/bet-history',
      arguments: const {'scope': 'king-bazaar'},
    );
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 720;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? AppColors.gold : Theme.of(context).colorScheme.onSurface;
    final backIconColor = isDark
        ? AppColors.goldMuted
        : Theme.of(context).colorScheme.onSurfaceVariant;
    final scheme = Theme.of(context).colorScheme;
    const lightBetHistoryAccent = Color(0xFFB45309);
    const darkBetHistoryAccent = Color(0xFFD4AF37);
    final betHistoryAccent =
        isDark ? darkBetHistoryAccent : lightBetHistoryAccent;
    final panelTitleColor = betHistoryAccent;
    final rightTitle = _desktopPanel == _kGameResultsTab
        ? 'Market Result History'
        : _desktopPanel == _kStarlineBetHistoryTab
        ? 'Starline Bet History'
        : _desktopPanel == _kKingBazaarBetHistoryTab
        ? 'King Bazaar Bet History'
        : 'Bet History';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 8, 8),
          child: Row(
            children: [
              IconButton(
                onPressed: () => _onBack(context),
                icon: const Icon(Icons.arrow_back),
                color: backIconColor,
              ),
              Expanded(
                child: Text(
                  'MY BETS',
                  style: TextStyle(
                    fontSize: wide ? 22 : 20,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                    color: titleColor,
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: wide
              ? Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(
                        width: 280,
                        child: ListView(
                          children: [
                            _HubTile(
                              title: 'Bet History',
                              subtitle: 'You can view your market bet history',
                              iconData: Icons.receipt_long_rounded,
                              accentColor: betHistoryAccent,
                              onTap: () => setState(
                                () => _desktopPanel = _kBetHistoryTab,
                              ),
                              selected: _desktopPanel == _kBetHistoryTab,
                            ),
                            const SizedBox(height: 12),
                            _HubTile(
                              title: 'Starline Bet History',
                              subtitle: 'You can view your starline bet history',
                              iconData: Icons.bolt_rounded,
                              accentColor: betHistoryAccent,
                              onTap: () => setState(
                                () => _desktopPanel = _kStarlineBetHistoryTab,
                              ),
                              selected:
                                  _desktopPanel == _kStarlineBetHistoryTab,
                            ),
                            const SizedBox(height: 12),
                            _HubTile(
                              title: 'King Bazaar Bet History',
                              subtitle: 'You can view your king bazaar bet history',
                              iconData: Icons.workspace_premium_rounded,
                              accentColor: betHistoryAccent,
                              onTap: () => setState(
                                () => _desktopPanel = _kKingBazaarBetHistoryTab,
                              ),
                              selected:
                                  _desktopPanel == _kKingBazaarBetHistoryTab,
                            ),
                            const SizedBox(height: 12),
                            _HubTile(
                              title: 'Market Results',
                              subtitle:
                                  'You can view your market result history',
                              iconData: Icons.query_stats_rounded,
                              accentColor: betHistoryAccent,
                              onTap: () => setState(
                                () => _desktopPanel = _kGameResultsTab,
                              ),
                              selected: _desktopPanel == _kGameResultsTab,
                            ),
                          ],
                        ),
                      ),
                      VerticalDivider(
                        width: 1,
                        color: isDark
                            ? AppColors.gold.withValues(alpha: 0.28)
                            : Theme.of(context).colorScheme.outlineVariant,
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Text(
                                  rightTitle,
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: panelTitleColor,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: _desktopPanel == _kGameResultsTab
                                    ? const MarketResultsView()
                                    : _desktopPanel == _kStarlineBetHistoryTab
                                    ? const BetHistoryView(
                                        scope: BetHistoryScope.starline,
                                      )
                                    : _desktopPanel ==
                                              _kKingBazaarBetHistoryTab
                                    ? const BetHistoryView(
                                        scope: BetHistoryScope.kingBazaar,
                                      )
                                    : const BetHistoryView(),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
                  children: [
                    _HubTile(
                      title: 'Bet History',
                      subtitle: 'You can view your market bet history',
                      iconData: Icons.receipt_long_rounded,
                      accentColor: betHistoryAccent,
                      onTap: () => _openMobileBetHistory(context),
                      selected: false,
                      chevron: true,
                    ),
                    const SizedBox(height: 12),
                    _HubTile(
                      title: 'Starline Bet History',
                      subtitle: 'You can view your starline bet history',
                      iconData: Icons.bolt_rounded,
                      accentColor: betHistoryAccent,
                      onTap: () => _openMobileStarlineBetHistory(context),
                      selected: false,
                      chevron: true,
                    ),
                    const SizedBox(height: 12),
                    _HubTile(
                      title: 'King Bazaar Bet History',
                      subtitle: 'You can view your king bazaar bet history',
                      iconData: Icons.workspace_premium_rounded,
                      accentColor: betHistoryAccent,
                      onTap: () => _openMobileKingBazaarBetHistory(context),
                      selected: false,
                      chevron: true,
                    ),
                    const SizedBox(height: 12),
                    _HubTile(
                      title: 'Market Results',
                      subtitle: 'You can view your market result history',
                      iconData: Icons.query_stats_rounded,
                      accentColor: betHistoryAccent,
                      onTap: () => _openMobileResults(context),
                      selected: false,
                      chevron: true,
                    ),
                  ],
                ),
        ),
      ],
    );
  }
}

class _HubTile extends StatelessWidget {
  const _HubTile({
    required this.title,
    required this.subtitle,
    required this.onTap,
    required this.selected,
    this.iconUrl,
    this.iconData,
    this.accentColor,
    this.chevron = false,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool selected;
  final String? iconUrl;
  final IconData? iconData;
  final Color? accentColor;
  final bool chevron;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accent = accentColor ?? const Color(0xFFE9C46A);
    final borderColor = isDark
        ? accent.withValues(alpha: selected ? 0.52 : 0.3)
        : (selected
            ? accent.withValues(alpha: 0.75)
            : scheme.outlineVariant.withValues(alpha: 0.85));
    final titleColor = isDark ? CasinoUi.lightGold : scheme.onSurface;
    final subtitleColor = isDark
        ? CasinoUi.mutedGold(0.72)
        : scheme.onSurfaceVariant.withValues(alpha: 0.92);
    final chevronColor = isDark
        ? AppColors.goldMuted.withValues(alpha: 0.88)
        : scheme.onSurfaceVariant;
    final iconColor = const Color(0xFFFF6A63);
    final shadowColor = isDark
        ? Colors.black.withValues(alpha: selected ? 0.22 : 0.14)
        : Colors.black.withValues(alpha: selected ? 0.08 : 0.05);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        splashColor: Colors.white.withValues(alpha: 0.08),
        highlightColor: Colors.white.withValues(alpha: 0.04),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.transparent
                : (selected
                    ? accent.withValues(alpha: 0.06)
                    : scheme.surfaceContainer),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: borderColor,
              width: selected ? 1.2 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: shadowColor,
                blurRadius: selected ? 12 : 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              if (iconUrl != null || iconData != null) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 48,
                    height: 48,
                    color: Colors.transparent,
                    alignment: Alignment.center,
                    child: iconUrl != null
                        ? Image.network(
                            iconUrl!,
                            width: 48,
                            height: 48,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => Icon(
                              iconData ?? Icons.emoji_events,
                              size: 28,
                              color: iconColor,
                            ),
                          )
                        : Icon(
                            iconData ?? Icons.emoji_events,
                            size: 28,
                            color: iconColor,
                          ),
                  ),
                ),
                const SizedBox(width: 14),
              ] else ...[
                Container(
                  width: 48,
                  height: 48,
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.emoji_events,
                    size: 28,
                    color: iconColor,
                  ),
                ),
                const SizedBox(width: 14),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: titleColor,
                        letterSpacing: 0.1,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: subtitleColor,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
              if (chevron)
                Icon(
                  Icons.chevron_right,
                  color: chevronColor,
                  size: 28,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

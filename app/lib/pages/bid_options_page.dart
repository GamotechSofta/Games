import 'package:flutter/material.dart';

import '../constants/bid_option_assets.dart';
import '../theme/app_colors.dart';
import '../theme/casino_ui.dart';
import '../utils/nav_main_route.dart';
import '../utils/market_timing.dart';
import 'game_bid_page.dart';

class _BidOpt {
  const _BidOpt({
    required this.id,
    required this.title,
    required this.iconAsset,
    this.gameMode,
  });

  final double id;
  final String title;
  final String iconAsset;
  /// When set (e.g. `'bulk'`), overrides inferring mode from the word "bulk" in [title].
  final String? gameMode;
}

final _allOptions = <_BidOpt>[
  const _BidOpt(
    id: 2,
    title: 'Single Digit',
    iconAsset: BidOptionAssets.singleDice,
    gameMode: 'bulk',
  ),
  const _BidOpt(id: 3, title: 'Jodi', iconAsset: BidOptionAssets.doubleDice),
  const _BidOpt(id: 4, title: 'Jodi Bulk', iconAsset: BidOptionAssets.doubleDice),
  const _BidOpt(id: 5, title: 'Single Pana', iconAsset: BidOptionAssets.singlePatti),
  const _BidOpt(id: 6, title: 'Single Pana Bulk', iconAsset: BidOptionAssets.singlePatti),
  const _BidOpt(id: 7, title: 'Double Pana', iconAsset: BidOptionAssets.doublePatti),
  const _BidOpt(id: 8, title: 'Double Pana Bulk', iconAsset: BidOptionAssets.doublePatti),
  const _BidOpt(id: 9, title: 'Triple Pana', iconAsset: BidOptionAssets.triplePatti),
  const _BidOpt(id: 10, title: 'Half Sangam', iconAsset: BidOptionAssets.halfSangam),
  const _BidOpt(id: 11, title: 'Full Sangam', iconAsset: BidOptionAssets.fullSangam),
  const _BidOpt(id: 12, title: 'SP Common', iconAsset: BidOptionAssets.singlePatti),
  const _BidOpt(id: 13, title: 'DP Common', iconAsset: BidOptionAssets.doublePatti),
  const _BidOpt(id: 14, title: 'CP', iconAsset: BidOptionAssets.singlePatti),
  const _BidOpt(id: 15, title: 'SP Motor', iconAsset: BidOptionAssets.singlePatti),
  const _BidOpt(id: 16, title: 'DP Motor', iconAsset: BidOptionAssets.doublePatti),
  const _BidOpt(id: 17, title: 'SP DP Motor', iconAsset: BidOptionAssets.singlePatti),
  const _BidOpt(id: 18, title: 'SP DP T Motor', iconAsset: BidOptionAssets.singlePatti),
  const _BidOpt(id: 19, title: 'Odd Even', iconAsset: BidOptionAssets.singleDice),
  const _BidOpt(id: 20, title: 'Chart Game', iconAsset: BidOptionAssets.singlePatti),
];

bool _inferStarline(Map<String, dynamic>? market) {
  if (market == null) return false;
  final t = (market['marketType'] ?? '').toString().trim().toLowerCase();
  if (t == 'starline' || t == 'startline') return true;
  final name = (market['marketName'] ?? market['gameName'] ?? '')
      .toString()
      .toLowerCase();
  return name.contains('starline') ||
      name.contains('startline') ||
      name.contains('star line');
}

class BidOptionsPage extends StatefulWidget {
  const BidOptionsPage({super.key});

  @override
  State<BidOptionsPage> createState() => _BidOptionsPageState();
}

class _BidOptionsPageState extends State<BidOptionsPage> {
  Map<String, dynamic>? _market;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map) {
      _market = Map<String, dynamic>.from(args);
    }
  }

  @override
  Widget build(BuildContext context) {
    final market = _market;
    if (market == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) navigateMainRoute(context, '/');
      });
      return const Scaffold(body: SizedBox.shrink());
    }

    final isStarline = _inferStarline(market);
    final timing = isBettingAllowed(market);
    final isCloseOnlyWindow = timing.allowed && timing.closeOnly;
    final isRunning =
        market['status']?.toString() == 'running' || isCloseOnlyWindow;

    final starlineAllowed = {
      'Single Digit',
      'Odd Even',
      'SP Common',
      'CP',
      'Single Pana',
      'Single Pana Bulk',
      'Double Pana',
      'Double Pana Bulk',
      'Triple Pana',
      'Half Sangam',
      'SP Motor',
      'DP Motor',
      'DP Common',
      'SP DP Motor',
      'SP DP T Motor',
      'Chart Game',
    };

    var visible = isStarline
        ? _allOptions.where((o) => starlineAllowed.contains(o.title)).toList()
        : _allOptions;

    if (!isStarline && isRunning) {
      const hideWhenRunning = {
        'jodi',
        'jodi bulk',
        'full sangam',
        'half sangam',
      };
      visible = visible
          .where((o) => !hideWhenRunning.contains(o.title.toLowerCase().trim()))
          .toList();
    }

    final gameName =
        (market['gameName'] ?? market['marketName'] ?? 'SELECT MARKET')
            .toString();
    final screenW = MediaQuery.sizeOf(context).width;
    final crossAxisCount = screenW >= 520 ? 4 : (screenW >= 340 ? 3 : 2);
    final childAspectRatio = crossAxisCount >= 4
        ? 1.22
        : crossAxisCount >= 3
        ? 1.16
        : 1.1;

    final isLight = Theme.of(context).brightness == Brightness.light;
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          CasinoUi.backdropBlur(
            borderRadius: BorderRadius.zero,
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            fill: isLight
                ? scheme.surfaceContainer.withValues(alpha: 0.98)
                : AppColors.surfaceCard.withValues(alpha: 0.48),
            border: Border(
              bottom: BorderSide(
                color: isLight
                    ? scheme.outlineVariant
                    : Colors.white.withValues(alpha: 0.14),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.arrow_back),
                  color: isLight ? scheme.onSurface : CasinoUi.mutedGold(0.95),
                ),
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        gameName.toUpperCase(),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          letterSpacing: 0.5,
                          color: isLight ? scheme.onSurface : CasinoUi.lightGold,
                        ),
                      ),
                      if (isStarline)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            'STARLINE MARKET',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 2,
                              color: isLight ? scheme.primary : AppColors.neonGreen,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 48),
              ],
            ),
          ),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 92),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: childAspectRatio,
              ),
              itemCount: visible.length,
              itemBuilder: (context, i) {
                final o = visible[i];
                final mode = o.gameMode ??
                    (o.title.toLowerCase().contains('bulk') ? 'bulk' : 'easy');
                return Material(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                  child: InkWell(
                    onTap: () {
                      Navigator.of(context).pushNamed(
                        GameBidPage.routeName,
                        arguments: GameBidArgs(
                          market: market,
                          betType: o.title,
                          gameMode: mode,
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(12),
                    splashColor: isLight
                        ? scheme.primary.withValues(alpha: 0.08)
                        : Colors.white.withValues(alpha: 0.06),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        color: isLight ? Colors.white : null,
                        gradient: isLight ? null : AppColors.cardBackgroundGradient,
                        border: isLight
                            ? null
                            : Border.all(
                                color: Colors.white.withValues(alpha: 0.14),
                                width: 1,
                              ),
                        boxShadow: isLight
                            ? [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.06),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ]
                            : null,
                      ),
                      padding: const EdgeInsets.fromLTRB(4, 5, 4, 4),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 1),
                              child: Image.asset(
                                o.iconAsset,
                                fit: BoxFit.contain,
                                errorBuilder: (_, _, _) => Icon(
                                  Icons.casino,
                                  size: 22,
                                  color: isLight
                                      ? scheme.onSurfaceVariant
                                      : AppColors.textSecondary.withValues(alpha: 0.85),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            o.title.toUpperCase(),
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 8,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.35,
                              height: 1.1,
                              color: isLight ? scheme.onSurface : CasinoUi.lightGold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

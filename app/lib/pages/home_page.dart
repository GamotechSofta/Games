import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../constants/home_assets.dart';
import '../constants/remote_assets.dart';
import '../widgets/home_category_card.dart';
import '../game_bid/market_for_bid.dart';
import '../services/markets_service.dart';
import '../theme/app_colors.dart';
import '../utils/nav_main_route.dart';
import '../utils/market_timing.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with WidgetsBindingObserver {
  Timer? _every30s;
  Timer? _every60s;
  Timer? _bannerTicker;
  String _lastIstDate = getTodayIst();

  List<Map<String, dynamic>> _rawMarkets = [];
  List<String> _mobileBanners = const [];
  int _activeBannerIndex = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _fetchMarkets();
    unawaited(_loadMobileBanners());
    _every30s = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _fetchMarkets(),
    );
    _every60s = Timer.periodic(const Duration(seconds: 60), (_) {
      final today = getTodayIst();
      if (_lastIstDate != today) {
        _lastIstDate = today;
        _fetchMarkets();
      } else if (mounted) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _every30s?.cancel();
    _every60s?.cancel();
    _bannerTicker?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _lastIstDate = getTodayIst();
      _fetchMarkets();
    }
  }

  Future<void> _fetchMarkets() async {
    try {
      final all = await MarketsService.instance.fetchAllMarketsWithPopular();
      if (mounted) {
        setState(() {
          _rawMarkets = all;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _allMarketsSorted {
    final popular = <Map<String, dynamic>>[];
    final rest = <Map<String, dynamic>>[];
    for (final m in _rawMarkets) {
      if (MarketsService.isShowInPopular(m)) {
        popular.add(m);
      } else {
        rest.add(m);
      }
    }
    return [...popular, ...rest];
  }

  List<String> _parseMobileBanners(Map<String, dynamic>? body) {
    if (body == null) return const [];
    final candidates = <dynamic>[
      body['mobileBanners'],
      (body['data'] is Map)
          ? (body['data'] as Map)['mobileBanners']
          : null,
      body['banners'],
    ];
    for (final c in candidates) {
      if (c is! List) continue;
      final out = <String>[];
      for (final item in c) {
        if (item is String) {
          final s = item.trim();
          if (s.isNotEmpty) out.add(s);
          continue;
        }
        if (item is Map) {
          final m = Map<String, dynamic>.from(item);
          for (final key in ['url', 'imageUrl', 'image', 'src']) {
            final s = m[key]?.toString().trim() ?? '';
            if (s.isNotEmpty) {
              out.add(s);
              break;
            }
          }
        }
      }
      if (out.isNotEmpty) return out;
    }
    return const [];
  }

  Future<void> _loadMobileBanners() async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/banner-settings'));
      final body = jsonDecode(res.body) as Map<String, dynamic>?;
      if (!mounted || res.statusCode < 200 || res.statusCode >= 300) return;
      final banners = _parseMobileBanners(body);
      if (banners.isEmpty) return;
      setState(() {
        _mobileBanners = banners;
        _activeBannerIndex = 0;
      });
      _bannerTicker?.cancel();
      if (banners.length > 1) {
        _bannerTicker = Timer.periodic(const Duration(seconds: 5), (_) {
          if (!mounted || _mobileBanners.length < 2) return;
          setState(() {
            _activeBannerIndex =
                (_activeBannerIndex + 1) % _mobileBanners.length;
          });
        });
      }
    } catch (_) {
      // keep fallback banner assets
    }
  }

  String _formatTime12(String? time24) {
    if (time24 == null || time24.isEmpty) return '';
    final parts = time24.split(':');
    final hour = int.tryParse(parts.isNotEmpty ? parts[0] : '0') ?? 0;
    final minutes = parts.length > 1 ? parts[1].padLeft(2, '0') : '00';
    final ampm = hour >= 12 ? 'PM' : 'AM';
    final h12 = hour % 12 == 0 ? 12 : hour % 12;
    return '$h12:$minutes $ampm';
  }

  bool _isThreeDigits(dynamic v) {
    if (v == null) return false;
    return RegExp(r'^\d{3}$').hasMatch(v.toString().trim());
  }

  Widget _marketCard(
    BuildContext context,
    Map<String, dynamic> m, {
    bool fillCell = false,
  }) {
    final status = _statusFor(m);
    final displayResult = m['displayResult']?.toString() ?? '***-**-***';
    final name = m['marketName']?.toString() ?? 'Market';
    final openT = _formatTime12(m['startingTime']?.toString());
    final closeT = _formatTime12(m['closingTime']?.toString());

    return _MarketCard(
      gameName: name,
      result: displayResult,
      status: status,
      openTime: openT,
      closeTime: closeT,
      fillCell: fillCell,
      onTap: () {
        navigateMainRoute(
          context,
          '/bidoptions',
          arguments: normalizeMarketForBid(m),
        );
      },
    );
  }

  String _statusFor(Map<String, dynamic> market) {
    if (isPastClosingTime(market)) return 'closed';
    if (_isThreeDigits(market['openingNumber']) &&
        _isThreeDigits(market['closingNumber'])) {
      return 'closed';
    }
    if (_isThreeDigits(market['openingNumber']) &&
        !_isThreeDigits(market['closingNumber'])) {
      return 'running';
    }
    return 'open';
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 768;
    final allMarkets = _allMarketsSorted;
    const marketRowSpacing = 8.0;
    const marketColSpacing = 8.0;
    const horizontalPadding = 16.0;

    double marketCellWidth(int columns) {
      final innerWidth = MediaQuery.sizeOf(context).width - horizontalPadding;
      final gaps = marketColSpacing * (columns - 1);
      return (innerWidth - gaps) / columns;
    }

    double marketRowHeight(double cellWidth) =>
        cellWidth * (wide ? 0.70 : 0.72);

    final allMarketsColumns = wide ? 4 : 2;
    final allMarketsCellWidth = marketCellWidth(allMarketsColumns);
    final allMarketsRowHeight = marketRowHeight(allMarketsCellWidth);

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: _HeroSection(
            wide: wide,
            imageUrl: _mobileBanners.isNotEmpty
                ? _mobileBanners[_activeBannerIndex]
                : null,
          ),
        ),
        SliverToBoxAdapter(
          child: _HomeCategoryGrid(shellContext: context),
        ),
        if (_loading)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Center(
                child: Text(
                  'Loading markets...',
                  style: TextStyle(
                    color: AppColors.goldMuted.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          )
        else if (_rawMarkets.isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Center(
                child: Text(
                  'No markets available',
                  style: TextStyle(
                    color: AppColors.goldMuted.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          )
        else ...[
          SliverToBoxAdapter(
            child: _SectionHeader(
              title: 'All Markets',
              onAction: () {},
              actionLabel: '',
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(8, 0, 8, 24),
            sliver: SliverGrid(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: allMarketsColumns,
                mainAxisSpacing: marketRowSpacing,
                crossAxisSpacing: marketColSpacing,
                mainAxisExtent: allMarketsRowHeight,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) => _marketCard(
                  context,
                  allMarkets[index],
                  fillCell: true,
                ),
                childCount: allMarkets.length,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _HeroSection extends StatelessWidget {
  const _HeroSection({
    required this.wide,
    this.imageUrl,
  });

  final bool wide;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final fallback = wide ? RemoteAssets.heroDesktop : RemoteAssets.heroMobile;
    final url = (imageUrl?.trim().isNotEmpty ?? false)
        ? imageUrl!.trim()
        : fallback;
    final image = AnimatedSwitcher(
      duration: const Duration(milliseconds: 700),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      child: Image.network(
        url,
        key: ValueKey(url),
        fit: wide ? BoxFit.cover : BoxFit.contain,
        width: double.infinity,
        errorBuilder: (_, _, _) => wide
            ? Container(color: Colors.grey.shade800)
            : const SizedBox(height: 10),
      ),
    );
    if (wide) {
      return AspectRatio(
        aspectRatio: 1920 / 500,
        child: image,
      );
    }
    return image;
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.onAction,
    this.actionLabel = 'View All',
  });

  final String title;
  final VoidCallback onAction;
  final String actionLabel;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final headingColor = isDark ? AppColors.goldMuted : Colors.black;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(
                Icons.local_fire_department_rounded,
                size: 18,
                color: const Color(0xFFFF5A52),
              ),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  color: headingColor,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.2,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          if (actionLabel.isNotEmpty)
            TextButton(
              onPressed: onAction,
              child: Text(
                actionLabel,
                style: const TextStyle(
                  color: Color(0xFFEAB308),
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            )
          else
            const SizedBox.shrink(),
        ],
      ),
    );
  }
}

class _HomeCategoryGrid extends StatelessWidget {
  const _HomeCategoryGrid({required this.shellContext});

  final BuildContext shellContext;

  void _openGames() => navigateMainRoute(shellContext, '/games');

  void _openStarline() => navigateMainRoute(shellContext, '/startline-dashboard');

  void _openKingBazaar() => navigateMainRoute(shellContext, '/king-bazaar-market');

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 768;
    return Padding(
      padding: EdgeInsets.fromLTRB(wide ? 16 : 10, 12, wide ? 16 : 10, 8),
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: wide ? 12 : 10,
        mainAxisSpacing: wide ? 12 : 10,
        childAspectRatio: wide ? 2.55 : 2.35,
        children: [
          HomeCategoryCard(
            label: 'Games',
            backgroundAsset: HomeAssets.casinoButtonBg,
            iconAsset: HomeAssets.casinoIcon,
            onTap: _openGames,
          ),
          HomeCategoryCard(
            label: 'Markets',
            backgroundAsset: HomeAssets.skillGamesButtonBg,
            iconAsset: HomeAssets.skillGamesIcon,
            onTap: () => navigateMainRoute(shellContext, '/markets'),
          ),
          HomeCategoryCard(
            label: 'Starline',
            backgroundAsset: HomeAssets.starlineButtonBg,
            iconAsset: HomeAssets.starlineIcon,
            onTap: _openStarline,
          ),
          HomeCategoryCard(
            label: 'King Bazaar',
            backgroundAsset: HomeAssets.kingBazaarButtonBg,
            iconAsset: HomeAssets.kingBazaarIcon,
            onTap: _openKingBazaar,
          ),
        ],
      ),
    );
  }
}

class _LegacyMarketsHeader extends StatelessWidget {
  const _LegacyMarketsHeader({required this.wide});

  final bool wide;

  @override
  Widget build(BuildContext context) {
    final lineDim = AppColors.gold.withValues(alpha: 0.35);
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 16),
      child: Row(
        children: [
          Expanded(child: Container(height: 1, color: lineDim)),
          const SizedBox(width: 8),
          Text(
            '+',
            style: TextStyle(
              color: AppColors.gold,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            'MARKETS',
            style: TextStyle(
              color: AppColors.goldMuted,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.5,
              fontSize: 15,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            '+',
            style: TextStyle(
              color: AppColors.gold,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(child: Container(height: 1, color: lineDim)),
        ],
      ),
    );
  }
}

class _MarketCard extends StatelessWidget {
  const _MarketCard({
    required this.gameName,
    required this.result,
    required this.status,
    required this.openTime,
    required this.closeTime,
    required this.onTap,
    this.fillCell = false,
  });

  static const Color _cardBgDark = Color(0xFF1A1C24);
  static const Color _cardBgLight = Colors.white;
  static const Color _borderDark = Color(0xFFE9C46A);
  static const Color _borderLight = Color(0xFFE9C46A);
  static const Color _coral = Color(0xFFE54D42);
  static const Color _pillBgDark = Color(0xFF33363F);
  static const Color _pillBgLight = Color(0xFFF3F4F6);
  static const Color _labelGreyDark = Color(0xFF9CA3AF);
  static const Color _labelGreyLight = Color(0xFF6B7280);
  static const Color _footerGreen = Color(0xFF1B9E5A);

  final String gameName;
  final String result;
  final String status;
  final String openTime;
  final String closeTime;
  final VoidCallback onTap;
  final bool fillCell;

  String get _footerLabel {
    switch (status) {
      case 'closed':
        return 'RUNNING FOR TOMORROW';
      case 'running':
        return 'CLOSE IS RUNNING';
      default:
        return 'MARKET IS OPEN';
    }
  }

  Color get _footerColor {
    if (status == 'open') return _footerGreen;
    return _coral;
  }

  @override
  Widget build(BuildContext context) {
    const radius = 16.0;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final onSurface = Theme.of(context).colorScheme.onSurface;
    final body = _buildBody(
      onSurface,
      isDark: isDark,
    );
    final footer = _buildFooter(isDark: isDark);

    final card = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        splashColor: Colors.white.withValues(alpha: 0.06),
        child: Ink(
          width: double.infinity,
          height: fillCell ? double.infinity : null,
          decoration: BoxDecoration(
            color: isDark ? _cardBgDark : _cardBgLight,
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(
              color: isDark ? _borderDark : _borderLight,
              width: 1.2,
            ),
            boxShadow: isDark
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                    BoxShadow(
                      color: const Color(0xFFE9C46A).withValues(alpha: 0.22),
                      blurRadius: 9,
                      spreadRadius: 0.2,
                    ),
                  ]
                : [
                    BoxShadow(
                      color: const Color(0xFFE9C46A).withValues(alpha: 0.18),
                      blurRadius: 8,
                      spreadRadius: 0.15,
                    ),
                  ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(radius),
            child: fillCell
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(child: body),
                      footer,
                    ],
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [body, footer],
                  ),
          ),
        ),
      ),
    );

    if (!fillCell) return card;
    return SizedBox(width: double.infinity, height: double.infinity, child: card);
  }

  Widget _buildBody(
    Color onSurface, {
    required bool isDark,
  }) {
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
          Text(
            gameName.trim().toUpperCase(),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: onSurface,
              fontWeight: FontWeight.w800,
              fontSize: 13,
              letterSpacing: 0.35,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 5),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              result,
              style: const TextStyle(
                color: _coral,
                fontWeight: FontWeight.w800,
                fontSize: 18,
                letterSpacing: 0.45,
                height: 1,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            decoration: BoxDecoration(
              color: isDark ? _pillBgDark : _pillBgLight,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _timeColumn(openTime, 'OPEN', onSurface, isDark: isDark),
                ),
                Icon(
                  Icons.schedule_rounded,
                  size: 16,
                  color: (isDark ? Colors.white : Colors.black)
                      .withValues(alpha: isDark ? 0.45 : 0.35),
                ),
                Expanded(
                  child: _timeColumn(closeTime, 'CLOSE', onSurface, isDark: isDark),
                ),
              ],
            ),
          ),
        ],
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(5, 4, 5, 4),
      child: fillCell
          ? Align(alignment: Alignment.center, child: content)
          : content,
    );
  }

  Widget _buildFooter({required bool isDark}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 7),
      color: _footerColor,
      child: Text(
        _footerLabel,
        textAlign: TextAlign.center,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: Colors.white.withValues(alpha: isDark ? 0.98 : 1),
          fontWeight: FontWeight.w800,
          fontSize: 9,
          letterSpacing: 0.3,
          height: 1,
        ),
      ),
    );
  }

  Widget _timeColumn(
    String time,
    String label,
    Color onSurface, {
    required bool isDark,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          time.isEmpty ? '--:--' : time,
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: onSurface,
            fontWeight: FontWeight.w700,
            fontSize: 12,
            height: 1.05,
          ),
        ),
        const SizedBox(height: 1),
        Text(
          label,
          style: TextStyle(
            color: isDark ? _labelGreyDark : _labelGreyLight,
            fontWeight: FontWeight.w600,
            fontSize: 8.5,
            letterSpacing: 0.55,
            height: 1.1,
          ),
        ),
      ],
    );
  }
}

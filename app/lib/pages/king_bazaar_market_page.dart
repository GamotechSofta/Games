import 'dart:async';

import 'package:flutter/material.dart';

import '../constants/special_market_assets.dart';
import '../game_bid/market_for_bid.dart';
import '../services/special_markets_service.dart';
import '../theme/app_colors.dart';
import '../utils/nav_main_route.dart';
import '../widgets/special_market_slot_row.dart';

/// King Bazaar group picker + time slots — mirrors [KingBazaarMarket.jsx].
class KingBazaarMarketPage extends StatefulWidget {
  const KingBazaarMarketPage({super.key});

  @override
  State<KingBazaarMarketPage> createState() => _KingBazaarMarketPageState();
}

class _KingBazaarMarketPageState extends State<KingBazaarMarketPage> {
  String _marketKey = '';
  String _marketLabel = 'King Bazaar';
  bool _manualPick = false;
  List<MarketGroup> _groups = const [];
  List<Map<String, dynamic>> _slots = const [];
  bool _loadingGroups = true;
  bool _loadingSlots = false;
  bool _autoRouted = false;
  Timer? _tickTimer;
  Timer? _refreshTimer;
  DateTime _now = DateTime.now();
  bool _argsLoaded = false;

  bool get _pickingGroup => _marketKey.isEmpty;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_argsLoaded) return;
    _argsLoaded = true;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map) {
      _marketKey = (args['marketKey'] ?? args['key'] ?? '').toString().trim().toLowerCase();
      _marketLabel = (args['marketLabel'] ?? args['label'] ?? 'King Bazaar').toString();
      _manualPick = args['manualPick'] == true;
    }
    if (_pickingGroup) {
      unawaited(_loadGroups());
    } else {
      unawaited(_loadSlots());
    }
  }

  @override
  void initState() {
    super.initState();
    _tickTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
    _refreshTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      if (_pickingGroup) {
        unawaited(_loadGroups());
      } else {
        unawaited(_loadSlots());
      }
    });
  }

  @override
  void dispose() {
    _tickTimer?.cancel();
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadGroups() async {
    try {
      final groups = await SpecialMarketsService.instance.fetchGroups(isKing: true);
      if (!mounted) return;
      setState(() {
        _groups = groups;
        _loadingGroups = false;
      });
      if (!_manualPick && !_autoRouted && groups.length == 1) {
        _autoRouted = true;
        final g = groups.first;
        setState(() {
          _marketKey = g.key;
          _marketLabel = g.label;
          _loadingSlots = true;
        });
        unawaited(_loadSlots());
      }
    } catch (_) {
      if (mounted) setState(() => _loadingGroups = false);
    }
  }

  Future<void> _loadSlots() async {
    if (_marketKey.isEmpty) return;
    setState(() => _loadingSlots = _slots.isEmpty);
    try {
      final slots = await SpecialMarketsService.instance.fetchSlots(
        marketType: 'king',
        groupKey: _marketKey,
        marketLabel: _marketLabel,
      );
      if (!mounted) return;
      setState(() {
        _slots = slots;
        _loadingSlots = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingSlots = false);
    }
  }

  void _selectGroup(MarketGroup g) {
    setState(() {
      _marketKey = g.key;
      _marketLabel = g.label;
      _slots = const [];
      _loadingSlots = true;
    });
    unawaited(_loadSlots());
  }

  void _handleBack() {
    if (_marketKey.isNotEmpty) {
      if (_groups.length <= 1) {
        navigateMainRoute(context, '/');
        return;
      }
      setState(() {
        _marketKey = '';
        _slots = const [];
        _manualPick = true;
      });
      return;
    }
    navigateMainRoute(context, '/');
  }

  void _openBid(Map<String, dynamic> slot) {
    final market = normalizeMarketForBid({
      '_id': slot['_id'] ?? slot['id'],
      'marketName': slot['marketName'] ?? slot['gameName'] ?? _marketLabel,
      'gameName': slot['gameName'] ?? slot['marketName'] ?? _marketLabel,
      'startingTime': slot['startingTime'],
      'closingTime': slot['closingTime'] ?? slot['startingTime'],
      'openingNumber': slot['openingNumber'],
      'closingNumber': slot['closingNumber'],
      'status': 'open',
      'marketType': 'king',
    });
    navigateMainRoute(context, '/bidoptions', arguments: market);
  }

  @override
  Widget build(BuildContext context) {
    final title = _marketLabel.isEmpty ? 'King Bazaar' : _marketLabel;
    final loading = _pickingGroup ? _loadingGroups : _loadingSlots;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IconButton(
                  onPressed: _handleBack,
                  icon: const Icon(Icons.arrow_back_ios_new_rounded),
                  color: AppColors.goldMuted,
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'King Bazaar',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.55),
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: AppColors.goldMuted,
                          fontWeight: FontWeight.w800,
                          fontSize: 22,
                        ),
                      ),
                      if (!_pickingGroup) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Select a time slot',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.45),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_pickingGroup) ...[
              if (loading)
                ...List.generate(
                  3,
                  (_) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Container(
                      height: 120,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                )
              else if (_groups.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Text(
                      'No King Bazaar markets available',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.6),
                        fontSize: 14,
                      ),
                    ),
                  ),
                )
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.05,
                  ),
                  itemCount: _groups.length,
                  itemBuilder: (context, index) {
                    final g = _groups[index];
                    return Material(
                      color: const Color(0xFF111113),
                      borderRadius: BorderRadius.circular(14),
                      child: InkWell(
                        onTap: () => _selectGroup(g),
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.1),
                            ),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: Image.network(
                                  SpecialMarketAssets.kingBazaarGroupPicker,
                                  width: 64,
                                  height: 64,
                                  fit: BoxFit.contain,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                g.label,
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.onSurface,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
            ] else ...[
              if (!loading && _slots.isEmpty)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
                    ),
                  ),
                  child: Text(
                    'No time slots for $title yet. Slots are added in Admin Panel.',
                    style: TextStyle(
                      color: const Color(0xFFFCD34D).withValues(alpha: 0.95),
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ),
              if (loading)
                ...List.generate(
                  6,
                  (_) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Container(
                      height: 64,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                )
              else
                ..._slots.map(
                  (slot) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: buildKingSlotRow(
                      context: context,
                      slot: slot,
                      now: _now,
                      onPlay: () => _openBid(slot),
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

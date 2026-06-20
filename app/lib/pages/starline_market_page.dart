import 'dart:async';

import 'package:flutter/material.dart';

import '../game_bid/market_for_bid.dart';
import '../services/special_markets_service.dart';
import '../theme/app_colors.dart';
import '../utils/nav_main_route.dart';
import '../widgets/special_market_slot_row.dart';

/// Starline time slots for one group — mirrors [StarlineMarket.jsx].
class StarlineMarketPage extends StatefulWidget {
  const StarlineMarketPage({super.key});

  @override
  State<StarlineMarketPage> createState() => _StarlineMarketPageState();
}

class _StarlineMarketPageState extends State<StarlineMarketPage> {
  String _marketKey = '';
  String _marketLabel = 'Starline';
  List<Map<String, dynamic>> _slots = const [];
  bool _loading = true;
  Timer? _tickTimer;
  Timer? _refreshTimer;
  DateTime _now = DateTime.now();
  bool _argsLoaded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_argsLoaded) return;
    _argsLoaded = true;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map) {
      _marketKey = (args['marketKey'] ?? args['key'] ?? '').toString().trim().toLowerCase();
      _marketLabel = (args['marketLabel'] ?? args['label'] ?? 'Starline').toString();
    }
    unawaited(_loadSlots());
  }

  @override
  void initState() {
    super.initState();
    _tickTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
    _refreshTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      unawaited(_loadSlots());
    });
  }

  @override
  void dispose() {
    _tickTimer?.cancel();
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadSlots() async {
    if (_marketKey.isEmpty) {
      if (mounted) {
        Navigator.of(context).pop();
      }
      return;
    }
    try {
      final slots = await SpecialMarketsService.instance.fetchSlots(
        marketType: 'startline',
        groupKey: _marketKey,
        marketLabel: _marketLabel,
      );
      if (!mounted) return;
      setState(() {
        _slots = slots;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
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
      'marketType': 'starline',
    });
    navigateMainRoute(context, '/bidoptions', arguments: market);
  }

  @override
  Widget build(BuildContext context) {
    final title = _marketLabel.isEmpty ? 'Starline' : _marketLabel;

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
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.arrow_back_ios_new_rounded),
                  color: AppColors.goldMuted,
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Starline Market',
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
                      const SizedBox(height: 4),
                      Text(
                        'Select a time slot',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.45),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (!_loading && _slots.isEmpty)
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
            if (_loading)
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
                  child: buildStarlineSlotRow(
                    context: context,
                    slot: slot,
                    now: _now,
                    onPlay: () => _openBid(slot),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

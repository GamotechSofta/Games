import 'dart:async';

import 'package:flutter/material.dart';

import '../constants/remote_assets.dart';
import '../constants/special_market_assets.dart';
import '../services/auth_service.dart';
import '../services/special_markets_service.dart';
import '../theme/app_colors.dart';
import '../utils/nav_main_route.dart';

/// Starline group picker — mirrors [StartlineDashboard.jsx].
class StartlineDashboardPage extends StatefulWidget {
  const StartlineDashboardPage({super.key});

  @override
  State<StartlineDashboardPage> createState() => _StartlineDashboardPageState();
}

class _StartlineDashboardPageState extends State<StartlineDashboardPage> {
  List<MarketGroup> _groups = const [];
  bool _loading = true;
  String _balanceText = '0';
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    unawaited(_loadGroups());
    unawaited(_loadBalance());
    _refreshTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      unawaited(_loadGroups());
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadBalance() async {
    final user = await AuthService.instance.getStoredUser();
    if (!mounted) return;
    final b = user?['balance'] ?? user?['walletBalance'] ?? user?['wallet'] ?? 0;
    final n = b is num ? b : num.tryParse(b.toString()) ?? 0;
    setState(() {
      _balanceText = n.round().toString();
    });
  }

  Future<void> _loadGroups() async {
    try {
      final groups = await SpecialMarketsService.instance.fetchGroups(isKing: false);
      if (!mounted) return;
      setState(() {
        _groups = groups;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openMarket(MarketGroup group) {
    Navigator.of(context).pushNamed(
      '/starline-market',
      arguments: {
        'marketKey': group.key,
        'marketLabel': group.label,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 768;
    final columns = wide ? 5 : 3;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
          children: [
            Row(
              children: [
                IconButton(
                  onPressed: () => navigateMainRoute(context, '/'),
                  icon: const Icon(Icons.arrow_back_ios_new_rounded),
                  color: AppColors.goldMuted,
                ),
                Expanded(
                  child: Text(
                    'Starline',
                    style: TextStyle(
                      color: AppColors.goldMuted,
                      fontWeight: FontWeight.w800,
                      fontSize: wide ? 26 : 20,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
                TextButton.icon(
                  onPressed: () => navigateMainRoute(context, '/bank'),
                  icon: Image.network(
                    RemoteAssets.walletIcon,
                    width: 22,
                    height: 22,
                    errorBuilder: (_, _, _) => const Icon(
                      Icons.account_balance_wallet_outlined,
                      color: AppColors.goldMuted,
                      size: 22,
                    ),
                  ),
                  label: Text(
                    _balanceText,
                    style: const TextStyle(
                      color: AppColors.goldMuted,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                ),
              ],
            ),
            if (wide)
              Padding(
                padding: const EdgeInsets.only(top: 8, left: 4),
                child: Text(
                  'Choose a market',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.55),
                    fontSize: 13,
                  ),
                ),
              ),
            const SizedBox(height: 12),
            Divider(color: Colors.white.withValues(alpha: 0.1), height: 1),
            const SizedBox(height: 16),
            if (_loading)
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.72,
                ),
                itemCount: 3,
                itemBuilder: (_, _) => Container(
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              )
            else if (_groups.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: Center(
                  child: Text(
                    'No Starline markets available',
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
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.72,
                ),
                itemCount: _groups.length,
                itemBuilder: (context, index) {
                  final g = _groups[index];
                  return _StarlineGroupTile(
                    label: g.label,
                    onTap: () => _openMarket(g),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _StarlineGroupTile extends StatelessWidget {
  const _StarlineGroupTile({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Column(
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFFF2C14E), Color(0xFFD4AF37)],
                  ),
                  border: Border.all(color: Colors.black.withValues(alpha: 0.2)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFF2C14E).withValues(alpha: 0.22),
                      blurRadius: 14,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(15),
                  child: Image.network(
                    SpecialMarketAssets.starlineDashboardTile,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFFD4AF37),
                fontWeight: FontWeight.w700,
                fontSize: 13,
                height: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

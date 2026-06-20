import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../services/auth_service.dart';
import '../../services/bets_service.dart';
import '../../services/markets_service.dart';
import '../../services/wallet_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../utils/bet_cancel_eligibility.dart';
import '../../utils/bet_type_label.dart';
import '../../utils/bet_verdict.dart';
import '../../utils/nav_pop_or_home.dart';
import '../../utils/wallet_tx_parsing.dart';

const Color _histLightGold = Color(0xFFFEF9E8);

Color _histText(BuildContext context) {
  final scheme = Theme.of(context).colorScheme;
  return Theme.of(context).brightness == Brightness.dark
      ? _histLightGold
      : scheme.onSurface;
}

Color _histMuted(BuildContext context, [double alpha = 1]) {
  final scheme = Theme.of(context).colorScheme;
  return Theme.of(context).brightness == Brightness.dark
      ? AppColors.goldMuted.withValues(alpha: alpha)
      : scheme.onSurfaceVariant.withValues(alpha: alpha);
}

ShapeBorder _historyCardShape(BuildContext context) {
  final scheme = Theme.of(context).colorScheme;
  final isDark = Theme.of(context).brightness == Brightness.dark;
  return RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(16),
    side: BorderSide(
      color: const Color(0xFFE9C46A).withValues(
        alpha: isDark ? 0.45 : 0.82,
      ),
      width: 1.2,
    ),
  );
}

enum BetHistoryScope { main, starline, kingBazaar }

/// Accent + surfaces per history tab (main / starline / king bazaar).
extension BetHistoryScopePalette on BetHistoryScope {
  static const Color _darkGoldAccent = Color(0xFFD4AF37);

  /// Light mode chrome (King Bazaar bet history palette) — all tabs.
  static const Color _lightAccent = Color(0xFFB45309);

  Color accent(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return dark ? _darkGoldAccent : _lightAccent;
  }

  Color cardFill(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    if (!dark) {
      return scheme.surfaceContainer;
    }
    return AppColors.surfaceCard.withValues(alpha: 0.92);
  }

  Color pendingBorder(BuildContext context) {
    final light = Theme.of(context).brightness == Brightness.light;
    if (light) {
      return Theme.of(context).colorScheme.outline.withValues(alpha: 0.5);
    }
    return const Color(0xFFE9C46A).withValues(alpha: 0.45);
  }

  /// Page title in the app bar row.
  Color headingColor(BuildContext context) => accent(context);
}

bool _isKingBazaarMarketName(String? s) {
  final k = normalizeMarketName(s);
  return k.contains('king') || k.contains('bazaar') || k.contains('bazar');
}

class _AppliedBetHistoryFilters {
  const _AppliedBetHistoryFilters({
    required this.sessions,
    required this.statuses,
    required this.marketKeys,
    required this.bidOptionKeys,
  });

  final List<String> sessions;
  final List<String> statuses;
  final List<String> marketKeys;
  final List<String> bidOptionKeys;
}

/// Local bet cards + verdicts — parity with [frontend/src/pages/BetHistory.jsx].
class BetHistoryView extends StatefulWidget {
  const BetHistoryView({
    super.key,
    this.scope = BetHistoryScope.main,
  });

  final BetHistoryScope scope;

  @override
  State<BetHistoryView> createState() => _BetHistoryViewState();
}

class _BetHistoryViewState extends State<BetHistoryView> {
  bool _loading = true;
  String? _userId;
  String _loadError = '';
  List<Map<String, dynamic>> _apiBets = [];
  List<Map<String, dynamic>> _markets = [];
  Map<String, dynamic>? _ratesMap;
  final _sessions = <String>[];
  final _statuses = <String>[];
  final _marketKeys = <String>[];
  final _bidOptionKeys = <String>[];
  String? _cancellingBetId;
  String? _confirmCancelBetId;
  String _cancelBanner = '';
  bool _cancelBannerOk = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  bool _inScope(String? marketTitle, [String? marketType]) {
    final type = (marketType ?? '').trim().toLowerCase();
    final star = type == 'starline' ||
        type == 'startline' ||
        isStarlineMarketName(marketTitle);
    final king = type == 'king' || _isKingBazaarMarketName(marketTitle);
    if (widget.scope == BetHistoryScope.starline) return star;
    if (widget.scope == BetHistoryScope.kingBazaar) return king;
    return !star && !king;
  }

  bool _inScopeBet(Map<String, dynamic> bet) =>
      _inScope(_marketTitleFromBet(bet), _marketTypeFromBet(bet));

  bool get _hasActiveFilters =>
      _sessions.isNotEmpty ||
      _statuses.isNotEmpty ||
      _marketKeys.isNotEmpty ||
      _bidOptionKeys.isNotEmpty;

  Future<void> _refresh() async {
    final u = await AuthService.instance.getStoredUser();
    final uid = AuthService.storedUserId(u);

    final markets = await MarketsService.instance.fetchMarkets();
    final ratesRes = await BetsService.instance.fetchRatesCurrent();
    Map<String, dynamic>? ratesData;
    if (ratesRes != null && ratesRes['data'] is Map) {
      ratesData = Map<String, dynamic>.from(ratesRes['data'] as Map);
    }

    var bets = <Map<String, dynamic>>[];
    var err = '';
    if (uid != null) {
      final hist = await BetsService.instance.fetchMyBetHistory();
      if (hist.success) {
        bets = hist.bets.where(_inScopeBet).toList();
      } else {
        err = hist.message ?? 'Failed to load bet history';
      }
    }

    if (!mounted) return;
    setState(() {
      _loading = false;
      _userId = uid;
      _apiBets = bets;
      _markets = markets;
      _ratesMap = ratesData;
      _loadError = err;
    });
  }

  String _marketTitleFromBet(Map<String, dynamic> bet) {
    final m = bet['marketId'];
    if (m is Map) {
      return (m['marketName'] ?? '').toString().trim();
    }
    return '';
  }

  String? _marketTypeFromBet(Map<String, dynamic> bet) {
    final m = bet['marketId'];
    if (m is Map) {
      final t = m['marketType']?.toString().trim();
      return t == null || t.isEmpty ? null : t;
    }
    return null;
  }

  void _applyFilters(_AppliedBetHistoryFilters filters) {
    setState(() {
      _sessions
        ..clear()
        ..addAll(filters.sessions);
      _statuses
        ..clear()
        ..addAll(filters.statuses);
      _marketKeys
        ..clear()
        ..addAll(filters.marketKeys);
      _bidOptionKeys
        ..clear()
        ..addAll(filters.bidOptionKeys);
    });
  }

  List<({String key, String label})> _bidOptionFilterOptions() {
    final keys = <String>{};
    for (final bet in _apiBets) {
      final k = getBidOptionKey(
        bet['betType']?.toString(),
        bet['betNumber']?.toString(),
      );
      if (k.isNotEmpty && k != 'unknown') keys.add(k);
    }
    final out = <({String key, String label})>[];
    for (final k in bidOptionFilterOrder) {
      if (!keys.contains(k)) continue;
      final sample = _sampleBetTypeForOptionKey(k);
      out.add((
        key: k,
        label: betTypeDisplayLabel(
          sample?['betType']?.toString(),
          sample?['betNumber']?.toString(),
        ),
      ));
    }
    return out;
  }

  Map<String, dynamic>? _sampleBetTypeForOptionKey(String key) {
    for (final bet in _apiBets) {
      if (getBidOptionKey(
            bet['betType']?.toString(),
            bet['betNumber']?.toString(),
          ) ==
          key) {
        return bet;
      }
    }
    return null;
  }

  Map<String, dynamic>? _marketFromBet(
    Map<String, dynamic> bet,
    Map<String, Map<String, dynamic>> marketByName,
  ) {
    final m = bet['marketId'];
    if (m is Map<String, dynamic>) return m;
    if (m is Map) {
      final map = Map<String, dynamic>.from(m);
      final name = map['marketName']?.toString();
      if (name != null) {
        return marketByName[normalizeMarketName(name)] ?? map;
      }
      return map;
    }
    final title = _marketTitleFromBet(bet);
    return marketByName[normalizeMarketName(title)];
  }

  String? _betIdFrom(Map<String, dynamic> bet) {
    final id = _toBetIdString(bet['_id'] ?? bet['id']);
    return id;
  }

  String? _toBetIdString(dynamic v) {
    if (v == null) return null;
    if (v is String) return v.trim().isEmpty ? null : v.trim();
    if (v is Map && v[r'$oid'] != null) return v[r'$oid'].toString().trim();
    final s = v.toString().trim();
    return s.isEmpty ? null : s;
  }

  String _verdictState(Map<String, dynamic> bet, Map<String, dynamic>? market) {
    final status = (bet['status'] ?? '').toString().toLowerCase();
    if (status == 'won' || status == 'lost' || status == 'cancelled') {
      return status;
    }
    final session = (bet['betOn'] ?? '').toString().trim().toUpperCase();
    final amount =
        num.tryParse(bet['amount']?.toString() ?? '') ?? (bet['amount'] as num?) ?? 0;
    return evaluateBet(
      market: market,
      betNumberRaw: bet['betNumber']?.toString(),
      amount: amount,
      session: session,
      ratesMap: _ratesMap,
    ).state;
  }

  num _verdictPayout(Map<String, dynamic> bet, Map<String, dynamic>? market, String state) {
    if (state == 'won') {
      final p = bet['payout'];
      if (p is num && p > 0) return p;
    }
    final session = (bet['betOn'] ?? '').toString().trim().toUpperCase();
    final amount =
        num.tryParse(bet['amount']?.toString() ?? '') ?? (bet['amount'] as num?) ?? 0;
    return evaluateBet(
      market: market,
      betNumberRaw: bet['betNumber']?.toString(),
      amount: amount,
      session: session,
      ratesMap: _ratesMap,
    ).payout;
  }

  String _filterStatusLabel(String state) {
    switch (state) {
      case 'won':
        return 'Win';
      case 'lost':
        return 'Loose';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }

  String _statusUiLabel(String state, num payout) {
    switch (state) {
      case 'won':
        return payout > 0
            ? 'Win ₹${NumberFormat.decimalPattern('en_IN').format(payout)}'
            : 'Win';
      case 'lost':
        return 'Lost';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }

  Color _statusColor(String state) {
    switch (state) {
      case 'won':
        return Colors.green.shade700;
      case 'lost':
        return Colors.red.shade500;
      case 'cancelled':
        return Colors.orange.shade700;
      default:
        return widget.scope.accent(context).withValues(alpha: 0.9);
    }
  }

  Color _cardBorderColor(BuildContext context, String state) {
    switch (state) {
      case 'won':
        return const Color(0xFF43B36A);
      case 'lost':
        return Colors.red.shade500;
      case 'cancelled':
        return Colors.orange.shade400;
      case 'pending':
        return widget.scope.pendingBorder(context);
      default:
        return widget.scope.pendingBorder(context);
    }
  }

  Future<void> _runCancel(String betId) async {
    setState(() {
      _cancellingBetId = betId;
      _cancelBanner = '';
    });
    final res = await BetsService.instance.cancelBet(betId: betId);
    if (!mounted) return;
    if (res.success) {
      if (res.newBalance != null) {
        await AuthService.instance.updateStoredBalance(res.newBalance!);
      }
      final refunded = res.refundedAmount ?? 0;
      setState(() {
        _cancellingBetId = null;
        _cancelBannerOk = true;
        _cancelBanner =
            'Bet cancelled successfully. ₹${NumberFormat.decimalPattern('en_IN').format(refunded)} refunded to your wallet.';
      });
      await _refresh();
    } else {
      setState(() {
        _cancellingBetId = null;
        _cancelBannerOk = false;
        _cancelBanner = res.message ?? 'Failed to cancel bet';
      });
    }
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) setState(() => _cancelBanner = '');
    });
  }

  String _fmtTime(String? iso) {
    if (iso == null || iso.isEmpty) return '-';
    final d = DateTime.tryParse(iso);
    if (d == null) return '-';
    return '${DateFormat('dd-MM-yyyy').format(d)} ${DateFormat.jm().format(d)}';
  }

  /// Last 8 hex chars of a MongoDB ObjectId (`…` length 24) for compact display in history.
  String _displayBetId(String raw) {
    final t = raw.trim();
    if (t.isEmpty || t == '-') return t;
    if (RegExp(r'^[a-fA-F0-9]{24}$').hasMatch(t)) {
      return t.substring(16);
    }
    return t;
  }

  Widget _compactLine(
    String label,
    String value, {
    Color? valueColor,
    FontWeight valueWeight = FontWeight.w600,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              color: _histMuted(context, 0.85),
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11,
                color: valueColor ?? _histText(context),
                fontWeight: valueWeight,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _renderBetNumber(String? raw) {
    final numStr = (raw ?? '-').trim();
    if (RegExp(r'^\d{2}$').hasMatch(numStr)) {
      return '${numStr[0]} ${numStr[1]}';
    }
    return numStr.isEmpty ? '-' : numStr;
  }

  Widget _betCard(
    BuildContext context, {
    required int index,
    required String betId,
    required String marketTitle,
    required String session,
    required String gameType,
    required String betNumber,
    required String pointsText,
    required String state,
    required num payout,
    required String createdAt,
    required bool showCancel,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accent = widget.scope.accent(context);
    final border = _cardBorderColor(context, state);
    final statusText = _statusUiLabel(state, payout);
    final cancelling = _cancellingBetId == betId;

    return Card(
      color: widget.scope.cardFill(context),
      elevation: isDark ? 0 : 1,
      shadowColor: Colors.black.withValues(alpha: 0.08),
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(color: border, width: 1.5),
      ),
      child: Stack(
        children: [
          if (state == 'cancelled')
            Positioned.fill(
              child: IgnorePointer(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: isDark ? 0.15 : 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Icon(
                      Icons.close_rounded,
                      size: 36,
                      color: Colors.orange.shade700.withValues(alpha: 0.5),
                    ),
                  ),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '#$index',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: accent,
                      ),
                    ),
                    const Spacer(),
                    if (session.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: accent.withValues(alpha: 0.4),
                          ),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          session,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: accent,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(
                      'Bet ID',
                      style: TextStyle(fontSize: 10, color: _histMuted(context, 0.8)),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        _displayBetId(betId),
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 10,
                          fontFamily: 'monospace',
                          color: _histText(context),
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: () async {
                        await Clipboard.setData(ClipboardData(text: betId));
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Bet ID copied'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                      child: Padding(
                        padding: const EdgeInsets.only(left: 2),
                        child: Icon(
                          Icons.copy_rounded,
                          size: 13,
                          color: accent.withValues(alpha: 0.9),
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  marketTitle.toUpperCase().isEmpty ? 'MARKET' : marketTitle.toUpperCase(),
                  textAlign: TextAlign.right,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10,
                    color: _histMuted(context, 0.9),
                  ),
                ),
                const SizedBox(height: 2),
                _compactLine('Game', gameType),
                _compactLine('Bet', betNumber, valueWeight: FontWeight.w800),
                _compactLine('Points', pointsText, valueWeight: FontWeight.w700),
                _compactLine(
                  'Status',
                  statusText,
                  valueColor: _statusColor(state),
                ),
                _compactLine('Time', createdAt),
                if (showCancel) ...[
                  const SizedBox(height: 4),
                  Divider(height: 1, color: _histMuted(context, 0.35)),
                  const SizedBox(height: 2),
                  SizedBox(
                    width: double.infinity,
                    height: 28,
                    child: OutlinedButton(
                      onPressed: cancelling
                          ? null
                          : () => setState(() => _confirmCancelBetId = betId),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: _histText(context),
                        side: BorderSide(color: _histMuted(context, 0.5)),
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        visualDensity: VisualDensity.compact,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: cancelling
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(
                              'Cancel & Refund',
                              style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _cardForRow(Map<String, dynamic> row, int index) {
    final bet = row['bet'] as Map<String, dynamic>;
    final betId = row['betId'] as String;
    final session = row['session'] as String;
    final state = row['state'] as String;
    final payout = row['payout'] as num;
    final amount =
        num.tryParse(bet['amount']?.toString() ?? '') ?? (bet['amount'] as num?) ?? 0;
    final pointsText = NumberFormat.decimalPattern('en_IN').format(amount);
    final cancelCheck = canCancelBet(bet);
    return _betCard(
      context,
      index: index + 1,
      betId: betId,
      marketTitle: row['marketTitle'] as String,
      session: session,
      gameType: betTypeDisplayLabel(
        bet['betType']?.toString(),
        bet['betNumber']?.toString(),
      ),
      betNumber: _renderBetNumber(bet['betNumber']?.toString()),
      pointsText: pointsText,
      state: state,
      payout: payout,
      createdAt: _fmtTime(bet['createdAt']?.toString()),
      showCancel: state == 'pending' && cancelCheck.canCancel,
    );
  }

  /// Two (or three) cards per row; height follows content (no fixed aspect ratio).
  Widget _betHistoryGrid({
    required List<Map<String, dynamic>> rows,
    required int crossAxisCount,
  }) {
    final rowCount = (rows.length / crossAxisCount).ceil();
    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 88),
      itemCount: rowCount,
      itemBuilder: (context, rowIndex) {
        final start = rowIndex * crossAxisCount;
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: List.generate(crossAxisCount, (col) {
              final i = start + col;
              if (i >= rows.length) {
                return const Expanded(child: SizedBox.shrink());
              }
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    left: col == 0 ? 0 : 4,
                    right: col == crossAxisCount - 1 ? 0 : 4,
                  ),
                  child: _cardForRow(rows[i], i),
                ),
              );
            }),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: CircularProgressIndicator(color: widget.scope.accent(context)),
        ),
      );
    }

    final marketByName = <String, Map<String, dynamic>>{};
    for (final m in _markets) {
      final n = m['marketName']?.toString();
      if (n != null) marketByName[normalizeMarketName(n)] = m;
    }

    final rows = <Map<String, dynamic>>[];
    for (final bet in _apiBets) {
      final betId = _betIdFrom(bet);
      if (betId == null) continue;
      final marketTitle = _marketTitleFromBet(bet);
      final mk = normalizeMarketName(marketTitle);
      final market = _marketFromBet(bet, marketByName);
      final session = (bet['betOn'] ?? '').toString().trim().toUpperCase();
      if (_sessions.isNotEmpty && !_sessions.contains(session)) continue;
      final state = _verdictState(bet, market);
      final filterLabel = _filterStatusLabel(state);
      if (_statuses.isNotEmpty && !_statuses.contains(filterLabel)) continue;
      if (_marketKeys.isNotEmpty && !_marketKeys.contains(mk)) continue;
      final bidKey = getBidOptionKey(
        bet['betType']?.toString(),
        bet['betNumber']?.toString(),
      );
      if (_bidOptionKeys.isNotEmpty && !_bidOptionKeys.contains(bidKey)) {
        continue;
      }
      final payout = _verdictPayout(bet, market, state);
      rows.add({
        'bet': bet,
        'betId': betId,
        'marketTitle': marketTitle,
        'session': session,
        'state': state,
        'payout': payout,
        'market': market,
      });
    }

    final wide = MediaQuery.sizeOf(context).width >= 768;
    final crossAxisCount = wide ? 3 : 2;

    Widget listBody;
    if (_userId == null) {
      listBody = Center(
        child: Text(
          'Please login to see your bet history.',
          style: TextStyle(
            color: _histMuted(context, 0.92),
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    } else if (_loadError.isNotEmpty && rows.isEmpty) {
      listBody = Center(
        child: Text(
          _loadError,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.red.shade400,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    } else if (rows.isEmpty) {
      listBody = Center(
        child: Text(
          _apiBets.isNotEmpty && _hasActiveFilters
              ? 'No bets match the selected filters.'
              : 'No bets found.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: _histMuted(context, 0.92),
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    } else {
      listBody = _betHistoryGrid(
        rows: rows,
        crossAxisCount: crossAxisCount,
      );
    }

    return Stack(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_cancelBanner.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Material(
                  color: _cancelBannerOk
                      ? Colors.green.withValues(alpha: 0.15)
                      : Colors.red.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.all(10),
                    child: Text(
                      _cancelBanner,
                      style: TextStyle(
                        color: _cancelBannerOk
                            ? Colors.green.shade700
                            : Colors.red.shade400,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _openFilter(context),
                icon: Icon(Icons.filter_list, color: _histMuted(context, 0.95)),
                label: Text(
                  'Filter By',
                  style: TextStyle(
                    color: _histMuted(context, 0.95),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                style: TextButton.styleFrom(
                  foregroundColor: _histMuted(context, 0.95),
                ),
              ),
            ),
            Expanded(child: listBody),
          ],
        ),
        if (_confirmCancelBetId != null)
          Positioned.fill(
            child: Material(
              color: Colors.black.withValues(alpha: 0.7),
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 340),
                    child: Card(
                      color: Theme.of(context).colorScheme.surface,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Cancel bet?',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: _histText(context),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Are you sure you want to cancel this bet? The amount will be refunded to your wallet.',
                              style: TextStyle(
                                fontSize: 13,
                                height: 1.4,
                                color: _histMuted(context, 0.95),
                              ),
                            ),
                            const SizedBox(height: 20),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: () =>
                                        setState(() => _confirmCancelBetId = null),
                                    child: const Text('No, keep bet'),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: FilledButton(
                                    onPressed: () {
                                      final id = _confirmCancelBetId!;
                                      setState(() => _confirmCancelBetId = null);
                                      _runCancel(id);
                                    },
                                    style: FilledButton.styleFrom(
                                      backgroundColor: const Color(0xFFF59E0B),
                                      foregroundColor: Colors.black,
                                    ),
                                    child: const Text('Yes, cancel'),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _openFilter(BuildContext context) async {
    final marketLabels = <String, String>{};
    for (final m in _markets) {
      final name = m['marketName']?.toString().trim() ?? '';
      if (name.isEmpty) continue;
      if (!_inScope(name, m['marketType']?.toString())) continue;
      marketLabels[normalizeMarketName(name)] = name;
    }
    for (final bet in _apiBets) {
      final name = _marketTitleFromBet(bet);
      if (name.isEmpty || !_inScope(name, _marketTypeFromBet(bet))) continue;
      marketLabels[normalizeMarketName(name)] = name;
    }
    final options = marketLabels.entries.toList()
      ..sort((a, b) => a.value.compareTo(b.value));
    final bidOptions = _bidOptionFilterOptions();

    final sheetBg = Theme.of(context).colorScheme.surfaceContainer;
    final sheetAccent = widget.scope.accent(context);
    final sheetText = _histText(context);
    final sheetMuted = _histMuted(context, 0.95);

    final applied = await showModalBottomSheet<_AppliedBetHistoryFilters>(
      context: context,
      isScrollControlled: true,
      backgroundColor: sheetBg,
      builder: (ctx) {
        var ds = List<String>.from(_sessions);
        var dst = List<String>.from(_statuses);
        var dm = List<String>.from(_marketKeys);
        var dbo = List<String>.from(_bidOptionKeys);

        return StatefulBuilder(
          builder: (ctx, setModal) {
            void toggle(List<String> list, String value, void Function(List<String>) setList) {
              setModal(() {
                if (list.contains(value)) {
                  setList(list.where((e) => e != value).toList());
                } else {
                  setList([...list, value]);
                }
              });
            }

            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.65,
              maxChildSize: 0.9,
              builder: (_, scroll) {
                return Theme(
                  data: Theme.of(ctx).copyWith(
                    listTileTheme: ListTileThemeData(
                      iconColor: sheetAccent,
                      textColor: sheetText,
                    ),
                    checkboxTheme: CheckboxThemeData(
                      fillColor: WidgetStateProperty.resolveWith((states) {
                        if (states.contains(WidgetState.selected)) {
                          return sheetAccent;
                        }
                        return Colors.transparent;
                      }),
                      checkColor: WidgetStateProperty.all(
                        Theme.of(ctx).brightness == Brightness.dark
                            ? const Color(0xFF1A1810)
                            : Colors.white,
                      ),
                      side: WidgetStateBorderSide.resolveWith((_) {
                        return BorderSide(
                          color: sheetAccent.withValues(alpha: 0.55),
                        );
                      }),
                    ),
                  ),
                  child: Column(
                    children: [
                      Expanded(
                        child: ListView(
                          controller: scroll,
                          padding: const EdgeInsets.all(10),
                          children: [
                            Text(
                              'Filter Type',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: sheetText,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'By session',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: sheetMuted,
                              ),
                            ),
                            CheckboxListTile(
                              title: Text(
                                'OPEN',
                                style: TextStyle(
                                  color: sheetText.withValues(alpha: 0.92),
                                ),
                              ),
                              value: ds.contains('OPEN'),
                              onChanged: (_) => toggle(ds, 'OPEN', (v) => ds = v),
                            ),
                            CheckboxListTile(
                              title: Text(
                                'CLOSE',
                                style: TextStyle(
                                  color: sheetText.withValues(alpha: 0.92),
                                ),
                              ),
                              value: ds.contains('CLOSE'),
                              onChanged: (_) => toggle(ds, 'CLOSE', (v) => ds = v),
                            ),
                            Divider(color: _histMuted(ctx, 0.35)),
                            Text(
                              'By status',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: sheetMuted,
                              ),
                            ),
                            for (final s in ['Win', 'Loose', 'Pending', 'Cancelled'])
                              CheckboxListTile(
                                title: Text(
                                  s,
                                  style: TextStyle(
                                    color: sheetText.withValues(alpha: 0.92),
                                  ),
                                ),
                                value: dst.contains(s),
                                onChanged: (_) => toggle(dst, s, (v) => dst = v),
                              ),
                            if (bidOptions.isNotEmpty) ...[
                              Divider(color: _histMuted(ctx, 0.35)),
                              Text(
                                'By game type',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: sheetMuted,
                                ),
                              ),
                              for (final opt in bidOptions)
                                CheckboxListTile(
                                  title: Text(
                                    opt.label,
                                    style: TextStyle(
                                      color: sheetText.withValues(alpha: 0.92),
                                    ),
                                  ),
                                  value: dbo.contains(opt.key),
                                  onChanged: (_) =>
                                      toggle(dbo, opt.key, (v) => dbo = v),
                                ),
                            ],
                            Divider(color: _histMuted(ctx, 0.35)),
                            Text(
                              'By market',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: sheetMuted,
                              ),
                            ),
                            for (final e in options)
                              CheckboxListTile(
                                title: Text(
                                  e.value,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: sheetText.withValues(alpha: 0.92),
                                  ),
                                ),
                                value: dm.contains(e.key),
                                onChanged: (_) => toggle(dm, e.key, (v) => dm = v),
                              ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(10, 0, 10, 12),
                        child: Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text('Cancel'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: FilledButton(
                                onPressed: () {
                                  Navigator.pop(
                                    ctx,
                                    _AppliedBetHistoryFilters(
                                      sessions: List<String>.from(ds),
                                      statuses: List<String>.from(dst),
                                      marketKeys: List<String>.from(dm),
                                      bidOptionKeys: List<String>.from(dbo),
                                    ),
                                  );
                                },
                                style: FilledButton.styleFrom(
                                  backgroundColor: sheetAccent,
                                  foregroundColor:
                                      Theme.of(ctx).brightness == Brightness.dark
                                      ? const Color(0xFF1A1408)
                                      : Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: AppSpacing.buttonPaddingV,
                                    horizontal: AppSpacing.buttonPaddingH,
                                  ),
                                  minimumSize: const Size(0, AppSpacing.buttonMinHeight),
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  visualDensity: VisualDensity.compact,
                                ),
                                child: const Text('Apply'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );

    if (applied != null && mounted) {
      _applyFilters(applied);
    }
  }
}

class BetHistoryScreen extends StatelessWidget {
  const BetHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments;
    BetHistoryScope scope = BetHistoryScope.main;
    if (args is Map && args['scope'] != null) {
      final raw = args['scope'].toString();
      if (raw == 'starline') scope = BetHistoryScope.starline;
      if (raw == 'king-bazaar') scope = BetHistoryScope.kingBazaar;
    }
    final title = scope == BetHistoryScope.starline
        ? 'Starline Bet History'
        : scope == BetHistoryScope.kingBazaar
        ? 'King Bazaar Bet History'
        : 'Bet History';
    final wide = MediaQuery.sizeOf(context).width >= 720;
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = scope.headingColor(context);
    final backColor = isDark
        ? scope.accent(context).withValues(alpha: 0.85)
        : scheme.onSurfaceVariant;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 8, 8),
          child: Row(
            children: [
              IconButton(
                onPressed: () => popOrGoMyBets(context),
                icon: const Icon(Icons.arrow_back),
                color: backColor,
              ),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: wide ? 22 : 20,
                    fontWeight: FontWeight.bold,
                    color: titleColor,
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: BetHistoryView(scope: scope),
          ),
        ),
      ],
    );
  }
}

class GameBetHistoryScreen extends StatelessWidget {
  const GameBetHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 720;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 8, 8),
          child: Row(
            children: [
              IconButton(
                onPressed: () => popOrGoHome(context),
                icon: const Icon(Icons.arrow_back),
                color: AppColors.goldMuted,
              ),
              Expanded(
                child: Text(
                  'Game Bet History',
                  style: TextStyle(
                    fontSize: wide ? 22 : 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.gold,
                  ),
                ),
              ),
            ],
          ),
        ),
        const Expanded(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 12),
            child: GameBetHistoryView(),
          ),
        ),
      ],
    );
  }
}

class GameBetHistoryView extends StatefulWidget {
  const GameBetHistoryView({super.key});

  @override
  State<GameBetHistoryView> createState() => _GameBetHistoryViewState();
}

class _GameBetHistoryViewState extends State<GameBetHistoryView> {
  bool _loading = true;
  String? _userId;
  String _error = '';
  List<Map<String, dynamic>> _transactions = const [];
  String _typeFilter = 'all';
  String _gameFilter = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    final u = await AuthService.instance.getStoredUser();
    final uid = u?['_id']?.toString() ?? u?['id']?.toString();
    if (uid == null || uid.isEmpty) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _userId = null;
        _transactions = const [];
      });
      return;
    }

    final res = await WalletService.instance.fetchMyTransactions(
      limit: 500,
      includeBet: true,
    );
    if (!mounted) return;

    if (!res.success) {
      setState(() {
        _loading = false;
        _userId = uid;
        _transactions = const [];
        _error = res.message ?? 'Failed to load game transactions';
      });
      return;
    }

    final gameScoped = res.data.where(_isGameTransactionBase).toList();
    final scopedRefs = <String>{
      for (final tx in gameScoped)
        if ((tx['referenceId']?.toString().trim() ?? '').isNotEmpty)
          tx['referenceId'].toString().trim(),
    };
    final filtered = res.data.where((tx) {
      if (_isGameTransactionBase(tx)) return true;
      final ref = tx['referenceId']?.toString().trim() ?? '';
      return ref.isNotEmpty && scopedRefs.contains(ref);
    }).toList();
    setState(() {
      _loading = false;
      _userId = uid;
      _transactions = filtered;
      if (_gameFilter != 'all' &&
          !_availableGameCodes(filtered).contains(_gameFilter)) {
        _gameFilter = 'all';
      }
    });
  }

  bool _isGameTransactionBase(Map<String, dynamic> tx) {
    final gameCode = _extractGameCode(tx);
    if (gameCode.isNotEmpty) return true;

    final source = (tx['source'] ??
            tx['module'] ??
            tx['category'] ??
            tx['context'] ??
            tx['transactionFor'] ??
            tx['referenceType'] ??
            tx['entryType'])
        .toString()
        .toLowerCase()
        .trim();
    if (source.contains('game')) return true;

    final desc = (tx['description'] ?? '').toString().toLowerCase();
    if (desc.contains('game') || desc.contains('casino') || desc.contains('slot')) {
      return true;
    }
    final hasGameIds = (tx['gameId'] ?? tx['roundId'] ?? tx['providerRoundId']) != null;
    if (hasGameIds) return true;
    final bet = tx['bet'];
    if (bet is Map) {
      final keys = bet.keys.map((k) => k.toString().toLowerCase()).join('|');
      if (keys.contains('game')) return true;
    }
    return false;
  }

  String _extractGameCode(Map<String, dynamic> tx) {
    String read(dynamic v) => v?.toString().trim() ?? '';
    final bet = tx['bet'] is Map<String, dynamic>
        ? tx['bet'] as Map<String, dynamic>
        : (tx['bet'] is Map ? Map<String, dynamic>.from(tx['bet'] as Map) : null);
    final game = tx['game'] is Map<String, dynamic>
        ? tx['game'] as Map<String, dynamic>
        : (tx['game'] is Map ? Map<String, dynamic>.from(tx['game'] as Map) : null);

    final candidates = <String>[
      read(tx['gameCode']),
      read(tx['providerGameCode']),
      read(tx['externalGameCode']),
      read(game?['gameCode']),
      read(game?['providerGameCode']),
      read(game?['code']),
      read(bet?['gameCode']),
      read(bet?['providerGameCode']),
      read(bet?['code']),
    ].where((e) => e.isNotEmpty).toList();

    if (candidates.isNotEmpty) return candidates.first.toUpperCase();

    final desc = (tx['description'] ?? '').toString();
    final match = RegExp(
      r'(?:game\s*code|gameCode|providerGameCode)\s*[:=-]\s*([A-Za-z0-9_-]+)',
      caseSensitive: false,
    ).firstMatch(desc);
    if (match != null) {
      return (match.group(1) ?? '').toUpperCase();
    }

    final blob = [
      tx['description'],
      tx['source'],
      tx['module'],
      tx['category'],
      tx['context'],
      tx['transactionFor'],
      tx['referenceType'],
      tx['entryType'],
    ].map((v) => v?.toString().toLowerCase() ?? '').join(' ');
    if (blob.contains('aviator')) return 'AVIATOR';
    if (blob.contains('funtimer') || blob.contains('fun timer')) return 'FUNTIMER';
    if (blob.contains('roulette') || blob.contains('roullete')) return 'ROULETTE';
    return '';
  }

  String _normalizedGameKey(String code) {
    final c = code.trim().toUpperCase();
    if (c.isEmpty) return '';
    if (c.contains('AVIATOR')) return 'AVIATOR';
    if (c.contains('FUNTIMER') || c.contains('FUN TIMER')) return 'FUNTIMER';
    if (c.contains('ROULETTE') || c.contains('ROULLETE')) return 'ROULETTE';
    return c;
  }

  bool _matchesGameFilter(String code, String selected) {
    if (selected == 'all') return true;
    final c = code.trim().toUpperCase();
    final s = selected.trim().toUpperCase();
    if (c.isEmpty) return false;
    if (c == s) return true;

    final ck = _normalizedGameKey(c);
    final sk = _normalizedGameKey(s);
    if (ck.isNotEmpty && ck == sk) return true;

    return c.contains(s) || s.contains(c);
  }

  String _txTypeLabel(Map<String, dynamic> tx) {
    final t = (tx['type'] ?? '').toString().toLowerCase().trim();
    if (t == 'credit') return 'Credit';
    if (t == 'debit') return 'Debit';
    return t.isEmpty ? '-' : t[0].toUpperCase() + t.substring(1);
  }

  String _txTypeRaw(Map<String, dynamic> tx) =>
      (tx['type'] ?? '').toString().toLowerCase().trim();

  String _amountText(Map<String, dynamic> tx) {
    final amount =
        num.tryParse(tx['amount']?.toString() ?? '') ?? (tx['amount'] as num?) ?? 0;
    final type = (tx['type'] ?? '').toString().toLowerCase();
    final isCredit = type == 'credit';
    final sign = isCredit ? '+' : '-';
    return '$sign₹${NumberFormat('#,##0.00', 'en_IN').format(amount)}';
  }

  Color _amountColor(Map<String, dynamic> tx) {
    final isCredit = (tx['type'] ?? '').toString().toLowerCase() == 'credit';
    return isCredit ? Colors.green.shade700 : Colors.red.shade500;
  }

  String _txDateTime(Map<String, dynamic> tx) => formatTxTime(tx['createdAt']?.toString());

  String _txRef(Map<String, dynamic> tx) {
    final id = tx['referenceId']?.toString().trim();
    if (id != null && id.isNotEmpty) return id;
    final txId = tx['_id']?.toString().trim() ?? tx['id']?.toString().trim() ?? '';
    return txId.isEmpty ? '-' : txId;
  }

  String _gameNameForDescription(Map<String, dynamic> tx, String gameCode) {
    String read(dynamic v) => v?.toString().trim() ?? '';
    final bet = tx['bet'] is Map<String, dynamic>
        ? tx['bet'] as Map<String, dynamic>
        : (tx['bet'] is Map ? Map<String, dynamic>.from(tx['bet'] as Map) : null);
    final game = tx['game'] is Map<String, dynamic>
        ? tx['game'] as Map<String, dynamic>
        : (tx['game'] is Map ? Map<String, dynamic>.from(tx['game'] as Map) : null);

    final candidates = <String>[
      read(tx['gameName']),
      read(tx['providerGameName']),
      read(tx['externalGameName']),
      read(game?['name']),
      read(game?['gameName']),
      read(game?['title']),
      read(bet?['gameName']),
      read(bet?['name']),
      read(bet?['title']),
    ];
    for (final name in candidates) {
      if (name.isNotEmpty) return name;
    }

    final desc = (tx['description'] ?? '').toString();
    final match = RegExp(
      r'game\s*[:=-]\s*([A-Za-z0-9 _-]+)',
      caseSensitive: false,
    ).firstMatch(desc);
    final fromDesc = match?.group(1)?.trim() ?? '';
    if (fromDesc.isNotEmpty) return fromDesc;

    final blob = [
      tx['description'],
      tx['source'],
      tx['module'],
      tx['category'],
      tx['context'],
      tx['transactionFor'],
      tx['referenceType'],
      tx['entryType'],
    ].map((v) => v?.toString().toLowerCase() ?? '').join(' ');
    if (blob.contains('aviator')) return 'Aviator';
    if (blob.contains('funtimer') || blob.contains('fun timer')) return 'Funtimer';
    if (blob.contains('roulette') || blob.contains('roullete')) return 'Roulette';

    if (gameCode.isNotEmpty) return gameCode;
    return '-';
  }

  String _roundKey(Map<String, dynamic> tx) {
    String read(dynamic v) => v?.toString().trim() ?? '';
    final bet = tx['bet'] is Map<String, dynamic>
        ? tx['bet'] as Map<String, dynamic>
        : (tx['bet'] is Map ? Map<String, dynamic>.from(tx['bet'] as Map) : null);
    final candidates = <String>[
      read(tx['roundId']),
      read(tx['providerRoundId']),
      read(tx['gameRoundId']),
      read(bet?['roundId']),
      read(bet?['providerRoundId']),
      read(tx['referenceId']),
      read(tx['_id']),
      read(tx['id']),
    ];
    for (final v in candidates) {
      if (v.isNotEmpty) return v;
    }
    return '-';
  }

  num _txAmount(Map<String, dynamic> tx) =>
      num.tryParse(tx['amount']?.toString() ?? '') ?? (tx['amount'] as num?) ?? 0;

  String _currency(num value) =>
      '₹${NumberFormat('#,##0.00', 'en_IN').format(value)}';

  ({num credited, num debited}) _roundTotals(List<Map<String, dynamic>> txs) {
    var credited = 0.0;
    var debited = 0.0;
    for (final tx in txs) {
      final amount = _txAmount(tx).toDouble();
      final type = _txTypeRaw(tx);
      if (type == 'credit') credited += amount;
      if (type == 'debit') debited += amount;
    }
    return (credited: credited, debited: debited);
  }

  String _roundOutcome(String gameCode, num credited, num debited) {
    final g = gameCode.toUpperCase();
    final isAviator = g.contains('AVIATOR');
    final isFunTimer = g.contains('FUNTIMER');
    final isRoulette = g.contains('ROULETTE') || g.contains('ROULLETE');

    if (isAviator) {
      if (credited > debited) return 'Won';
      if (debited > credited) return 'Lost';
      return 'Pending';
    }
    if (isFunTimer || isRoulette) {
      if (credited > 0) return 'Won';
      if (debited > 0) return 'Lost';
      return 'Pending';
    }
    if (credited > debited) return 'Won';
    if (debited > credited) return 'Lost';
    return 'Pending';
  }

  Color _outcomeColor(String outcome) {
    if (outcome == 'Won') return Colors.green.shade700;
    if (outcome == 'Lost') return Colors.red.shade500;
    return AppColors.goldMuted.withValues(alpha: 0.95);
  }

  Widget _cell(String label, String value, {Color? valueColor, bool copyable = false}) {
    final canCopy =
        copyable && value.trim().isNotEmpty && value.trim() != '-';
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: AppColors.goldMuted.withValues(alpha: 0.9),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  value,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    color: valueColor ?? _histLightGold,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (canCopy)
                IconButton(
                  tooltip: 'Copy Round ID',
                  padding: EdgeInsets.zero,
                  visualDensity: VisualDensity.compact,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  icon: Icon(
                    Icons.copy_rounded,
                    size: 18,
                    color: AppColors.gold.withValues(alpha: 0.9),
                  ),
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: value.trim()));
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Round ID copied'),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                ),
            ],
          ),
        ],
      ),
    );
  }

  List<String> _availableGameCodes([List<Map<String, dynamic>>? from]) {
    final source = from ?? _transactions;
    final out = <String>{};
    for (final tx in source) {
      final code = _extractGameCode(tx);
      if (code.isNotEmpty) out.add(code);
    }
    final list = out.toList()..sort();
    return list;
  }

  List<Map<String, dynamic>> get _visibleTransactions {
    return _transactions.where((tx) {
      final rawType = _txTypeRaw(tx);
      if (_typeFilter != 'all' && rawType != _typeFilter) return false;
      if (_gameFilter != 'all' &&
          !_matchesGameFilter(_extractGameCode(tx), _gameFilter)) {
        return false;
      }
      return true;
    }).toList();
  }

  List<Map<String, dynamic>> get _visibleRoundGroups {
    final grouped = <String, List<Map<String, dynamic>>>{};
    for (final tx in _transactions) {
      final key = _roundKey(tx);
      grouped.putIfAbsent(key, () => <Map<String, dynamic>>[]).add(tx);
    }

    final out = grouped.entries.map((entry) {
      final txs = entry.value;
      final totals = _roundTotals(txs);
      txs.sort((a, b) {
        final ad = DateTime.tryParse(a['createdAt']?.toString() ?? '');
        final bd = DateTime.tryParse(b['createdAt']?.toString() ?? '');
        if (ad == null && bd == null) return 0;
        if (ad == null) return 1;
        if (bd == null) return -1;
        return bd.compareTo(ad);
      });
      final latest = txs.first;
      final gameCode = txs
          .map(_extractGameCode)
          .firstWhere((code) => code.isNotEmpty, orElse: () => '');
      final outcome = _roundOutcome(gameCode, totals.credited, totals.debited);
      final gameMatched = _matchesGameFilter(gameCode, _gameFilter);
      final typeMatched = _typeFilter == 'all'
          ? true
          : txs.any((tx) => _txTypeRaw(tx) == _typeFilter);
      return <String, dynamic>{
        'roundKey': entry.key,
        'transactions': txs,
        'latest': latest,
        'gameCode': gameCode,
        'credited': totals.credited,
        'debited': totals.debited,
        'outcome': outcome,
        'gameMatched': gameMatched,
        'typeMatched': typeMatched,
      };
    }).where((round) {
      return round['typeMatched'] == true && round['gameMatched'] == true;
    }).toList();

    out.sort((a, b) {
      final ad = DateTime.tryParse(a['latest']?['createdAt']?.toString() ?? '');
      final bd = DateTime.tryParse(b['latest']?['createdAt']?.toString() ?? '');
      if (ad == null && bd == null) return 0;
      if (ad == null) return 1;
      if (bd == null) return -1;
      return bd.compareTo(ad);
    });
    return out;
  }

  Widget _filters() {
    final gameCodes = _availableGameCodes();
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.25)),
        color: Colors.white.withValues(alpha: 0.02),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _typeFilter,
                  decoration: const InputDecoration(
                    labelText: 'Filter by Type',
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('All')),
                    DropdownMenuItem(value: 'credit', child: Text('Credit')),
                    DropdownMenuItem(value: 'debit', child: Text('Debit')),
                  ],
                  onChanged: (value) => setState(() => _typeFilter = value ?? 'all'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _gameFilter,
                  decoration: const InputDecoration(
                    labelText: 'Filter by Game',
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    const DropdownMenuItem(value: 'all', child: Text('All Games')),
                    ...gameCodes.map(
                      (code) => DropdownMenuItem(value: code, child: Text(code)),
                    ),
                  ],
                  onChanged: (value) => setState(() => _gameFilter = value ?? 'all'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(10),
          child: CircularProgressIndicator(color: AppColors.gold),
        ),
      );
    }

    if (_userId == null) {
      return Center(
        child: Text(
          'Please login to see your game transactions.',
          style: TextStyle(
            color: AppColors.goldMuted.withValues(alpha: 0.92),
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    if (_error.isNotEmpty && _transactions.isEmpty) {
      return Center(
        child: Text(
          _error,
          style: TextStyle(
            color: Colors.red.shade300,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    if (_transactions.isEmpty) {
      return Center(
        child: Text(
          'No game transactions found.',
          style: TextStyle(
            color: AppColors.goldMuted.withValues(alpha: 0.92),
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    final roundGroups = _visibleRoundGroups;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 88),
        children: [
          _filters(),
          const SizedBox(height: 8),
          if (roundGroups.isEmpty)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Center(
                child: Text(
                  'No transactions found for selected filters.',
                  style: TextStyle(
                    color: AppColors.goldMuted.withValues(alpha: 0.92),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            )
          else
            ...roundGroups.map((round) {
          final latest = Map<String, dynamic>.from(round['latest'] as Map);
          final gameCode = (round['gameCode'] ?? '').toString();
          final roundKey = (round['roundKey'] ?? '-').toString();
          final credited = round['credited'] as num? ?? 0;
          final debited = round['debited'] as num? ?? 0;
          final outcome = (round['outcome'] ?? 'Pending').toString();
          final count = (round['transactions'] as List).length;
          final dateTime = _txDateTime(latest);
          final gameName = _gameNameForDescription(latest, gameCode);

              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Card(
                  color: Colors.transparent,
                  elevation: 0,
                  shadowColor: Colors.transparent,
                  surfaceTintColor: Colors.transparent,
                  shape: _historyCardShape(context),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Game Round',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.gold.withValues(alpha: 0.98),
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ),
                            Text(
                              outcome,
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                                color: _outcomeColor(outcome),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            _cell('Game Code', gameCode.isEmpty ? '-' : gameCode),
                            const SizedBox(width: 12),
                            _cell('Round ID', roundKey, copyable: true),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            _cell('Debited', _currency(debited), valueColor: Colors.red.shade500),
                            const SizedBox(width: 12),
                            _cell('Credited', _currency(credited), valueColor: Colors.green.shade700),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            _cell('Transactions', '$count'),
                            const SizedBox(width: 12),
                            _cell('Last Update', dateTime),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            _cell(
                              'Outcome',
                              outcome,
                              valueColor: _outcomeColor(outcome),
                            ),
                            const SizedBox(width: 12),
                            _cell('Description', 'Game: $gameName'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

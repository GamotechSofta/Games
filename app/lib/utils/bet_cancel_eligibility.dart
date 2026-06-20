import 'market_timing.dart';

/// Result of cancel rules — [Games/frontend/src/pages/BetHistory.jsx] `canCancelBet`.
class BetCancelCheck {
  const BetCancelCheck({required this.canCancel, this.reason = ''});

  final bool canCancel;
  final String reason;
}

BetCancelCheck canCancelBet(Map<String, dynamic>? bet) {
  if (bet == null) {
    return const BetCancelCheck(canCancel: false, reason: 'Invalid bet');
  }
  final status = (bet['status'] ?? '').toString().toLowerCase();
  if (status != 'pending') {
    return BetCancelCheck(canCancel: false, reason: 'Status: $status');
  }

  final createdRaw = bet['createdAt']?.toString();
  final placed = DateTime.tryParse(createdRaw ?? '');
  if (placed == null) {
    return const BetCancelCheck(canCancel: false, reason: 'Invalid bet time');
  }
  final minutesSincePlaced = DateTime.now().difference(placed).inMinutes;
  if (minutesSincePlaced > 30) {
    return const BetCancelCheck(
      canCancel: false,
      reason: 'Can only cancel within 30 minutes of placing',
    );
  }

  final market = _marketMap(bet['marketId']);
  if (market == null) {
    return const BetCancelCheck(canCancel: false, reason: 'Market not found');
  }

  final closeStr = (market['closingTime'] ?? '').toString().trim();
  if (closeStr.isEmpty) {
    return const BetCancelCheck(
      canCancel: false,
      reason: 'Market timing not configured',
    );
  }

  final window = _marketOpenCloseMs(market);
  if (window == null) {
    return const BetCancelCheck(
      canCancel: false,
      reason: 'Market timing not configured',
    );
  }

  final minutesUntilClose =
      (window.closeAt - DateTime.now().millisecondsSinceEpoch) / 1000 / 60;
  if (minutesUntilClose < 30) {
    return const BetCancelCheck(
      canCancel: false,
      reason: 'Cannot cancel within 30 minutes of market closing',
    );
  }

  return const BetCancelCheck(canCancel: true);
}

Map<String, dynamic>? _marketMap(dynamic raw) {
  if (raw is Map<String, dynamic>) return raw;
  if (raw is Map) return Map<String, dynamic>.from(raw);
  return null;
}

/// Exposed for cancel checks (same logic as [market_timing.dart] private helper).
({int openAt, int closeAt})? _marketOpenCloseMs(Map<String, dynamic> market) {
  final closeStr = (market['closingTime'] ?? '').toString().trim();
  if (closeStr.isEmpty) return null;
  final todayIst = getTodayIst();
  final startStr = (market['startingTime'] ?? '').toString().trim();

  String normalize(String timeStr) {
    final parts = timeStr.split(':');
    final h = int.tryParse(parts.isNotEmpty ? parts[0] : '0') ?? 0;
    final m = int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0;
    final s = int.tryParse(parts.length > 2 ? parts[2] : '0') ?? 0;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  int? parseMs(String iso) => DateTime.tryParse(iso)?.millisecondsSinceEpoch;

  final openIso = startStr.isNotEmpty
      ? '${todayIst}T${normalize(startStr)}+05:30'
      : '${todayIst}T00:00:00+05:30';
  var closeIso = '${todayIst}T${normalize(closeStr)}+05:30';
  var openAt = parseMs(openIso);
  var closeAt = parseMs(closeIso);
  if (openAt == null || closeAt == null) return null;
  if (closeAt <= openAt) {
    final noonIst = DateTime.parse('${todayIst}T12:00:00+05:30');
    final nextDay = noonIst.add(const Duration(days: 1));
    final nextDayStr = getTodayIstFromUtc(nextDay.toUtc());
    closeAt = parseMs('${nextDayStr}T${normalize(closeStr)}+05:30');
    if (closeAt == null) return null;
  }
  return (openAt: openAt, closeAt: closeAt);
}

String getTodayIstFromUtc(DateTime utc) {
  final i = utc.add(const Duration(hours: 5, minutes: 30));
  return '${i.year.toString().padLeft(4, '0')}-'
      '${i.month.toString().padLeft(2, '0')}-'
      '${i.day.toString().padLeft(2, '0')}';
}

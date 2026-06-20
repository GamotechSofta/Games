import 'market_timing.dart';

/// 12-hour time label (e.g. `11:00 am`) — matches frontend `formatTime12`.
String formatTime12(String? time24) {
  if (time24 == null || time24.isEmpty) return '';
  final parts = time24.split(':');
  final hour = int.tryParse(parts.isNotEmpty ? parts[0] : '0') ?? 0;
  final minutes = parts.length > 1 ? parts[1].padLeft(2, '0') : '00';
  final ampm = hour >= 12 ? 'pm' : 'am';
  final h12 = hour % 12 == 0 ? 12 : hour % 12;
  return '$h12:$minutes $ampm';
}

String _addDaysIst(String yyyyMmDd, int days) {
  final base = DateTime.parse('${yyyyMmDd}T12:00:00+05:30');
  return getTodayIstFromUtc(base.add(Duration(days: days)).toUtc());
}

String getTodayIstFromUtc(DateTime utc) {
  const offset = Duration(hours: 5, minutes: 30);
  final i = utc.add(offset);
  return '${i.year.toString().padLeft(4, '0')}-'
      '${i.month.toString().padLeft(2, '0')}-'
      '${i.day.toString().padLeft(2, '0')}';
}

int? _todayTargetMsIst(String? timeHHMM, int nowMs) {
  final t = (timeHHMM ?? '').toString().trim();
  if (t.length < 4) return null;
  final hhmm = t.length >= 5 ? t.substring(0, 5) : t;
  if (!RegExp(r'^\d{2}:\d{2}$').hasMatch(hhmm)) return null;
  final todayIst = getTodayIst();
  final dateStr = hhmm == '00:00' ? _addDaysIst(todayIst, 1) : todayIst;
  return DateTime.tryParse('${dateStr}T$hhmm:00+05:30')?.millisecondsSinceEpoch;
}

/// True when the slot's [startingTime] has passed today in IST (Starline / King Bazaar).
bool isSlotClosedTodayIst(String? startingTime, [DateTime? now]) {
  final nowMs = (now ?? DateTime.now()).millisecondsSinceEpoch;
  final target = _todayTargetMsIst(startingTime, nowMs);
  if (target == null) return true;
  return nowMs >= target;
}

int _sumDigits(String s) {
  var acc = 0;
  for (final c in s.split('')) {
    acc += int.tryParse(c) ?? 0;
  }
  return acc;
}

String starlineResultPill(String? openingNumber) {
  final open = openingNumber?.toString().trim() ?? '';
  final hasOpen = RegExp(r'^\d{3}$').hasMatch(open);
  final open3 = hasOpen ? open : '***';
  final digit = hasOpen ? '${_sumDigits(open) % 10}' : '*';
  return '$open3 - $digit';
}

/// King Bazaar jodi display — `"65"` → `"6 5"`, placeholders → `"* *"`.
String formatKingBazaarJodi(String? jodi) {
  final s = (jodi ?? '').toString().trim();
  if (s.isEmpty ||
      s == '**' ||
      s == '*-*' ||
      s == '***-**-***' ||
      RegExp(r'^[\*\-\s]+$').hasMatch(s)) {
    return '* *';
  }
  if (s.length == 2 && RegExp(r'^\d{2}$').hasMatch(s)) {
    return s.split('').join(' ');
  }
  final partial = RegExp(r'^(\d|\*)\s*[-–]\s*(\d|\*)$').firstMatch(s);
  if (partial != null) {
    return '${partial.group(1)} ${partial.group(2)}';
  }
  return '* *';
}

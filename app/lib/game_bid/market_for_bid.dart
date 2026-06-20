import '../utils/market_timing.dart';

bool isThreeDigits(dynamic v) {
  if (v == null) return false;
  return RegExp(r'^\d{3}$').hasMatch(v.toString().trim());
}

/// UI status string like React [Section1] `getMarketStatus`.
String computeMarketUiStatus(Map<String, dynamic> market) {
  if (isPastClosingTime(market)) return 'closed';
  if (isThreeDigits(market['openingNumber']) && isThreeDigits(market['closingNumber'])) {
    return 'closed';
  }
  if (isThreeDigits(market['openingNumber']) && !isThreeDigits(market['closingNumber'])) {
    return 'running';
  }
  return 'open';
}

String? _marketIdString(dynamic v) {
  if (v == null) return null;
  if (v is String) {
    final s = v.trim();
    return s.isEmpty ? null : s;
  }
  if (v is Map && v[r'$oid'] != null) return v[r'$oid'].toString().trim();
  final s = v.toString().trim();
  return s.isEmpty ? null : s;
}

/// Ensures [gameName], [status], [id] exist for bid flows.
Map<String, dynamic> normalizeMarketForBid(Map<String, dynamic> raw) {
  final m = Map<String, dynamic>.from(raw);
  m['gameName'] = (m['gameName'] ?? m['marketName'] ?? '').toString();
  m['status'] = computeMarketUiStatus(m);
  final id = _marketIdString(m['id']) ??
      _marketIdString(m['_id']) ??
      _marketIdString(m['marketId']);
  if (id != null) {
    m['id'] = id;
    m['_id'] = id;
  }
  return m;
}

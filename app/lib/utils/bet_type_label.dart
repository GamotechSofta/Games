/// Stable keys for bet-history filters — [Games/frontend/src/utils/betTypeLabels.js].
const bidOptionFilterOrder = <String>[
  'single',
  'jodi',
  'single-pana',
  'double-pana',
  'triple-pana',
  'half-sangam-open',
  'half-sangam-close',
  'half-sangam',
  'full-sangam',
  'sp-common',
  'dp-common',
  'cp-common',
  'sp-motor',
  'dp-motor',
  'sp-dp-motor',
  'sp-dp-motor-dp',
  'sp-dp-motor-tp',
  'odd-even',
  'chart-game',
];

String _inferPannaVariant(String? betNumber) {
  final s = (betNumber ?? '').trim();
  if (!RegExp(r'^\d{3}$').hasMatch(s)) return 'single';
  final a = s[0], b = s[1], c = s[2];
  if (a == b && b == c) return 'triple';
  if (a == b || b == c || a == c) return 'double';
  return 'single';
}

String? _inferHalfSangamVariant(String? betNumber) {
  final s = (betNumber ?? '').trim();
  if (!s.contains('-')) return null;
  final parts = s.split('-').map((x) => x.trim()).toList();
  if (parts.length < 2) return null;
  final a = parts[0];
  final b = parts[1];
  if (RegExp(r'^\d{3}$').hasMatch(a) && RegExp(r'^\d$').hasMatch(b)) {
    return 'open';
  }
  if (RegExp(r'^\d$').hasMatch(a) && RegExp(r'^\d{3}$').hasMatch(b)) {
    return 'close';
  }
  return null;
}

String getBidOptionKey(String? betType, String? betNumber) {
  final key = (betType ?? '').trim().toLowerCase();
  if (key == 'panna') {
    final v = _inferPannaVariant(betNumber);
    if (v == 'triple') return 'triple-pana';
    if (v == 'double') return 'double-pana';
    return 'single-pana';
  }
  if (key == 'half-sangam') {
    final v = _inferHalfSangamVariant(betNumber);
    if (v == 'open') return 'half-sangam-open';
    if (v == 'close') return 'half-sangam-close';
    return 'half-sangam';
  }
  return key.isEmpty ? 'unknown' : key;
}

/// Human-readable game labels for API [betType] — aligned with bid option names.
String betTypeDisplayLabel(String? betType, [String? betNumber]) {
  final t = (betType ?? '').trim().toLowerCase();
  switch (t) {
    case 'single':
      return 'Single Digit';
    case 'jodi':
      return 'Jodi';
    case 'panna':
      return _pannaLabel(betNumber);
    case 'half-sangam':
      return 'Half Sangam';
    case 'full-sangam':
      return 'Full Sangam';
    case 'sp-common':
      return 'SP Common';
    case 'dp-common':
      return 'DP Common';
    case 'cp-common':
      return 'CP';
    case 'sp-motor':
      return 'SP Motor';
    case 'dp-motor':
      return 'DP Motor';
    case 'sp-dp-motor':
      return 'SP DP Motor';
    case 'sp-dp-motor-dp':
      return 'SP DP Motor';
    case 'sp-dp-motor-tp':
      return 'SP DP T Motor';
    case 'odd-even':
      return 'Odd Even';
    case 'chart-game':
      return 'Chart Game';
    default:
      if (t.isEmpty) return 'Bet';
      return t
          .split('-')
          .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
          .join(' ');
  }
}

String _pannaLabel(String? betNumber) {
  final n = (betNumber ?? '').trim();
  if (n.length == 3) {
    final a = n.split('');
    if (a[0] == a[1] && a[1] == a[2]) return 'Triple Pana';
    if (a[0] == a[1] || a[1] == a[2] || a[0] == a[2]) return 'Double Pana';
    return 'Single Pana';
  }
  return 'Pana';
}

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

/// Public markets list — [frontend/src/components/Section1.jsx].
class MarketsService {
  MarketsService._();
  static final MarketsService instance = MarketsService._();

  /// Home markets — same as frontend `GET /markets/get-markets?marketType=main&fields=home`.
  Future<List<Map<String, dynamic>>> fetchMarkets({int? limit}) async {
    final uri = Uri.parse('$kApiBaseUrl/markets/get-markets').replace(
      queryParameters: {
        'marketType': 'main',
        'fields': 'home',
        if (limit != null) 'limit': '$limit',
      },
    );
    final res = await http.get(uri);
    Map<String, dynamic>? data;
    try {
      data = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {
      return [];
    }
    if (data?['success'] != true) return [];
    final list = data?['data'];
    if (list is! List) return [];
    return list
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  /// Markets where API sets `showInPopular: true` (Popular Markets section).
  static bool isShowInPopular(Map<String, dynamic> market) {
    final v = market['showInPopular'];
    if (v == true) return true;
    if (v == 1) return true;
    return v?.toString().toLowerCase() == 'true';
  }

  Future<List<Map<String, dynamic>>> fetchPopularMarkets() async {
    final uri = Uri.parse('$kApiBaseUrl/markets/get-markets').replace(
      queryParameters: const {
        'marketType': 'main',
        'fields': 'home',
        'popularOnly': 'true',
      },
    );
    final res = await http.get(uri);
    Map<String, dynamic>? data;
    try {
      data = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {
      return [];
    }
    if (data?['success'] != true) return [];
    final list = data?['data'];
    if (list is! List) return [];
    return list
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  static String marketId(Map<String, dynamic> market) {
    final id = market['_id'] ?? market['id'];
    return id?.toString() ?? '';
  }

  /// All main markets plus any popular-only entries missing from the main list.
  Future<List<Map<String, dynamic>>> fetchAllMarketsWithPopular() async {
    final results = await Future.wait([
      fetchMarkets(),
      fetchPopularMarkets(),
    ]);
    final all = results[0];
    final popular = results[1];
    final byId = <String, Map<String, dynamic>>{};
    for (final m in all) {
      final id = marketId(m);
      if (id.isNotEmpty) byId[id] = m;
    }
    for (final m in popular) {
      final id = marketId(m);
      if (id.isNotEmpty) byId.putIfAbsent(id, () => m);
    }
    final merged = byId.values.toList();
    merged.sort((a, b) {
      final ap = isShowInPopular(a) ? 0 : 1;
      final bp = isShowInPopular(b) ? 0 : 1;
      return ap.compareTo(bp);
    });
    return merged;
  }

  /// `GET /markets/result-history?date=YYYY-MM-DD` — [MarketResultHistory.jsx].
  Future<List<Map<String, dynamic>>> fetchResultHistory(String dateYmd) async {
    final uri = Uri.parse('$kApiBaseUrl/markets/result-history').replace(
      queryParameters: {'date': dateYmd},
    );
    final res = await http.get(uri);
    Map<String, dynamic>? data;
    try {
      data = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {
      return [];
    }
    if (data?['success'] != true) return [];
    final list = data?['data'];
    if (list is! List) return [];
    return list
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }
}

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

class MarketGroup {
  const MarketGroup({required this.key, required this.label});

  final String key;
  final String label;

  factory MarketGroup.fromJson(Map<String, dynamic> json) {
    return MarketGroup(
      key: (json['key'] ?? json['id'] ?? '').toString().trim().toLowerCase(),
      label: (json['label'] ?? json['name'] ?? json['marketName'] ?? '')
          .toString()
          .trim(),
    );
  }
}

/// Starline / King Bazaar groups and time slots — mirrors frontend hooks.
class SpecialMarketsService {
  SpecialMarketsService._();
  static final SpecialMarketsService instance = SpecialMarketsService._();

  Future<List<MarketGroup>> fetchGroups({required bool isKing}) async {
    final path = isKing ? 'king-bazaar-groups' : 'starline-groups';
    final uri = Uri.parse('$kApiBaseUrl/markets/$path');
    final res = await http.get(uri);
    Map<String, dynamic>? data;
    try {
      data = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {
      return [];
    }
    if (res.statusCode < 200 ||
        res.statusCode >= 300 ||
        data?['success'] != true) {
      return [];
    }
    final list = data?['data'];
    if (list is! List) return [];
    return list
        .whereType<Map>()
        .map((e) => MarketGroup.fromJson(Map<String, dynamic>.from(e)))
        .where((g) => g.key.isNotEmpty)
        .toList();
  }

  Future<List<Map<String, dynamic>>> fetchSlots({
    required String marketType,
    required String groupKey,
    String marketLabel = '',
  }) async {
    final group = groupKey.trim().toLowerCase();
    final params = <String, String>{
      'marketType': marketType,
      'fields': 'home',
    };
    if (marketType == 'startline' && group.isNotEmpty) {
      params['starlineGroup'] = group;
    }
    if (marketType == 'king' && group.isNotEmpty) {
      params['kingBazaarGroup'] = group;
    }
    final uri = Uri.parse('$kApiBaseUrl/markets/get-markets')
        .replace(queryParameters: params);
    final res = await http.get(uri);
    Map<String, dynamic>? data;
    try {
      data = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {
      return _kingDemoSlotsIfNeeded(marketType, group, marketLabel);
    }
    if (data?['success'] != true) {
      return _kingDemoSlotsIfNeeded(marketType, group, marketLabel);
    }
    final list = data?['data'];
    if (list is! List) {
      return _kingDemoSlotsIfNeeded(marketType, group, marketLabel);
    }
    final mapped = list
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    mapped.sort(
      (a, b) => (a['startingTime'] ?? '')
          .toString()
          .compareTo((b['startingTime'] ?? '').toString()),
    );
    if (marketType == 'king' && mapped.isEmpty && group.isNotEmpty) {
      return _buildKingDemoSlots(marketLabel);
    }
    return mapped;
  }

  List<Map<String, dynamic>> _kingDemoSlotsIfNeeded(
    String marketType,
    String group,
    String marketLabel,
  ) {
    if (marketType == 'king' && group.isNotEmpty) {
      return _buildKingDemoSlots(marketLabel);
    }
    return [];
  }

  static const _kingDemoTimes = [
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
    '21:00',
    '22:00',
    '23:00',
    '00:00',
  ];

  List<Map<String, dynamic>> _buildKingDemoSlots(String marketLabel) {
    return _kingDemoTimes
        .map(
          (time) => {
            '_id': 'king-demo-$time',
            'marketName': marketLabel.isEmpty ? 'King Bazaar' : marketLabel,
            'gameName': marketLabel.isEmpty ? 'King Bazaar' : marketLabel,
            'startingTime': time,
            'closingTime': time,
            'openingNumber': null,
            'closingNumber': null,
            'displayResult': '***-**-***',
            'status': 'open',
            'marketType': 'king',
          },
        )
        .toList();
  }
}

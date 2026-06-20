import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/api_config.dart';
import '../../services/auth_service.dart';
import '../../services/payments_service.dart';
import '../../theme/casino_ui.dart';
import 'funds_shared_widgets.dart';

/// Deposit history — [Games/frontend/src/pages/funds/AddFundHistory.jsx].
class AddFundHistoryTab extends StatefulWidget {
  const AddFundHistoryTab({super.key});

  @override
  State<AddFundHistoryTab> createState() => _AddFundHistoryTabState();
}

class _AddFundHistoryTabState extends State<AddFundHistoryTab> {
  List<Map<String, dynamic>> _items = [];
  String _filter = 'all';
  bool _loading = true;
  String? _error;

  int _count(String status) =>
      _items.where((d) => (d['status']?.toString() ?? '') == status).length;

  num get _totalApproved => _items
      .where((d) => d['status'] == 'approved')
      .fold<num>(0, (s, d) => s + (num.tryParse(d['amount']?.toString() ?? '') ?? 0));

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final r = await PaymentsService.instance.fetchMyDeposits();
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (r.success) {
        _items = r.data;
        _error = null;
      } else {
        _items = [];
        _error = r.message ?? 'Failed to load deposit history';
      }
    });
  }

  Future<void> _openShot(String? url) async {
    if (url == null || url.isEmpty) return;
    final uid = AuthService.storedUserId(await AuthService.instance.getStoredUser());
    var full = url;
    if (!url.startsWith('http')) {
      final base = kApiBaseUrl.replaceAll(RegExp(r'/api/v1/?$'), '');
      full = '$base${url.startsWith('/') ? '' : '/'}$url${uid != null ? '?userId=$uid' : ''}';
    }
    final uri = Uri.tryParse(full);
    if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  String? _rejectedReason(Map<String, dynamic> d) {
    for (final key in [
      'rejectedReason',
      'rejectionReason',
      'reason',
      'adminRemark',
      'adminRemarks',
      'remark',
      'remarks',
      'message',
    ]) {
      final txt = d[key]?.toString().trim();
      if (txt != null && txt.isNotEmpty && txt.toLowerCase() != 'null') return txt;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _items.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: CasinoUi.fundsGold));
    }

    final filtered =
        _filter == 'all' ? _items : _items.where((d) => d['status'] == _filter).toList();

    return RefreshIndicator(
      color: CasinoUi.fundsGold,
      onRefresh: _load,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.only(bottom: 10),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      _error!,
                      style: TextStyle(color: Colors.red.shade300, fontSize: 13),
                    ),
                  ),
                FundsHistoryTotalBanner(
                  label: 'Total added funds',
                  amount: _totalApproved,
                  gradientColors: [
                    Colors.green.withValues(alpha: 0.35),
                    Colors.green.shade800.withValues(alpha: 0.25),
                  ],
                  borderColor: Colors.green,
                ),
                const SizedBox(height: 10),
                FundsHistoryFilterGrid(
                  selected: _filter,
                  onSelected: (k) => setState(() => _filter = k),
                  options: [
                    FundsHistoryFilterOption(
                      key: 'all',
                      label: 'Total',
                      count: _items.length,
                      activeColor: const Color(0xFF2563EB),
                    ),
                    FundsHistoryFilterOption(
                      key: 'pending',
                      label: 'Pending',
                      count: _count('pending'),
                      activeColor: Colors.amber,
                      valueColor: Colors.amber.shade400,
                    ),
                    FundsHistoryFilterOption(
                      key: 'approved',
                      label: 'Approved',
                      count: _count('approved'),
                      activeColor: Colors.green,
                      valueColor: Colors.green.shade400,
                    ),
                    FundsHistoryFilterOption(
                      key: 'rejected',
                      label: 'Rejected',
                      count: _count('rejected'),
                      activeColor: Colors.red,
                      valueColor: Colors.red.shade400,
                    ),
                  ],
                ),
              ]),
            ),
          ),
          if (filtered.isEmpty)
            SliverFillRemaining(
              child: FundsEmptyHistoryState(
                message: 'No deposit history found',
                onViewAll: _filter != 'all' ? () => setState(() => _filter = 'all') : null,
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.only(bottom: 16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                  childAspectRatio: 0.92,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, i) => _depositCard(filtered[i]),
                  childCount: filtered.length,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _depositCard(Map<String, dynamic> d) {
    final st = d['status']?.toString() ?? '';
    final amount = num.tryParse(d['amount']?.toString() ?? '') ?? 0;
    final reason = _rejectedReason(d);

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: CasinoUi.fundsCardFill(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: CasinoUi.fundsCardBorder(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              fundsStatusIcon(st),
              const Spacer(),
              FundsStatusBadge(status: st),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '₹${NumberFormat.decimalPattern('en_IN').format(amount)}',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 15,
              color: CasinoUi.fundsText(context),
            ),
          ),
          Text(
            formatFundsDate(d['createdAt']),
            style: TextStyle(color: CasinoUi.fundsMuted(context, 0.8), fontSize: 10),
          ),
          if (d['upiTransactionId'] != null && d['upiTransactionId'].toString().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'UTR: ${d['upiTransactionId']}',
              style: TextStyle(color: CasinoUi.fundsMuted(context, 0.75), fontSize: 9),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          if (st == 'rejected' && reason != null) ...[
            const SizedBox(height: 4),
            Text(
              reason,
              style: TextStyle(color: Colors.red.shade300, fontSize: 9),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          if (d['screenshotUrl'] != null) ...[
            const Spacer(),
            TextButton(
              onPressed: () => _openShot(d['screenshotUrl']?.toString()),
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text('View screenshot', style: TextStyle(fontSize: 10)),
            ),
          ],
        ],
      ),
    );
  }
}

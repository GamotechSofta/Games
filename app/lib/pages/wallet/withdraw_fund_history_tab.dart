import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/payments_service.dart';
import '../../theme/casino_ui.dart';
import 'funds_shared_widgets.dart';

/// Withdrawal history — [Games/frontend/src/pages/funds/WithdrawFundHistory.jsx].
class WithdrawFundHistoryTab extends StatefulWidget {
  const WithdrawFundHistoryTab({super.key});

  @override
  State<WithdrawFundHistoryTab> createState() => _WithdrawFundHistoryTabState();
}

class _WithdrawFundHistoryTabState extends State<WithdrawFundHistoryTab> {
  List<Map<String, dynamic>> _items = [];
  String _filter = 'all';
  bool _loading = true;

  int _count(String status) =>
      _items.where((w) => (w['status']?.toString() ?? '') == status).length;

  num get _totalApproved => _items
      .where((w) => w['status'] == 'approved')
      .fold<num>(0, (s, w) => s + (num.tryParse(w['amount']?.toString() ?? '') ?? 0));

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final r = await PaymentsService.instance.fetchMyWithdrawals();
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (r.success) _items = r.data;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _items.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: CasinoUi.fundsGold));
    }

    final filtered =
        _filter == 'all' ? _items : _items.where((w) => w['status'] == _filter).toList();

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
                FundsHistoryTotalBanner(
                  label: 'Total withdrawn',
                  amount: _totalApproved,
                  gradientColors: [
                    Colors.purple.withValues(alpha: 0.35),
                    Colors.purple.shade800.withValues(alpha: 0.25),
                  ],
                  borderColor: Colors.purple,
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
                message: 'No withdrawal history found',
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
                  (context, i) => _withdrawCard(filtered[i]),
                  childCount: filtered.length,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _withdrawCard(Map<String, dynamic> w) {
    final st = w['status']?.toString() ?? '';
    final amount = num.tryParse(w['amount']?.toString() ?? '') ?? 0;
    final bank = w['bankDetailId'];
    String? bankLine;
    if (bank is Map) {
      bankLine = bank['accountHolderName']?.toString();
    }

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
            formatFundsDate(w['createdAt']),
            style: TextStyle(color: CasinoUi.fundsMuted(context, 0.8), fontSize: 10),
          ),
          if (bankLine != null) ...[
            const SizedBox(height: 4),
            Text(
              bankLine,
              style: TextStyle(color: CasinoUi.fundsMuted(context, 0.75), fontSize: 9),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          if (w['userNote'] != null && w['userNote'].toString().trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              w['userNote'].toString(),
              style: TextStyle(color: CasinoUi.fundsMuted(context, 0.7), fontSize: 9),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

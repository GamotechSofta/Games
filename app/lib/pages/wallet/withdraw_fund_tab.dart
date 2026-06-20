import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/auth_service.dart';
import '../../services/bank_details_service.dart';
import '../../services/payments_service.dart';
import '../../services/wallet_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/casino_ui.dart';
import '../../utils/nav_main_route.dart';
import 'funds_form_theme.dart';
import 'funds_shared_widgets.dart';

/// Withdraw — [Games/frontend/src/pages/funds/WithdrawFund.jsx].
class WithdrawFundTab extends StatefulWidget {
  const WithdrawFundTab({super.key});

  @override
  State<WithdrawFundTab> createState() => _WithdrawFundTabState();
}

class _WithdrawFundTabState extends State<WithdrawFundTab> {
  Map<String, dynamic>? _config;
  List<Map<String, dynamic>> _accounts = [];
  num _wallet = 0;
  String _userName = 'User';
  final _amountCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  String? _bankId;
  bool _loading = true;
  bool _submitting = false;
  bool _noBankModalShown = false;
  String _err = '';
  Timer? _walletPoll;

  static const _walletPollInterval = Duration(seconds: 12);

  @override
  void initState() {
    super.initState();
    _refresh();
    _walletPoll = Timer.periodic(_walletPollInterval, (_) {
      if (_submitting || _loading) return;
      unawaited(_refreshWalletOnly());
    });
  }

  @override
  void dispose() {
    _walletPoll?.cancel();
    _amountCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _refreshWalletOnly() async {
    await WalletService.instance.refreshBalanceInStorage();
    final u = await AuthService.instance.getStoredUser();
    if (!mounted) return;
    setState(() {
      _wallet = _parseBalance(u);
      _userName = u?['username']?.toString() ?? u?['name']?.toString() ?? 'User';
    });
  }

  num _parseBalance(Map<String, dynamic>? u) {
    return num.tryParse(u?['balance']?.toString() ?? '') ??
        num.tryParse(u?['walletBalance']?.toString() ?? '') ??
        0;
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    final c = await PaymentsService.instance.fetchConfig();
    final b = await BankDetailsService.instance.listAccounts();
    final u = await AuthService.instance.getStoredUser();
    await WalletService.instance.refreshBalanceInStorage();
    if (!mounted) return;
    if (c.success && c.data != null) _config = c.data;
    if (b.success) {
      _accounts = b.data;
      Map<String, dynamic>? def;
      for (final a in _accounts) {
        if (a['isDefault'] == true) {
          def = a;
          break;
        }
      }
      _bankId = def?['_id']?.toString() ??
          (_accounts.isNotEmpty ? _accounts.first['_id']?.toString() : null);
    }
    _wallet = _parseBalance(u);
    _userName = u?['username']?.toString() ?? u?['name']?.toString() ?? 'User';
    setState(() => _loading = false);
    if (_accounts.isEmpty && !_noBankModalShown) {
      _noBankModalShown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _showNoBankModal());
    }
  }

  num get _minW => num.tryParse(_config?['minWithdrawal']?.toString() ?? '') ?? 500;
  num get _maxW => num.tryParse(_config?['maxWithdrawal']?.toString() ?? '') ?? 25000;

  Map<String, dynamic>? get _selectedBank {
    if (_bankId == null) return _accounts.isNotEmpty ? _accounts.first : null;
    for (final a in _accounts) {
      if (a['_id']?.toString() == _bankId) return a;
    }
    return _accounts.isNotEmpty ? _accounts.first : null;
  }

  void _setWithdrawMax() {
    final max = _maxW < _wallet ? _maxW : _wallet;
    setState(() => _amountCtrl.text = max.toStringAsFixed(0));
  }

  Future<void> _showNoBankModal() async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('No bank account'),
        content: const Text(
          'Add a bank account before withdrawing funds.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              pushMainSubRoute(context, '/funds/bank-detail');
            },
            child: const Text('Add bank account'),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmAndSubmit() async {
    setState(() => _err = '');
    final n = num.tryParse(_amountCtrl.text.trim());
    if (n == null || n < _minW || n > _maxW) {
      setState(() => _err = 'Amount must be between ₹$_minW and ₹$_maxW');
      return;
    }
    if (n > _wallet) {
      setState(() => _err = 'Insufficient wallet balance');
      return;
    }
    final bank = _selectedBank;
    if (bank == null) {
      await _showNoBankModal();
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        final acct = bank['accountNumber']?.toString() ?? '';
        final last4 = acct.length > 4 ? acct.substring(acct.length - 4) : acct;
        return AlertDialog(
          title: const Text('Confirm withdrawal'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '₹${NumberFormat.decimalPattern('en_IN').format(n)}',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Text(bank['accountHolderName']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
              if (bank['bankName'] != null)
                Text('Bank: ${bank['bankName']}'),
              if (last4.isNotEmpty) Text('Account: ****$last4'),
              if (bank['ifscCode'] != null) Text('IFSC: ${bank['ifscCode']}'),
              if (bank['upiId'] != null && bank['upiId'].toString().isNotEmpty)
                Text('UPI: ${bank['upiId']}'),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: FilledButton.styleFrom(backgroundColor: AppColors.accentRose),
              child: const Text('Confirm'),
            ),
          ],
        );
      },
    );
    if (confirmed != true || !mounted) return;

    setState(() => _submitting = true);
    final res = await PaymentsService.instance.submitWithdraw(
      amount: n.toDouble(),
      bankDetailId: bank['_id']?.toString() ?? _bankId!,
      userNote: _noteCtrl.text,
    );
    if (!mounted) return;
    setState(() => _submitting = false);

    if (res.success) {
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Request submitted'),
          content: Text(
            'Withdrawal of ₹${NumberFormat.decimalPattern('en_IN').format(n)} has been submitted. '
            'Please wait for admin approval.',
          ),
          actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
        ),
      );
      await WalletService.instance.refreshBalanceInStorage();
      _amountCtrl.clear();
      _noteCtrl.clear();
      await _refresh();
    } else {
      setState(() => _err = res.message ?? 'Failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: CasinoUi.fundsGold));
    }

    return RefreshIndicator(
      color: CasinoUi.fundsGold,
      onRefresh: _refresh,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FundsWalletCard(
              balance: _wallet,
              userName: _userName,
              subtitle: 'Available balance',
              footer: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      _userName,
                      style: TextStyle(color: CasinoUi.fundsText(context), fontSize: 13),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    'Min ₹$_minW · Max ₹$_maxW',
                    style: TextStyle(color: CasinoUi.fundsMuted(context, 0.85), fontSize: 11),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            FundsInfoBox(
              title: 'Withdrawal info',
              accentColor: CasinoUi.fundsGold,
              lines: [
                'Withdrawals are processed within 24 hours',
                'Ensure bank details are correct',
                'Minimum withdrawal: ₹$_minW',
                'Maximum withdrawal: ₹$_maxW',
              ],
            ),
            const SizedBox(height: 10),
            if (_accounts.isEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.withValues(alpha: 0.4)),
                ),
                child: Text(
                  'No bank account linked. Add one under Bank Detail.',
                  style: TextStyle(color: Colors.amber.shade200, fontSize: 13),
                ),
              ),
            if (_err.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_err, style: TextStyle(color: Colors.red.shade300, fontSize: 13)),
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Amount (₹)',
                    style: TextStyle(
                      color: CasinoUi.fundsText(context),
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: _accounts.isEmpty ? null : _setWithdrawMax,
                  child: Text(
                    'Withdraw max (₹${NumberFormat.decimalPattern('en_IN').format(_maxW < _wallet ? _maxW : _wallet)})',
                    style: TextStyle(color: AppColors.accentRose, fontSize: 12),
                  ),
                ),
              ],
            ),
            TextField(
              controller: _amountCtrl,
              keyboardType: TextInputType.number,
              style: fundsFieldStyle(context),
              decoration: fundInputDecoration(context, label: 'Enter amount').copyWith(
                contentPadding: const EdgeInsets.symmetric(horizontal: 11, vertical: 15),
                constraints: const BoxConstraints(minHeight: 54),
              ),
            ),
            if (_accounts.length > 1) ...[
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                key: ValueKey<String>(_accounts.map((a) => a['_id']).join()),
                initialValue: _bankId,
                isDense: true,
                isExpanded: true,
                dropdownColor: CasinoUi.fundsDropdownFill(context),
                style: fundsFieldStyle(context),
                decoration: fundInputDecoration(context, label: 'Bank account'),
                items: _accounts
                    .map(
                      (a) => DropdownMenuItem(
                        value: a['_id']?.toString(),
                        child: Text(
                          '${a['accountHolderName']} — ${a['bankName'] ?? a['upiId'] ?? ''}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (v) => setState(() => _bankId = v),
              ),
            ],
            const SizedBox(height: 10),
            TextField(
              controller: _noteCtrl,
              style: fundsFieldStyle(context),
              maxLines: 2,
              decoration: fundInputDecoration(context, label: 'Note (optional)'),
            ),
            const SizedBox(height: 10),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFDC2626), Color(0xFFB91C1C)],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: FilledButton(
                onPressed: _accounts.isEmpty || _submitting ? null : _confirmAndSubmit,
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(
                    vertical: AppSpacing.buttonPaddingV,
                    horizontal: AppSpacing.buttonPaddingH,
                  ),
                  minimumSize: const Size(double.infinity, AppSpacing.buttonMinHeight),
                ),
                child: _submitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text(
                        'Submit withdrawal request',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

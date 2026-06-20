import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/auth_service.dart';
import '../../services/payments_service.dart';
import '../../services/wallet_service.dart';
import '../../theme/app_spacing.dart';
import '../../theme/casino_ui.dart';
import 'funds_form_theme.dart';
import 'funds_shared_widgets.dart';
import 'payu_checkout_screen.dart';

/// Add fund — [Games/frontend/src/pages/funds/AddFund.jsx].
class AddFundTab extends StatefulWidget {
  const AddFundTab({super.key, this.onSubmittedGoHistory});

  final VoidCallback? onSubmittedGoHistory;

  @override
  State<AddFundTab> createState() => _AddFundTabState();
}

class _AddFundTabState extends State<AddFundTab> {
  Map<String, dynamic>? _config;
  final _amountCtrl = TextEditingController();
  bool _payuLoading = false;
  bool _verifying = false;
  String _err = '';
  Timer? _walletPoll;
  int _walletUiEpoch = 0;

  static const _walletPollInterval = Duration(seconds: 12);

  @override
  void initState() {
    super.initState();
    _loadConfig();
    unawaited(_syncDisplayedWalletFromServer());
    _walletPoll = Timer.periodic(_walletPollInterval, (_) {
      if (_payuLoading || _verifying) return;
      unawaited(_syncDisplayedWalletFromServer());
    });
  }

  Future<void> _syncDisplayedWalletFromServer() async {
    await WalletService.instance.refreshBalanceInStorage();
    if (!mounted) return;
    setState(() => _walletUiEpoch++);
  }

  @override
  void dispose() {
    _walletPoll?.cancel();
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadConfig() async {
    final r = await PaymentsService.instance.fetchConfig();
    if (mounted && r.success && r.data != null) setState(() => _config = r.data);
  }

  num get _min => num.tryParse(_config?['minDeposit']?.toString() ?? '') ?? 100;
  num get _max => num.tryParse(_config?['maxDeposit']?.toString() ?? '') ?? 50000;

  Future<void> _payWithPayU() async {
    setState(() {
      _err = '';
      _payuLoading = true;
    });

    final user = await AuthService.instance.getStoredUser();
    final userId = AuthService.storedUserId(user);
    if (userId == null || userId.isEmpty) {
      if (!mounted) return;
      setState(() {
        _payuLoading = false;
        _err = 'Please log in to add funds';
      });
      return;
    }

    final numAmount = num.tryParse(_amountCtrl.text.trim());
    if (numAmount == null || numAmount < _min || numAmount > _max) {
      if (!mounted) return;
      setState(() {
        _payuLoading = false;
        _err = 'Amount must be between ₹$_min and ₹$_max';
      });
      return;
    }

    final link = await PaymentsService.instance.createPayULink(
      amount: numAmount.toDouble(),
      returnToApp: true,
      firstname: user?['username']?.toString() ?? user?['name']?.toString(),
      email: user?['email']?.toString(),
      phone: user?['phone']?.toString(),
    );

    if (!mounted) return;
    if (!link.success ||
        link.formActionUrl == null ||
        link.formData == null ||
        link.paymentId == null) {
      setState(() {
        _payuLoading = false;
        _err = link.message ?? 'Failed to start PayU payment';
      });
      return;
    }

    setState(() => _payuLoading = false);

    final checkout = await Navigator.of(context).push<PayuCheckoutResult>(
      MaterialPageRoute(
        builder: (_) => PayuCheckoutScreen(
          formActionUrl: link.formActionUrl!,
          formData: link.formData!,
        ),
      ),
    );

    if (!mounted || checkout == null) return;

    if (checkout.isFailed) {
      setState(() => _err = 'Payment was cancelled or failed. You can try again.');
      return;
    }

    if (!checkout.isSuccess) return;

    final paymentId = checkout.paymentId ?? link.paymentId!;
    setState(() {
      _verifying = true;
      _err = '';
    });

    final verify = await PaymentsService.instance.verifyPayUPayment(
      paymentId: paymentId,
      userId: userId,
      extraParams: checkout.queryParameters,
    );

    if (!mounted) return;
    setState(() => _verifying = false);

    if (verify.success) {
      await WalletService.instance.refreshBalanceInStorage();
      if (!mounted) return;
      setState(() => _walletUiEpoch++);
      final credited = verify.amount ?? numAmount;
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Payment successful'),
          content: Text(
            '₹${NumberFormat.decimalPattern('en_IN').format(credited)} has been added to your wallet.',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Done')),
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                widget.onSubmittedGoHistory?.call();
              },
              child: const Text('View History'),
            ),
          ],
        ),
      );
      if (!context.mounted) return;
      setState(() => _amountCtrl.clear());
      return;
    }

    setState(() {
      _err = verify.message ??
          'Deposit could not be verified. If you paid, it may reflect shortly.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_err.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                _err,
                style: TextStyle(color: Colors.red.shade300, fontSize: 13),
              ),
            ),
          _buildPayuForm(),
        ],
      ),
    );
  }

  Widget _buildPayuForm() {
    return FutureBuilder<Map<String, dynamic>?>(
      key: ValueKey<int>(_walletUiEpoch),
      future: AuthService.instance.getStoredUser(),
      builder: (context, snap) {
        final u = snap.data;
        final bal = num.tryParse(u?['balance']?.toString() ?? '') ??
            num.tryParse(u?['walletBalance']?.toString() ?? '') ??
            0;
        final name = u?['username']?.toString() ?? u?['name']?.toString() ?? 'User';
        return Column(
          children: [
            FundsWalletCard(balance: bal, userName: name),
            const SizedBox(height: 8),
            TextField(
              controller: _amountCtrl,
              keyboardType: TextInputType.number,
              style: fundsFieldStyle(context),
              decoration: fundInputDecoration(
                context,
                label: 'Enter Amount',
              ).copyWith(
                contentPadding: const EdgeInsets.symmetric(horizontal: 11, vertical: 16),
                constraints: const BoxConstraints(minHeight: 56),
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [200, 500, 1000, 2000].map((a) {
                final sel = _amountCtrl.text == '$a';
                return ChoiceChip(
                  label: Text(
                    '₹$a',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: sel ? Colors.black : CasinoUi.fundsText(context),
                    ),
                  ),
                  selected: sel,
                  showCheckmark: false,
                  visualDensity: VisualDensity.compact,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  labelPadding: const EdgeInsets.symmetric(horizontal: 8),
                  backgroundColor: CasinoUi.fundsCardFill(context),
                  selectedColor: CasinoUi.fundsGold,
                  side: BorderSide(
                    color: sel
                        ? CasinoUi.fundsGold.withValues(alpha: 0.6)
                        : CasinoUi.fundsCardBorder(context),
                  ),
                  onSelected: (_) => setState(() => _amountCtrl.text = '$a'),
                );
              }).toList(),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                'Min ₹$_min – Max ₹${NumberFormat.decimalPattern('en_IN').format(_max)}',
                style: TextStyle(color: CasinoUi.fundsMuted(context, 0.85), fontSize: 11),
              ),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: (_payuLoading || _verifying) ? null : _payWithPayU,
              style: FilledButton.styleFrom(
                backgroundColor: CasinoUi.fundsGold,
                foregroundColor: CasinoUi.fundsPrimaryButtonForeground(),
                padding: const EdgeInsets.symmetric(
                  vertical: AppSpacing.buttonPaddingV,
                  horizontal: AppSpacing.buttonPaddingH,
                ),
                minimumSize: const Size(0, AppSpacing.buttonMinHeight),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
              child: (_payuLoading || _verifying)
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                    )
                  : Text(_verifying ? 'Verifying…' : 'Pay with PayU'),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: CasinoUi.fundsNoteFill(context),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: CasinoUi.fundsCardBorder(context)),
              ),
              child: Text(
                'You will be redirected to PayU to complete payment securely. '
                'Your wallet is credited automatically after a successful payment.',
                style: TextStyle(
                  color: CasinoUi.fundsMuted(context, 0.95),
                  fontSize: 12,
                  height: 1.35,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

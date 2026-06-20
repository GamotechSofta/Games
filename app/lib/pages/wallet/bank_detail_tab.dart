import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../services/bank_details_service.dart';
import '../../theme/app_spacing.dart';
import '../../theme/casino_ui.dart';
import 'funds_form_theme.dart';
import 'funds_shared_widgets.dart';

/// Bank details — [Games/frontend/src/pages/funds/BankDetail.jsx].
class BankDetailTab extends StatefulWidget {
  const BankDetailTab({super.key});

  @override
  State<BankDetailTab> createState() => _BankDetailTabState();
}

class _BankDetailTabState extends State<BankDetailTab> {
  List<Map<String, dynamic>> _list = [];
  bool _loading = true;
  bool _showForm = false;
  String? _editingId;
  final _holder = TextEditingController();
  final _account = TextEditingController();
  final _ifsc = TextEditingController();
  final _bankName = TextEditingController();
  final _upi = TextEditingController();
  String _accountType = 'savings';
  bool _submitting = false;
  bool _fetchingBankName = false;
  String _err = '';

  @override
  void dispose() {
    _holder.dispose();
    _account.dispose();
    _ifsc.dispose();
    _bankName.dispose();
    _upi.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final r = await BankDetailsService.instance.listAccounts();
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (r.success) _list = r.data;
    });
  }

  void _resetForm() {
    setState(() {
      _holder.clear();
      _account.clear();
      _ifsc.clear();
      _bankName.clear();
      _upi.clear();
      _accountType = 'savings';
      _editingId = null;
      _showForm = false;
      _err = '';
    });
  }

  void _fill(Map<String, dynamic> a) {
    setState(() {
      _holder.text = a['accountHolderName']?.toString() ?? '';
      _account.text = a['accountNumber']?.toString() ?? '';
      _ifsc.text = a['ifscCode']?.toString() ?? '';
      _bankName.text = a['bankName']?.toString() ?? '';
      _upi.text = a['upiId']?.toString() ?? '';
      _accountType = a['accountType']?.toString() ?? 'savings';
      _editingId = a['_id']?.toString();
      _showForm = true;
      _err = '';
    });
  }

  Future<void> _fetchBankNameFromIfsc(String ifsc) async {
    final clean = ifsc.trim().toUpperCase();
    if (clean.length != 11) return;
    setState(() => _fetchingBankName = true);
    try {
      final res = await http.get(Uri.parse('https://ifsc.razorpay.com/$clean'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>?;
        final bank = data?['BANK']?.toString();
        if (bank != null && bank.isNotEmpty && mounted) {
          setState(() => _bankName.text = bank);
        }
      }
    } catch (_) {
      // User can enter bank name manually.
    } finally {
      if (mounted) setState(() => _fetchingBankName = false);
    }
  }

  void _onIfscChanged(String value) {
    final upper = value.toUpperCase();
    if (_ifsc.text != upper) {
      _ifsc.value = _ifsc.value.copyWith(
        text: upper,
        selection: TextSelection.collapsed(offset: upper.length),
      );
    }
    if (upper.length == 11) {
      unawaited(_fetchBankNameFromIfsc(upper));
    } else if (upper.length < 11 && _bankName.text.isNotEmpty && !_fetchingBankName) {
      setState(() => _bankName.clear());
    }
  }

  Future<void> _save() async {
    setState(() => _err = '');
    if (_holder.text.trim().isEmpty) {
      setState(() => _err = 'Account holder name is required');
      return;
    }
    if (_upi.text.trim().isEmpty && (_account.text.trim().isEmpty || _ifsc.text.trim().isEmpty)) {
      setState(() => _err = 'Provide UPI ID or account number + IFSC');
      return;
    }
    final payload = {
      'accountHolderName': _holder.text.trim(),
      'accountNumber': _account.text.trim(),
      'ifscCode': _ifsc.text.trim(),
      'bankName': _bankName.text.trim(),
      'upiId': _upi.text.trim(),
      'accountType': _accountType,
    };
    setState(() => _submitting = true);
    final r = _editingId == null
        ? await BankDetailsService.instance.createAccount(payload)
        : await BankDetailsService.instance.updateAccount(_editingId!, payload);
    if (!mounted) return;
    setState(() => _submitting = false);
    if (r.success) {
      final wasEdit = _editingId != null;
      _resetForm();
      await _load();
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(wasEdit ? 'Account updated' : 'Account added'),
          content: const Text('Your bank details have been saved.'),
          actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
        ),
      );
    } else {
      setState(() => _err = r.message ?? 'Failed');
    }
  }

  Future<void> _delete(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete account?'),
        content: const Text('This bank account will be removed.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true) return;
    final r = await BankDetailsService.instance.deleteAccount(id);
    if (r.success) await _load();
    if (mounted && !r.success) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r.message ?? 'Error')));
    }
  }

  Future<void> _default(String id) async {
    await BankDetailsService.instance.setDefault(id);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: CasinoUi.fundsGold));
    }

    return RefreshIndicator(
      color: CasinoUi.fundsGold,
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(4, 6, 4, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Bank details',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: CasinoUi.fundsText(context),
                      ),
                    ),
                    Text(
                      '${_list.length}/5 accounts',
                      style: TextStyle(color: CasinoUi.fundsMuted(context, 0.85), fontSize: 12),
                    ),
                  ],
                ),
                if (_list.length < 5 && !_showForm)
                  FilledButton.icon(
                    onPressed: () => setState(() {
                      _showForm = true;
                      _editingId = null;
                      _holder.clear();
                      _account.clear();
                      _ifsc.clear();
                      _bankName.clear();
                      _upi.clear();
                    }),
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Add account'),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.buttonPaddingH,
                        vertical: AppSpacing.buttonPaddingV,
                      ),
                      minimumSize: const Size(0, AppSpacing.buttonMinHeight),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            if (_err.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(_err, style: TextStyle(color: Colors.red.shade300, fontSize: 13)),
              ),
            if (_showForm) ...[
              Container(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
                decoration: BoxDecoration(
                  color: CasinoUi.fundsCardFill(context),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF3B82F6).withValues(alpha: 0.35)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      _editingId == null ? 'Add bank account' : 'Edit bank account',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: CasinoUi.fundsText(context),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _holder,
                      style: fundsFieldStyle(context),
                      decoration: fundInputDecoration(context, label: 'Account holder *'),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _account,
                      style: fundsFieldStyle(context),
                      decoration: fundInputDecoration(context, label: 'Account number'),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _ifsc,
                      style: fundsFieldStyle(context),
                      maxLength: 11,
                      onChanged: _onIfscChanged,
                      decoration: fundInputDecoration(context, label: 'IFSC code'),
                    ),
                    if (_fetchingBankName)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          'Fetching bank name…',
                          style: TextStyle(color: const Color(0xFF60A5FA), fontSize: 11),
                        ),
                      ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _bankName,
                      style: fundsFieldStyle(context),
                      decoration: fundInputDecoration(context, label: 'Bank name'),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _upi,
                      style: fundsFieldStyle(context),
                      decoration: fundInputDecoration(context, label: 'UPI ID (optional)'),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      key: ValueKey<String>('acct_$_accountType'),
                      initialValue: _accountType,
                      isDense: true,
                      isExpanded: true,
                      dropdownColor: CasinoUi.fundsDropdownFill(context),
                      style: fundsFieldStyle(context),
                      decoration: fundInputDecoration(context, label: 'Account type'),
                      items: const [
                        DropdownMenuItem(value: 'savings', child: Text('Savings')),
                        DropdownMenuItem(value: 'current', child: Text('Current')),
                      ],
                      onChanged: (v) => setState(() => _accountType = v ?? 'savings'),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        OutlinedButton(
                          onPressed: _submitting ? null : _resetForm,
                          child: const Text('Cancel'),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: FilledButton(
                            onPressed: _submitting ? null : _save,
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              foregroundColor: Colors.white,
                            ),
                            child: _submitting
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : Text(_editingId == null ? 'Add account' : 'Update'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
            if (_list.isEmpty && !_showForm)
              FundsEmptyHistoryState(
                message: 'No bank accounts yet.\nAdd your first account to withdraw funds.',
                onViewAll: () => setState(() => _showForm = true),
              )
            else
              ..._list.map((a) => _accountCard(a)),
          ],
        ),
      ),
    );
  }

  Widget _accountCard(Map<String, dynamic> a) {
    final id = a['_id']?.toString() ?? '';
    final isDefault = a['isDefault'] == true;
    final acct = a['accountNumber']?.toString() ?? '';
    final last4 = acct.length > 4 ? acct.substring(acct.length - 4) : acct;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: CasinoUi.fundsCardFill(context),
      elevation: CasinoUi.fundsCardElevation(context),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isDefault
              ? CasinoUi.fundsGold.withValues(alpha: 0.5)
              : CasinoUi.fundsCardBorder(context),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              backgroundColor: const Color(0xFF2563EB).withValues(alpha: 0.2),
              child: const Icon(Icons.account_balance, color: Color(0xFF60A5FA), size: 22),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          a['accountHolderName']?.toString() ?? '',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: CasinoUi.fundsText(context),
                            fontSize: 14,
                          ),
                        ),
                      ),
                      if (isDefault)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: CasinoUi.fundsGold.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: CasinoUi.fundsGold.withValues(alpha: 0.35)),
                          ),
                          child: Text(
                            'Default',
                            style: TextStyle(fontSize: 10, color: CasinoUi.fundsGold),
                          ),
                        ),
                    ],
                  ),
                  if (a['bankName'] != null && a['bankName'].toString().isNotEmpty)
                    Text(
                      a['bankName'].toString(),
                      style: TextStyle(color: CasinoUi.fundsMuted(context, 0.9), fontSize: 12),
                    ),
                  if (last4.isNotEmpty)
                    Text(
                      '****$last4',
                      style: TextStyle(color: CasinoUi.fundsMuted(context, 0.85), fontSize: 12),
                    ),
                  if (a['ifscCode'] != null && a['ifscCode'].toString().isNotEmpty)
                    Text(
                      'IFSC: ${a['ifscCode']}',
                      style: TextStyle(color: CasinoUi.fundsMuted(context, 0.85), fontSize: 12),
                    ),
                  if (a['upiId'] != null && a['upiId'].toString().isNotEmpty)
                    Text(
                      'UPI: ${a['upiId']}',
                      style: TextStyle(color: CasinoUi.fundsMuted(context, 0.85), fontSize: 12),
                    ),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 0,
                    children: [
                      TextButton(
                        onPressed: () => _fill(a),
                        child: const Text('Edit', style: TextStyle(fontSize: 13)),
                      ),
                      if (!isDefault)
                        TextButton(
                          onPressed: () => _default(id),
                          child: const Text('Set default', style: TextStyle(fontSize: 13)),
                        ),
                      TextButton(
                        onPressed: () => _delete(id),
                        style: TextButton.styleFrom(foregroundColor: Colors.red.shade400),
                        child: const Text('Delete', style: TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

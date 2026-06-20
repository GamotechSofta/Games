import 'package:flutter/material.dart';

import 'funds_tabs.dart';

/// Funds sidebar entries — [Games/frontend/src/pages/Funds.jsx].
class FundsMenuItem {
  const FundsMenuItem({
    required this.key,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.icon,
  });

  final String key;
  final String title;
  final String subtitle;
  final Color color;
  final Widget icon;

  String get routePath => '/funds/$key';
}

abstract final class FundsMenu {
  static const addFundColor = Color(0xFF34A853);
  static const withdrawColor = Color(0xFFEF4444);
  static const bankColor = Color(0xFF3B82F6);
  static const addHistoryColor = Color(0xFF1E3A8A);
  static const withdrawHistoryColor = Color(0xFFF59E0B);

  static const defaultTabKey = 'add-fund';

  static List<FundsMenuItem> items(BuildContext context) {
    const iconColor = Colors.black;
    return [
      FundsMenuItem(
        key: 'add-fund',
        title: 'Add Fund',
        subtitle: 'You can add fund to your wallet',
        color: addFundColor,
        icon: const Text(
          '₹',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: iconColor,
            height: 1,
          ),
        ),
      ),
      FundsMenuItem(
        key: 'withdraw-fund',
        title: 'Withdraw Fund',
        subtitle: 'You can withdraw winnings',
        color: withdrawColor,
        icon: const Icon(Icons.arrow_downward_rounded, color: iconColor, size: 22),
      ),
      FundsMenuItem(
        key: 'bank-detail',
        title: 'Bank Detail',
        subtitle: 'Add your bank detail for withdrawals',
        color: bankColor,
        icon: const Icon(Icons.account_balance_rounded, color: iconColor, size: 22),
      ),
      FundsMenuItem(
        key: 'add-fund-history',
        title: 'Add Fund History',
        subtitle: 'You can check your add fund history',
        color: addHistoryColor,
        icon: const Icon(Icons.history_rounded, color: iconColor, size: 22),
      ),
      FundsMenuItem(
        key: 'withdraw-fund-history',
        title: 'Withdraw Fund History',
        subtitle: 'You can check your withdraw history',
        color: withdrawHistoryColor,
        icon: const Icon(Icons.history_toggle_off_rounded, color: iconColor, size: 22),
      ),
    ];
  }

  static FundsMenuItem? findByKey(BuildContext context, String key) {
    for (final item in items(context)) {
      if (item.key == key) return item;
    }
    return null;
  }

  static Widget panel(
    String key, {
    VoidCallback? onAddFundSubmittedGoHistory,
  }) {
    switch (key) {
      case 'add-fund':
        return AddFundTab(onSubmittedGoHistory: onAddFundSubmittedGoHistory);
      case 'withdraw-fund':
        return const WithdrawFundTab();
      case 'bank-detail':
        return const BankDetailTab();
      case 'add-fund-history':
        return const AddFundHistoryTab();
      case 'withdraw-fund-history':
        return const WithdrawFundHistoryTab();
      default:
        return const SizedBox.shrink();
    }
  }
}

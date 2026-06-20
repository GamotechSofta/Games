import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../theme/casino_ui.dart';

String formatFundsDate(dynamic value) {
  if (value == null) return '';
  final raw = value.toString();
  final dt = DateTime.tryParse(raw);
  if (dt == null) return raw;
  return DateFormat('dd MMM yyyy, hh:mm a').format(dt.toLocal());
}

/// Golden wallet card — [WithdrawFund.jsx] / [AddFund.jsx].
class FundsWalletCard extends StatelessWidget {
  const FundsWalletCard({
    super.key,
    required this.balance,
    required this.userName,
    this.subtitle,
    this.footer,
  });

  final num balance;
  final String userName;
  final String? subtitle;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: CasinoUi.fundsCardFill(context),
      elevation: CasinoUi.fundsCardElevation(context),
      shadowColor: Colors.black.withValues(alpha: 0.2),
      surfaceTintColor: Colors.transparent,
      shape: CasinoUi.fundsCardShape(context),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 6, 8, 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.public, size: 14, color: CasinoUi.fundsGold),
                const SizedBox(width: 6),
                Text(
                  'Aakda',
                  style: TextStyle(
                    color: CasinoUi.fundsMuted(context, 0.75),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              gradient: CasinoUi.fundsPrimaryGradient(),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: Colors.black.withValues(alpha: 0.25),
                  child: const Text(
                    '₹',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: Colors.black,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (subtitle != null)
                        Text(
                          subtitle!,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                      Text(
                        '₹ ${NumberFormat.decimalPattern('en_IN').format(balance)}',
                        style: const TextStyle(
                          color: Colors.black,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: footer ??
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        userName,
                        style: TextStyle(
                          color: CasinoUi.fundsText(context),
                          fontSize: 13,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
          ),
        ],
      ),
    );
  }
}

/// Total summary banner for history tabs.
class FundsHistoryTotalBanner extends StatelessWidget {
  const FundsHistoryTotalBanner({
    super.key,
    required this.label,
    required this.amount,
    required this.gradientColors,
    required this.borderColor,
  });

  final String label;
  final num amount;
  final List<Color> gradientColors;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor.withValues(alpha: 0.45)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: CasinoUi.fundsMuted(context, 0.95),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '₹${NumberFormat.decimalPattern('en_IN').format(amount)}',
            style: TextStyle(
              color: CasinoUi.fundsText(context),
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

class FundsHistoryFilterOption {
  const FundsHistoryFilterOption({
    required this.key,
    required this.label,
    required this.count,
    this.activeColor,
    this.valueColor,
  });

  final String key;
  final String label;
  final int count;
  final Color? activeColor;
  final Color? valueColor;
}

/// Four stat filter buttons — [AddFundHistory.jsx].
class FundsHistoryFilterGrid extends StatelessWidget {
  const FundsHistoryFilterGrid({
    super.key,
    required this.selected,
    required this.options,
    required this.onSelected,
  });

  final String selected;
  final List<FundsHistoryFilterOption> options;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < options.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: _StatFilterTile(
              option: options[i],
              selected: selected == options[i].key,
              onTap: () => onSelected(options[i].key),
            ),
          ),
        ],
      ],
    );
  }
}

class _StatFilterTile extends StatelessWidget {
  const _StatFilterTile({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final FundsHistoryFilterOption option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final activeColor = option.activeColor ?? const Color(0xFF2563EB);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          decoration: BoxDecoration(
            color: selected
                ? activeColor.withValues(alpha: 0.22)
                : CasinoUi.fundsCardFill(context),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected
                  ? activeColor.withValues(alpha: 0.55)
                  : CasinoUi.fundsCardBorder(context),
            ),
          ),
          child: Column(
            children: [
              Text(
                '${option.count}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 17,
                  color: selected
                      ? (option.valueColor ?? CasinoUi.fundsText(context))
                      : CasinoUi.fundsText(context),
                ),
              ),
              Text(
                option.label,
                style: TextStyle(
                  fontSize: 10,
                  color: CasinoUi.fundsMuted(context, 0.9),
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class FundsStatusBadge extends StatelessWidget {
  const FundsStatusBadge({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final s = status.trim().toLowerCase();
    Color bg;
    Color fg;
    String label;
    switch (s) {
      case 'approved':
        bg = Colors.green.withValues(alpha: 0.25);
        fg = Colors.green.shade400;
        label = 'Approved';
      case 'rejected':
        bg = Colors.red.withValues(alpha: 0.25);
        fg = Colors.red.shade400;
        label = 'Rejected';
      case 'pending':
        bg = Colors.amber.withValues(alpha: 0.25);
        fg = Colors.amber.shade400;
        label = 'Pending';
      default:
        bg = Colors.grey.withValues(alpha: 0.25);
        fg = CasinoUi.fundsMuted(context);
        label = status.isEmpty ? 'Unknown' : status;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: fg),
      ),
    );
  }
}

Widget fundsStatusIcon(String status) {
  final s = status.trim().toLowerCase();
  IconData icon;
  Color color;
  Color bg;
  if (s == 'approved') {
    icon = Icons.check_rounded;
    color = Colors.green.shade400;
    bg = Colors.green.withValues(alpha: 0.2);
  } else if (s == 'rejected') {
    icon = Icons.close_rounded;
    color = Colors.red.shade400;
    bg = Colors.red.withValues(alpha: 0.2);
  } else {
    icon = Icons.schedule_rounded;
    color = Colors.amber.shade400;
    bg = Colors.amber.withValues(alpha: 0.2);
  }
  return CircleAvatar(
    radius: 18,
    backgroundColor: bg,
    child: Icon(icon, size: 18, color: color),
  );
}

class FundsEmptyHistoryState extends StatelessWidget {
  const FundsEmptyHistoryState({
    super.key,
    required this.message,
    this.onViewAll,
  });

  final String message;
  final VoidCallback? onViewAll;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.receipt_long_outlined, size: 48, color: CasinoUi.fundsMuted(context, 0.5)),
            const SizedBox(height: 12),
            Text(
              message,
              style: TextStyle(color: CasinoUi.fundsMuted(context, 0.85)),
              textAlign: TextAlign.center,
            ),
            if (onViewAll != null) ...[
              const SizedBox(height: 8),
              TextButton(onPressed: onViewAll, child: const Text('View all')),
            ],
          ],
        ),
      ),
    );
  }
}

class FundsInfoBox extends StatelessWidget {
  const FundsInfoBox({
    super.key,
    required this.title,
    required this.lines,
    this.accentColor,
  });

  final String title;
  final List<String> lines;
  final Color? accentColor;

  @override
  Widget build(BuildContext context) {
    final accent = accentColor ?? CasinoUi.fundsGold;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: CasinoUi.fundsNoteFill(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: CasinoUi.fundsCardBorder(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: accent,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 6),
          for (final line in lines)
            Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Text(
                '• $line',
                style: TextStyle(
                  color: CasinoUi.fundsMuted(context, 0.95),
                  fontSize: 12,
                  height: 1.35,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

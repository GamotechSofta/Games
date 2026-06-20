import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/casino_ui.dart';
import 'game_bid_ui.dart';

/// Shown after [POST /bets/place] succeeds (all game bid screens).
Future<void> showBetPlacedSuccessDialog(
  BuildContext context, {
  String? message,
  num? newBalance,
  int? betCount,
  num? totalAmount,
}) {
  final isLight = Theme.of(context).brightness == Brightness.light;
  final dialogBg = isLight ? Colors.white : CasinoUi.fieldFill;
  final titleColor = isLight ? AppColors.navyDark : GameBidUi.onSurface(context);
  final bodyColor =
      isLight ? AppColors.textSecondary : GameBidUi.onSurfaceMuted(context, 0.88);
  final borderColor = GameBidUi.betChromeBorderColor(context);

  final title = (message != null && message.trim().isNotEmpty)
      ? message.trim()
      : 'Bet placed successfully';

  String? detail;
  if (betCount != null && betCount > 0 && totalAmount != null && totalAmount > 0) {
    final amt = totalAmount == totalAmount.roundToDouble()
        ? totalAmount.toInt().toString()
        : totalAmount.toStringAsFixed(1);
    detail = '$betCount bet${betCount == 1 ? '' : 's'} · ₹$amt';
  }

  String? balanceLine;
  if (newBalance != null) {
    final b = newBalance == newBalance.roundToDouble()
        ? newBalance.toInt().toString()
        : newBalance.toStringAsFixed(1);
    balanceLine = 'Wallet balance: ₹$b';
  }

  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.black.withValues(alpha: 0.75),
    builder: (ctx) {
      return Dialog(
        backgroundColor: dialogBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: borderColor, width: 1.5),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isLight
                      ? AppColors.accentEmerald.withValues(alpha: 0.12)
                      : Colors.white.withValues(alpha: 0.08),
                  border: Border.all(color: borderColor),
                ),
                child: Icon(
                  Icons.check_rounded,
                  color: isLight ? AppColors.accentEmerald : GameBidUi.onSurface(context),
                  size: 36,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Success!',
                style: TextStyle(
                  color: titleColor,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: bodyColor,
                  fontSize: 14,
                  height: 1.45,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (detail != null) ...[
                const SizedBox(height: 8),
                Text(
                  detail,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: bodyColor,
                    fontSize: 13,
                    height: 1.35,
                  ),
                ),
              ],
              if (balanceLine != null) ...[
                const SizedBox(height: 8),
                Text(
                  balanceLine,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isLight ? AppColors.navyDark : GameBidUi.onSurface(context),
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.goldDeep,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text(
                    'OK',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}

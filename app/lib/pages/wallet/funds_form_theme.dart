import 'package:flutter/material.dart';

import '../../theme/app_spacing.dart';
import '../../theme/casino_ui.dart';

/// Tighter fields for funds screens — light/dark via [CasinoUi.funds*].
InputDecoration fundInputDecoration(
  BuildContext context, {
  required String label,
  String? hint,
}) {
  final theme = CasinoUi.inputDecorationFunds(context);
  final border = CasinoUi.fundsCardBorder(context);
  return InputDecoration(
    isDense: true,
    labelText: label,
    hintText: hint,
    filled: theme.filled,
    fillColor: theme.fillColor,
    labelStyle: theme.labelStyle,
    hintStyle: theme.hintStyle,
    floatingLabelBehavior: FloatingLabelBehavior.auto,
    contentPadding: const EdgeInsets.symmetric(
      horizontal: 11,
      vertical: AppSpacing.inputPaddingV,
    ),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: BorderSide(color: border),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: BorderSide(color: border),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: BorderSide(
        color: CasinoUi.fundsGold.withValues(alpha: 0.4),
        width: 2,
      ),
    ),
  );
}

TextStyle fundsFieldStyle(BuildContext context) => TextStyle(
      color: CasinoUi.fundsText(context),
      fontSize: 14,
      height: 1.2,
    );

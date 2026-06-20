import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_spacing.dart';

/// Shared light-on-dark “casino” styling for shell-backed pages.
abstract final class CasinoUi {
  static const Color lightGold = Color(0xFFEAFEF4);

  static Color mutedGold([double opacity = 1]) =>
      AppColors.goldMuted.withValues(alpha: opacity);

  static ShapeBorder cardShape({
    double borderOpacity = 0.38,
    double width = 1.5,
  }) {
    return RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: BorderSide(
        color: AppColors.gold.withValues(alpha: borderOpacity),
        width: width,
      ),
    );
  }

  static ShapeBorder cardShapeRadius(
    double radius, {
    double borderOpacity = 0.38,
  }) {
    return RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: BorderSide(
        color: AppColors.gold.withValues(alpha: borderOpacity),
        width: 1.5,
      ),
    );
  }

  /// Help Desk / Funds — neutral light border (not [AppColors.gold] / neon green).
  static Color neutralShellBorderColor({double alpha = 0.16}) =>
      Colors.white.withValues(alpha: alpha);

  /// Funds / profile cards on casino shell — neutral light border.
  static ShapeBorder neutralShellCardShape({
    double borderOpacity = 0.16,
    double width = 1,
  }) {
    return RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: BorderSide(
        color: Colors.white.withValues(alpha: borderOpacity),
        width: width,
      ),
    );
  }

  /// Shared with bet history / market results (King Bazaar palette).
  static const Color historyDarkText = Color(0xFFFEF9E8);
  static const Color historyLightAccent = Color(0xFFB45309);

  static bool _isDark(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark;

  static Color historyAccent(BuildContext context) =>
      _isDark(context) ? AppColors.gold : historyLightAccent;

  static Color historyText(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _isDark(context) ? historyDarkText : scheme.onSurface;
  }

  static Color historyMuted(BuildContext context, [double alpha = 1]) {
    final scheme = Theme.of(context).colorScheme;
    return _isDark(context)
        ? AppColors.goldMuted.withValues(alpha: alpha)
        : scheme.onSurfaceVariant.withValues(alpha: alpha);
  }

  static Color historyCardFill(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _isDark(context)
        ? AppColors.surfaceCard.withValues(alpha: 0.92)
        : scheme.surfaceContainer;
  }

  static Color historyCardBorder(BuildContext context) {
    return _isDark(context)
        ? const Color(0xFFE9C46A).withValues(alpha: 0.45)
        : Theme.of(context).colorScheme.outline.withValues(alpha: 0.5);
  }

  static ShapeBorder historyCardShape(
    BuildContext context, {
    double radius = 10,
  }) {
    return RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: BorderSide(color: historyCardBorder(context), width: 1.2),
    );
  }

  static double historyCardElevation(BuildContext context) =>
      _isDark(context) ? 0 : 1;

  static Color historyFilledButtonForeground(BuildContext context) =>
      _isDark(context) ? const Color(0xFF1A1408) : Colors.white;

  // —— Funds (/funds) — mirrors [MenuItemCard.jsx] + fund tab forms ——

  static const Color fundsGold = Color(0xFFD4AF37);
  static const Color fundsGoldMid = Color(0xFFCCA84D);
  static const Color fundsGoldDark = Color(0xFFB8941F);
  static const Color fundsDarkSurface = Color(0xFF202124);
  static const Color fundsLightBorder = Color(0xFFE5E7EB);
  static const Color fundsLightMuted = Color(0xFF6B7280);

  static Color fundsAccent(BuildContext context) => fundsGold;

  static Color fundsText(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _isDark(context) ? Colors.white : scheme.onSurface;
  }

  static Color fundsMuted(BuildContext context, [double alpha = 1]) {
    return _isDark(context)
        ? const Color(0xFF9CA3AF).withValues(alpha: alpha)
        : fundsLightMuted.withValues(alpha: alpha);
  }

  /// Section surfaces — transparent on dark casino shell, white cards in light mode.
  static Color fundsCardFill(BuildContext context) =>
      _isDark(context) ? Colors.transparent : Colors.white;

  static Color fundsCardBorder(BuildContext context, {bool active = false}) {
    if (active) return fundsGold.withValues(alpha: 0.4);
    return _isDark(context)
        ? Colors.white.withValues(alpha: 0.1)
        : fundsLightBorder;
  }

  static Color fundsShellBorder(BuildContext context, {double alpha = 1}) =>
      fundsCardBorder(context).withValues(alpha: alpha);

  static BoxDecoration fundsMenuTileDecoration(
    BuildContext context, {
    required bool selected,
  }) {
    final isDark = _isDark(context);
    return BoxDecoration(
      color: fundsCardFill(context),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(
        color: fundsCardBorder(context, active: selected),
        width: selected ? 2 : 1,
      ),
      boxShadow: isDark
          ? null
          : [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
    );
  }

  static Widget fundsMenuChevron(BuildContext context, {required bool selected}) {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected
            ? fundsGold.withValues(alpha: 0.15)
            : (_isDark(context)
                ? Colors.transparent
                : const Color(0xFFF3F4F6)),
        border: Border.all(
          color: selected
              ? fundsGold.withValues(alpha: 0.35)
              : fundsShellBorder(context),
        ),
      ),
      child: Icon(
        Icons.chevron_right,
        size: 16,
        color: selected ? fundsGold : fundsMuted(context, 0.85),
      ),
    );
  }

  static ShapeBorder fundsCardShape(BuildContext context, {double radius = 16}) {
    return RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: BorderSide(color: fundsCardBorder(context)),
    );
  }

  static double fundsCardElevation(BuildContext context) =>
      _isDark(context) ? 0 : 1;

  static Color fundsFieldFill(BuildContext context) =>
      _isDark(context) ? Colors.transparent : Colors.white;

  /// Dropdown menus need an opaque surface even when sections are transparent.
  static Color fundsDropdownFill(BuildContext context) =>
      _isDark(context) ? fundsDarkSurface : Colors.white;

  static LinearGradient fundsPrimaryGradient() => const LinearGradient(
        colors: [fundsGold, fundsGoldMid, fundsGoldDark],
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
      );

  static Color fundsPrimaryButtonForeground() => Colors.black;

  static Color fundsNoteFill(BuildContext context) =>
      _isDark(context) ? Colors.transparent : const Color(0xFFF9FAFB);

  // —— Profile (/profile) — mirrors [Profile.jsx] + [appTheme.js] surfaceElevated ——

  static const Color profileLightText = Color(0xFF111827);
  static const Color profileLightMuted = Color(0xFF6B7280);
  static const Color profileLightNested = Color(0xFFF9FAFB);
  static const Color profileDarkSurface = Color(0xFF141416);
  static const Color profileDarkNested = Color(0xFF1A1A1A);

  static Color profileText(BuildContext context) =>
      _isDark(context) ? lightGold : profileLightText;

  static Color profileMuted(BuildContext context, [double alpha = 1]) =>
      _isDark(context)
          ? mutedGold(alpha)
          : profileLightMuted.withValues(alpha: alpha);

  /// Wallet balance accent — [bidAccent] red-700 / red-300.
  static Color profileAccent(BuildContext context) =>
      _isDark(context) ? lightGold : supportRed700;

  static Color profileActive(BuildContext context) =>
      _isDark(context) ? const Color(0xFF34D399) : const Color(0xFF047857);

  static Color profileCardFill(BuildContext context) =>
      _isDark(context) ? Colors.transparent : Colors.white;

  static Color profileNestedFill(BuildContext context) =>
      _isDark(context) ? profileDarkNested : profileLightNested;

  static Color profileCardBorder(BuildContext context, {bool nested = false}) {
    if (_isDark(context)) {
      return Colors.white.withValues(alpha: nested ? 0.2 : 0.25);
    }
    return nested
        ? const Color(0x26111827)
        : const Color(0x33111827);
  }

  static Color profileIconBg(BuildContext context) =>
      _isDark(context)
          ? Colors.white.withValues(alpha: 0.06)
          : const Color(0xFFF3F4F6);

  static Color profileIconColor(BuildContext context) =>
      _isDark(context) ? const Color(0xFFF7F5F0) : const Color(0xFF374151);

  static List<BoxShadow> profileCardShadow(BuildContext context) {
    if (_isDark(context)) {
      return [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.22),
          blurRadius: 10,
          offset: const Offset(0, 2),
        ),
      ];
    }
    return [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.06),
        blurRadius: 8,
        offset: const Offset(0, 2),
      ),
    ];
  }

  static ShapeBorder profileCardShape(BuildContext context, {double radius = 16}) {
    return RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: BorderSide(color: profileCardBorder(context)),
    );
  }

  static LinearGradient profileAvatarGradient() => const LinearGradient(
        colors: [Color(0xFFFBBF24), Color(0xFFD97706)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );

  static BoxDecoration profileSectionDecoration(
    BuildContext context, {
    double radius = 16,
    bool nested = false,
  }) {
    return BoxDecoration(
      color: nested ? profileNestedFill(context) : profileCardFill(context),
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: profileCardBorder(context, nested: nested)),
      boxShadow: nested ? null : profileCardShadow(context),
    );
  }

  static InputDecorationThemeData inputDecorationFunds(BuildContext context) {
    final border = fundsCardBorder(context);
    final focus = fundsGold.withValues(alpha: 0.4);
    return Theme.of(context).inputDecorationTheme.copyWith(
          filled: true,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.inputPaddingH,
            vertical: AppSpacing.inputPaddingV,
          ),
          fillColor: fundsFieldFill(context),
          labelStyle: TextStyle(color: fundsMuted(context, 0.9), fontSize: 12.5),
          hintStyle: TextStyle(color: fundsMuted(context, 0.55), fontSize: 13),
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
            borderSide: BorderSide(color: focus, width: 2),
          ),
        );
  }

  // —— Support (/support) — mirrors [appTheme.js] bidSurface / bidAccent ——

  static const Color supportRed700 = Color(0xFFB91C1C);
  static const Color supportRed600 = Color(0xFFDC2626);
  static const Color supportRed300 = Color(0xFFFCA5A5);
  static const Color supportDarkSurface = Color(0xFF202329);

  static Color supportAccent(BuildContext context) =>
      _isDark(context) ? supportRed300 : supportRed700;

  static Color supportText(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _isDark(context) ? Colors.white : scheme.onSurface;
  }

  static Color supportMuted(BuildContext context, [double alpha = 1]) {
    final scheme = Theme.of(context).colorScheme;
    return _isDark(context)
        ? Colors.white.withValues(alpha: 0.55 * alpha)
        : scheme.onSurfaceVariant.withValues(alpha: alpha);
  }

  static Color supportFieldLabel(BuildContext context) =>
      _isDark(context)
          ? const Color(0xFFE5E7EB)
          : const Color(0xFF1F2937);

  static Color supportCardFill(BuildContext context) =>
      _isDark(context) ? supportDarkSurface : Colors.white;

  static Color supportCardBorder(BuildContext context) =>
      _isDark(context)
          ? Colors.white.withValues(alpha: 0.2)
          : const Color(0xFFFECACA);

  static ShapeBorder supportCardShape(BuildContext context, {double radius = 16}) {
    return RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: BorderSide(color: supportCardBorder(context)),
    );
  }

  static LinearGradient supportPrimaryGradient() => const LinearGradient(
        colors: [supportRed700, supportRed600],
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
      );

  static InputDecorationThemeData inputDecorationSupportForm(BuildContext context) {
    final base = Theme.of(context).inputDecorationTheme;
    final isDark = _isDark(context);
    final border = supportCardBorder(context);
    return base.copyWith(
      filled: true,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.inputPaddingH,
        vertical: AppSpacing.inputPaddingV,
      ),
      fillColor: isDark ? supportDarkSurface : Colors.white,
      labelStyle: TextStyle(color: supportFieldLabel(context)),
      hintStyle: TextStyle(color: supportMuted(context, 0.55)),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: isDark ? Colors.white.withValues(alpha: 0.35) : supportRed600,
          width: 2,
        ),
      ),
    );
  }

  /// Dark fill for text fields on the casino backdrop.
  static const Color fieldFill = AppColors.surfaceCard;

  /// Blur strength for frosted glass over [HomeCasinoBackdrop] / shell pages.
  static const double glassBlurSigma = 12;

  /// Frosted glass: blurs content behind, optional tint + border.
  static Widget backdropBlur({
    required Widget child,
    BorderRadius borderRadius = BorderRadius.zero,
    EdgeInsetsGeometry? padding,
    Color? fill,
    BoxBorder? border,
    List<BoxShadow>? boxShadow,
  }) {
    return ClipRRect(
      borderRadius: borderRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: glassBlurSigma, sigmaY: glassBlurSigma),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: fill ??
                AppColors.surfaceCard.withValues(alpha: 0.48),
            borderRadius: borderRadius,
            border: border,
            boxShadow: boxShadow,
          ),
          child: padding != null ? Padding(padding: padding, child: child) : child,
        ),
      ),
    );
  }

  static InputDecorationThemeData inputDecorationOnDark(BuildContext context) {
    final base = Theme.of(context).inputDecorationTheme;
    return base.copyWith(
      filled: true,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.inputPaddingH,
        vertical: AppSpacing.inputPaddingV,
      ),
      fillColor: fieldFill,
      labelStyle: TextStyle(color: mutedGold(0.88)),
      hintStyle: TextStyle(color: mutedGold(0.45)),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.gold.withValues(alpha: 0.34)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.gold.withValues(alpha: 0.34)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: AppColors.gold.withValues(alpha: 0.75),
          width: 2,
        ),
      ),
    );
  }

  /// Text fields on support form — mirrors frontend [bidInput].
  static InputDecorationThemeData inputDecorationSupport(BuildContext context) =>
      inputDecorationSupportForm(context);
}

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/casino_ui.dart';

/// Shared styling for all game / bid flows (dark casino + light theme).
abstract final class GameBidUi {
  static bool isLight(BuildContext context) =>
      Theme.of(context).brightness == Brightness.light;

  /// Primary body/label text on bid screens (black in light mode).
  static Color onSurface(BuildContext context) {
    if (isLight(context)) {
      return Theme.of(context).colorScheme.onSurface;
    }
    return Colors.white;
  }

  static Color onSurfaceMuted(BuildContext context, [double opacity = 1]) {
    if (isLight(context)) {
      return Theme.of(context)
          .colorScheme
          .onSurfaceVariant
          .withValues(alpha: opacity);
    }
    return CasinoUi.mutedGold(opacity);
  }

  /// Secondary row text (Type / session in bet lists).
  static Color listMetaTextColor(BuildContext context, [double opacity = 1]) =>
      onSurfaceMuted(context, opacity);

  /// ₹ points shown in “Your bets” / selected history rows.
  static Color listPointsTextColor(BuildContext context) => onSurface(context);

  static TextStyle listPointsTextStyle(BuildContext context) => TextStyle(
        color: listPointsTextColor(context),
        fontWeight: FontWeight.w600,
      );

  static Color deleteIconColor(BuildContext context) =>
      onSurface(context).withValues(alpha: isLight(context) ? 1 : 0.85);

  static const Map<String, String> quickPointsCoinAssets = {
    '10': 'assets/images/10RS.png',
    '20': 'assets/images/20RS.png',
    '30': 'assets/images/30RS.png',
    '40': 'assets/images/40RS.png',
    '50': 'assets/images/50RS.png',
  };

  /// Header/footer/divider and control outlines on bet screens (not neon green).
  static Color betChromeBorderColor(
    BuildContext context, {
    bool selected = false,
    bool focused = false,
  }) {
    if (isLight(context)) {
      final outline = Theme.of(context).colorScheme.outline;
      if (focused) return Theme.of(context).colorScheme.primary;
      return outline.withValues(alpha: selected ? 0.9 : 0.65);
    }
    if (focused) return Colors.white.withValues(alpha: 0.35);
    return CasinoUi.neutralShellBorderColor(alpha: selected ? 0.24 : 0.16);
  }

  static BorderSide betChromeBorderSide(
    BuildContext context, {
    bool selected = false,
    bool focused = false,
    double width = 1,
  }) {
    return BorderSide(
      color: betChromeBorderColor(
        context,
        selected: selected,
        focused: focused,
      ),
      width: focused ? 2 : width,
    );
  }

  static TextStyle sectionLabel(BuildContext context) => TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: isLight(context)
            ? AppColors.navyDark.withValues(alpha: 0.75)
            : onSurfaceMuted(context, 0.88),
      );

  static TextStyle emptyHint(BuildContext context) => TextStyle(
        fontSize: 12,
        color: onSurfaceMuted(context, isLight(context) ? 0.85 : 0.7),
      );

  static TextStyle tableHeader(BuildContext context) => TextStyle(
        fontWeight: FontWeight.w700,
        fontSize: 12,
        color: onSurface(context),
      );

  static TextStyle panelTitle(BuildContext context) => TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: onSurface(context),
      );

  /// Fallback for [Text] in bid bodies that omit [Text.style].
  static TextStyle bodyFallback(BuildContext context) =>
      TextStyle(color: onSurface(context));

  /// Explicit [TextField] style so typed text matches [onSurface].
  static TextStyle betInputStyle(
    BuildContext context, {
    double? fontSize,
    FontWeight? fontWeight,
  }) {
    return TextStyle(
      color: onSurface(context),
      fontSize: fontSize,
      fontWeight: fontWeight,
    );
  }

  /// Fallback / minimum square control size (used if width-based sizing is unavailable).
  static const double betChipSize = 32;

  /// Corner radius for digit tiles, quick-point chips, and list number badges (~8–12dp).
  static const double betChipRadius = 10;

  /// Neutral outline for all bet number chips (not green / gold trim).
  static Color numberChipBorderColor(
    BuildContext context, {
    bool selected = false,
  }) {
    if (isLight(context)) {
      final outline = Theme.of(context).colorScheme.outline;
      return outline.withValues(alpha: selected ? 0.9 : 0.55);
    }
    return CasinoUi.neutralShellBorderColor(alpha: selected ? 0.24 : 0.16);
  }

  /// Chip fill — light surfaces on light theme; charcoal on dark.
  static Color numberChipBackground(
    BuildContext context, {
    bool selected = false,
  }) {
    if (isLight(context)) {
      final scheme = Theme.of(context).colorScheme;
      return selected ? scheme.primaryContainer : scheme.surfaceContainer;
    }
    return selected
        ? Colors.white.withValues(alpha: 0.12)
        : AppColors.surfaceCard.withValues(alpha: 0.82);
  }

  /// Digit grid cells, bulk pickers, and other tappable number tiles.
  static BoxDecoration numberChipTileDecoration(
    BuildContext context, {
    required bool selected,
    BorderRadiusGeometry? borderRadius,
  }) {
    return BoxDecoration(
      color: numberChipBackground(context, selected: selected),
      borderRadius: borderRadius ?? BorderRadius.circular(betChipRadius),
      border: Border.all(
        color: numberChipBorderColor(context, selected: selected),
        width: 1,
      ),
    );
  }

  /// Caps [betTileExtentForColumns] so digit and quick-point tiles stay compact on wide phones.
  static const double betTileMaxExtent = 40;

  /// Inner padding for digit outline buttons and inline points fields on the same row.
  static const EdgeInsets betChipContentPadding = EdgeInsets.symmetric(
    horizontal: AppSpacing.chipPaddingH,
    vertical: AppSpacing.chipPaddingV,
  );

  /// Row control height — mirrors web `h-9` (36px) on single/double pana bulk.
  static const double bulkPanaInlineRowHeight = 36;

  /// Digit badge width — mirrors web `w-10` (40px); height is [bulkPanaInlineRowHeight].
  static const double bulkPanaDigitWidth = 40;

  /// Grid row extent — inline height + border breathing room.
  static const double bulkPanaGridRowExtent = bulkPanaInlineRowHeight + 4;

  /// Quick-point chips on bulk pana screens (square, same as row height).
  static const double bulkPanaDigitExtent = bulkPanaInlineRowHeight;

  static const EdgeInsets bulkPanaSumGroupPadding = EdgeInsets.symmetric(
    horizontal: 12,
    vertical: 10,
  );

  /// Pts field padding inside fixed-height slots.
  static const EdgeInsets bulkPanaPointsFieldPadding = EdgeInsets.symmetric(
    horizontal: 6,
    vertical: 2,
  );

  static const double bulkPanaFieldRadius = 8;

  /// Digit cell: default **square** [bulkPanaDigitExtent] × [bulkPanaInlineRowHeight] (standard button size).
  static Widget bulkPanaDigitChip(
    BuildContext context, {
    required String label,
    double chipWidth = bulkPanaDigitWidth,
  }) {
    return SizedBox(
      width: chipWidth,
      height: bulkPanaInlineRowHeight,
      child: DecoratedBox(
        decoration: numberChipTileDecoration(context, selected: false),
        child: Center(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: onSurface(context),
              fontWeight: FontWeight.w600,
              fontSize: chipWidth >= bulkPanaDigitExtent ? 13 : 12,
            ),
          ),
        ),
      ),
    );
  }

  /// Responsive extent for digit tiles, framed number badges, quick-point chips, and
  /// adjacent points [TextField] height — keeps **number chip height == points row height**.
  static double betControlExtent(BuildContext context) => defaultBetTileExtent(context);

  /// Width and height for one grid cell with [columns] across the screen.
  /// Assumes parent [ListView] uses `padding: EdgeInsets.all(12)` → 24 horizontal inset.
  static double betTileExtentForColumns(
    double viewportWidth, {
    int columns = 5,
    double horizontalPadding = 24,
    double crossAxisSpacing = 8,
  }) {
    if (columns <= 0) return betChipSize;
    final inner = viewportWidth - horizontalPadding;
    if (inner <= 0) return betChipSize;
    final gaps = crossAxisSpacing * (columns - 1);
    final raw = (inner - gaps) / columns;
    final floored = math.max(betChipSize * 0.75, raw);
    return math.min(floored, betTileMaxExtent);
  }

  /// Same extent as a typical 5-column digit grid; use for quick points and paired points fields.
  /// Prefer the alias [betControlExtent] when pairing number chips with points rectangles.
  static double defaultBetTileExtent(BuildContext context) =>
      betTileExtentForColumns(MediaQuery.sizeOf(context).width);

  /// Prefer [glassPanel] for backdrop blur on the casino shell.
  static BoxDecoration panelDecoration({double radius = 16}) => BoxDecoration(
        gradient: AppColors.cardBackgroundGradient,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.14),
          width: 1,
        ),
      );

  /// Prefer [glassListRow] for backdrop blur.
  static BoxDecoration listRowDecoration({double radius = 8}) => BoxDecoration(
        gradient: AppColors.cardBackgroundGradient,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      );

  static Widget glassPanel({
    required Widget child,
    double radius = 16,
    EdgeInsetsGeometry? padding,
  }) {
    final r = BorderRadius.circular(radius);
    final core = CasinoUi.backdropBlur(
      borderRadius: r,
      padding: padding,
      fill: AppColors.surfaceCard.withValues(alpha: 0.5),
      border: Border.all(color: Colors.white.withValues(alpha: 0.14), width: 1),
      child: child,
    );
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: r,
        gradient: AppColors.cardBackgroundGradient,
      ),
      child: core,
    );
  }

  static Widget glassListRow({
    required Widget child,
    double radius = 8,
    EdgeInsetsGeometry padding = EdgeInsets.zero,
    EdgeInsetsGeometry? margin,
  }) {
    final r = BorderRadius.circular(radius);
    final core = CasinoUi.backdropBlur(
      borderRadius: r,
      padding: padding,
      fill: AppColors.surfaceCard.withValues(alpha: 0.48),
      border: Border.all(color: Colors.white.withValues(alpha: 0.12), width: 1),
      child: child,
    );
    if (margin != null) return Padding(padding: margin, child: core);
    return core;
  }

  static BoxDecoration digitBadgeDecoration(
    BuildContext context, {
    double radius = betChipRadius,
  }) =>
      numberChipTileDecoration(
        context,
        selected: false,
        borderRadius: BorderRadius.circular(radius),
      );

  /// Square number label (list/special rows). Pair with [inlinePointsDecoration] inside
  /// `SizedBox(height: extent, child: TextField(...))` so heights match [extent].
  static Widget betNumberChip(
    BuildContext context, {
    required String label,
    required double extent,
    TextStyle? textStyle,
    BoxDecoration? decoration,
  }) {
    return SizedBox(
      width: extent,
      height: extent,
      child: DecoratedBox(
        decoration: decoration ?? digitBadgeDecoration(context),
        child: Center(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: textStyle ??
                TextStyle(
                  color: onSurface(context),
                  fontWeight: FontWeight.w600,
                  fontSize: extent >= 36 ? 14 : 12,
                ),
          ),
        ),
      ),
    );
  }

  /// Fixed-height slot for an inline points field next to a [betNumberChip] / digit tile.
  static Widget betPointsRectangleSlot({
    required double extent,
    required Widget child,
  }) {
    return SizedBox(
      height: extent,
      child: Align(
        alignment: Alignment.center,
        child: child,
      ),
    );
  }

  /// Vertically centers a full-width digit + Pts row in a bulk pana grid cell.
  static Widget bulkPanaGridCell({required Widget child}) {
    return SizedBox(
      height: bulkPanaGridRowExtent,
      width: double.infinity,
      child: Center(child: child),
    );
  }

  /// Column body inside [bulkPanaSumGroupCard] — full width, rows vertically centered.
  static Widget bulkPanaSumGroupBody({required List<Widget> children}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: children,
    );
  }

  /// Single-digit **special mode** pair: same outline/radius/fill strategy so digit and points
  /// cells match height (grid row should use [crossAxisAlignment: CrossAxisAlignment.stretch]).
  static BoxDecoration betNeonPairCellDecoration(
    BuildContext context, {
    required Color fillColor,
  }) {
    return BoxDecoration(
      color: fillColor,
      borderRadius: BorderRadius.circular(betChipRadius),
      border: Border.all(color: numberChipBorderColor(context), width: 1),
    );
  }

  static Color _fieldFill(BuildContext context) =>
      isLight(context)
          ? Theme.of(context).colorScheme.surfaceContainerHigh
          : CasinoUi.fieldFill;

  static Widget betNeonPairDigit(
    BuildContext context, {
    required String digit,
    required double extent,
  }) {
    return SizedBox(
      width: extent,
      child: Container(
        decoration: betNeonPairCellDecoration(
          context,
          fillColor: numberChipBackground(context, selected: false),
        ),
        clipBehavior: Clip.antiAlias,
        alignment: Alignment.center,
        child: Text(
          digit,
          style: TextStyle(
            color: onSurface(context),
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  static Widget betNeonPairPointsField(
    BuildContext context, {
    required TextEditingController controller,
    ValueChanged<String>? onChanged,
    TextInputType? keyboardType,
    TextInputAction? textInputAction,
    VoidCallback? onEditingComplete,
    ValueChanged<String>? onSubmitted,
  }) {
    return Container(
      decoration: betNeonPairCellDecoration(context, fillColor: _fieldFill(context)),
      clipBehavior: Clip.antiAlias,
      alignment: Alignment.center,
      child: TextField(
        controller: controller,
        keyboardType: keyboardType ?? TextInputType.number,
        textInputAction: textInputAction ?? TextInputAction.done,
        textAlign: TextAlign.center,
        textAlignVertical: TextAlignVertical.center,
        onChanged: onChanged,
        onEditingComplete: onEditingComplete,
        onSubmitted: onSubmitted,
        style: betInputStyle(context, fontSize: 14, fontWeight: FontWeight.w600),
        decoration: InputDecoration(
          isDense: true,
          hintText: 'Points',
          hintStyle: TextStyle(color: onSurfaceMuted(context, 0.55)),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          filled: false,
          contentPadding: betChipContentPadding,
        ),
      ),
    );
  }

  static InputDecorationThemeData inputDecorationBetChrome(BuildContext context) {
    final light = isLight(context);
    final scheme = Theme.of(context).colorScheme;
    final border = betChromeBorderColor(context);
    final focused = betChromeBorderColor(context, focused: true);
    final radius = BorderRadius.circular(12);
    return Theme.of(context).inputDecorationTheme.copyWith(
          filled: true,
          isDense: true,
          fillColor: _fieldFill(context),
          labelStyle: TextStyle(
            color: light ? scheme.onSurfaceVariant : onSurfaceMuted(context, 0.88),
          ),
          hintStyle: TextStyle(
            color: onSurfaceMuted(context, light ? 0.6 : 0.55),
          ),
          border: OutlineInputBorder(
            borderRadius: radius,
            borderSide: BorderSide(color: border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: radius,
            borderSide: BorderSide(color: border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: radius,
            borderSide: BorderSide(color: focused, width: 2),
          ),
        );
  }

  static InputDecoration inputDecoration(
    BuildContext context, {
    required String labelText,
    String? hintText,
    String? counterText,
  }) {
    final light = isLight(context);
    final scheme = Theme.of(context).colorScheme;
    final border = betChromeBorderColor(context);
    final focused = betChromeBorderColor(context, focused: true);
    return InputDecoration(
      labelText: labelText,
      hintText: hintText,
      counterText: counterText,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.inputPaddingH,
        vertical: AppSpacing.inputPaddingV,
      ),
      filled: true,
      fillColor: _fieldFill(context),
      labelStyle: TextStyle(
        color: light ? scheme.onSurfaceVariant : onSurfaceMuted(context, 0.88),
      ),
      hintStyle: TextStyle(
        color: onSurfaceMuted(context, light ? 0.6 : 0.55),
      ),
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
        borderSide: BorderSide(color: focused, width: 2),
      ),
    );
  }

  /// Dense field used inside special-mode grids (same horizontal/vertical inset as [outlineDigit]).
  static InputDecoration inlinePointsDecoration(BuildContext context) {
    final border = betChromeBorderColor(context);
    final focused = betChromeBorderColor(context, focused: true);
    return InputDecoration(
      isDense: true,
      hintText: 'Points',
      filled: true,
      fillColor: _fieldFill(context),
      hintStyle: TextStyle(color: onSurfaceMuted(context, 0.55)),
      contentPadding: betChipContentPadding,
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
        borderSide: BorderSide(color: focused, width: 2),
      ),
    );
  }

  static ButtonStyle modeToggle(BuildContext context, bool selected) {
    final light = isLight(context);
    final scheme = Theme.of(context).colorScheme;
    return OutlinedButton.styleFrom(
      backgroundColor: selected
          ? (light ? scheme.surfaceContainerHighest : Colors.white.withValues(alpha: 0.08))
          : Colors.transparent,
      foregroundColor: selected
          ? onSurface(context)
          : onSurfaceMuted(context, light ? 0.75 : 0.7),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.buttonPaddingH,
        vertical: AppSpacing.buttonPaddingV,
      ),
      minimumSize: const Size(0, AppSpacing.buttonMinHeight),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
      side: BorderSide(
        color: light
            ? scheme.outline.withValues(alpha: selected ? 0.95 : 0.55)
            : Colors.white.withValues(alpha: selected ? 0.24 : 0.14),
        width: 1.5,
      ),
    );
  }

  /// Digit grid key. Pass [extent] from [betControlExtent] / [defaultBetTileExtent] so the
  /// button matches quick points and adjacent points field height.
  static ButtonStyle outlineDigit(
    BuildContext context,
    bool selected, {
    double? extent,
  }) {
    final square = extent != null ? Size(extent, extent) : null;
    return OutlinedButton.styleFrom(
      backgroundColor: numberChipBackground(context, selected: selected),
      foregroundColor: onSurface(context),
      padding: betChipContentPadding,
      minimumSize: square ?? Size(0, betChipSize),
      maximumSize: square,
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
      side: BorderSide(
        color: numberChipBorderColor(context, selected: selected),
        width: 1,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(betChipRadius),
      ),
    );
  }

  /// Label/icon on [primaryFilled] buttons (dark gold bar, light text).
  static const Color primaryFilledForeground = Color(0xFF02120A);

  /// Submit / Generate / Add to list (and footer submit) on dark bet chrome.
  static ButtonStyle primaryFilled({double? minHeight}) => FilledButton.styleFrom(
        backgroundColor: AppColors.neonGreenDeep,
        foregroundColor: primaryFilledForeground,
        disabledForegroundColor: const Color(0xFF9AA5A0),
        disabledBackgroundColor: AppColors.neonGreenDeep.withValues(alpha: 0.45),
        // [Size.fromHeight] uses infinite width as minimum — invalid inside [Row]s.
        minimumSize: Size(0, minHeight ?? AppSpacing.buttonMinHeight),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.buttonPaddingH,
          vertical: AppSpacing.buttonPaddingV,
        ),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        visualDensity: VisualDensity.compact,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      );

  static TextStyle quickPointsLabelStyle(BuildContext context) => TextStyle(
        color: onSurface(context),
        fontWeight: FontWeight.w600,
        fontSize: 13,
      );

  /// Clear beside “Quick points” rows.
  static ButtonStyle quickPointsClearTextButtonStyle(BuildContext context) =>
      TextButton.styleFrom(
        foregroundColor: onSurface(context),
        disabledForegroundColor: onSurfaceMuted(context, 0.38),
        minimumSize: const Size(0, AppSpacing.buttonMinHeight),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.buttonPaddingV,
        ),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        visualDensity: VisualDensity.compact,
      );

  /// Vertical gap after the points [TextField] and before the “Quick points” row.
  static const double quickPointsAfterFieldGap = 4;

  /// Vertical gap between the “Quick points” row and the preset chip [Wrap].
  static const double quickPointsHeaderToChipsGap = 3;

  /// Outlined Clear on bet chrome (bulk rows, motor bars, etc.).
  static ButtonStyle quickPointsClearOutlinedStyle(
    BuildContext context, {
    double? minHeight,
  }) {
    final light = isLight(context);
    final scheme = Theme.of(context).colorScheme;
    return OutlinedButton.styleFrom(
      foregroundColor: onSurface(context),
      disabledForegroundColor: onSurfaceMuted(context, 0.38),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.buttonPaddingH,
        vertical: AppSpacing.buttonPaddingV,
      ),
      side: BorderSide(
        color: light
            ? scheme.outline.withValues(alpha: 0.7)
            : Colors.white.withValues(alpha: 0.16),
      ),
      minimumSize: Size(0, minHeight ?? AppSpacing.buttonMinHeight),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    );
  }

  /// Quick-point presets: transparent fill + gold outline (Material 3 [FilterChip] fills are not reliably transparent).
  static Widget quickPointsChip({
    required bool selected,
    required String label,
    required ValueChanged<bool> onSelected,
    double? extent,
  }) {
    return _QuickPointsChipTile(
      selected: selected,
      label: label,
      onSelected: onSelected,
      extent: extent,
    );
  }

  static Widget quickPointsChoiceChip({
    required bool selected,
    required String label,
    required ValueChanged<bool> onSelected,
    double? extent,
  }) {
    return _QuickPointsChipTile(
      selected: selected,
      label: label,
      onSelected: onSelected,
      extent: extent,
    );
  }

  /// Dense grid inputs (e.g. Jodi bulk).
  /// Jodi Bulk matrix cells — transparent when empty; light tint when filled.
  static Color bulkMatrixCellFill(
    BuildContext context, {
    bool hasPoints = false,
  }) {
    if (isLight(context)) {
      if (hasPoints) return const Color(0xFFF9FAFB);
      return Colors.transparent;
    }
    if (hasPoints) {
      return Colors.white.withValues(alpha: 0.08);
    }
    return CasinoUi.fieldFill;
  }

  static OutlineInputBorder bulkMatrixCellBorder(
    BuildContext context, {
    bool hasPoints = false,
    double radius = 6,
  }) {
    final light = isLight(context);
    Color borderColor;
    if (light && hasPoints) {
      borderColor = const Color(0xFFFCA5A5);
    } else if (light) {
      borderColor = Theme.of(context).colorScheme.outline.withValues(alpha: 0.65);
    } else {
      borderColor = Colors.white.withValues(alpha: hasPoints ? 0.25 : 0.16);
    }
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(radius),
      borderSide: BorderSide(color: borderColor),
    );
  }

  /// "Pts" / "P" placeholder on bulk matrix inputs — black in light mode.
  static TextStyle bulkMatrixPtsHintStyle(
    BuildContext context, {
    required double fontSize,
  }) {
    return TextStyle(
      fontSize: fontSize,
      color: isLight(context) ? Colors.black : onSurfaceMuted(context, 0.55),
    );
  }

  /// Single / double pana bulk sum-group cards — transparent + border + shadow.
  static BoxDecoration bulkPanaSumGroupDecoration(
    BuildContext context, {
    double radius = 12,
  }) {
    return BoxDecoration(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(
        color: isLight(context)
            ? CasinoUi.profileCardBorder(context)
            : CasinoUi.neutralShellBorderColor(alpha: 0.28),
      ),
      boxShadow: CasinoUi.profileCardShadow(context),
    );
  }

  /// Wraps a sum-digit section so border/shadow clip cleanly to content height.
  static Widget bulkPanaSumGroupCard({
    required BuildContext context,
    required Widget child,
  }) {
    return Container(
      clipBehavior: Clip.antiAlias,
      padding: bulkPanaSumGroupPadding,
      decoration: bulkPanaSumGroupDecoration(context),
      alignment: Alignment.center,
      child: child,
    );
  }

  static OutlineInputBorder cellBorder(
    BuildContext context, {
    double radius = 6,
  }) {
    final light = isLight(context);
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(radius),
      borderSide: BorderSide(
        color: light
            ? Theme.of(context).colorScheme.outline.withValues(alpha: 0.65)
            : Colors.white.withValues(alpha: 0.16),
      ),
    );
  }
}

class _QuickPointsChipTile extends StatelessWidget {
  const _QuickPointsChipTile({
    required this.selected,
    required this.label,
    required this.onSelected,
    this.extent,
  });

  final bool selected;
  final String label;
  final ValueChanged<bool> onSelected;
  final double? extent;

  @override
  Widget build(BuildContext context) {
    final side = BorderSide(
      color: GameBidUi.numberChipBorderColor(context, selected: selected),
      width: 1,
    );
    final s = extent ?? GameBidUi.betChipSize;
    final coinAsset = GameBidUi.quickPointsCoinAssets[label];
    final labelStyle = GameBidUi.quickPointsLabelStyle(context);
    return Theme(
      data: Theme.of(context).copyWith(
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        hoverColor: Colors.transparent,
      ),
      child: SizedBox(
        width: s,
        height: s,
        child: OutlinedButton(
          onPressed: () => onSelected(!selected),
          style: ButtonStyle(
            backgroundColor: WidgetStatePropertyAll<Color>(
              GameBidUi.numberChipBackground(context, selected: selected),
            ),
            foregroundColor: WidgetStatePropertyAll<Color>(GameBidUi.onSurface(context)),
            shadowColor: const WidgetStatePropertyAll<Color>(Colors.transparent),
            surfaceTintColor: const WidgetStatePropertyAll<Color>(Colors.transparent),
            overlayColor: const WidgetStatePropertyAll<Color>(Colors.transparent),
            elevation: const WidgetStatePropertyAll<double>(0),
            padding: const WidgetStatePropertyAll(EdgeInsets.zero),
            minimumSize: WidgetStatePropertyAll(Size(s, s)),
            maximumSize: WidgetStatePropertyAll(Size(s, s)),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            visualDensity: VisualDensity.compact,
            shape: WidgetStatePropertyAll(
              RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(GameBidUi.betChipRadius),
                side: side,
              ),
            ),
          ),
          child: Center(
            child: coinAsset != null
                ? Image.asset(
                    coinAsset,
                    width: s * 0.78,
                    height: s * 0.78,
                    fit: BoxFit.contain,
                    errorBuilder: (_, _, _) => Text(
                      label,
                      style: labelStyle,
                      textAlign: TextAlign.center,
                    ),
                  )
                : Text(label, style: labelStyle, textAlign: TextAlign.center),
          ),
        ),
      ),
    );
  }
}

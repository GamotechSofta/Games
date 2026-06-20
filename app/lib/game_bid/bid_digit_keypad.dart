import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Keyboard-style digit keys — [Games/frontend/.../BidDigitKeypad.jsx] + `.bid-dial-key`.
enum BidDigitKeypadSize { sm, md, lg }

/// Single 0–9 dial key (pink gradient, square).
class BetDialKey extends StatefulWidget {
  const BetDialKey({
    super.key,
    required this.digit,
    required this.onPressed,
    this.selected = false,
    this.disabled = false,
    this.pointsBadge,
    this.showPointsBadge = true,
    this.size,
  });

  final int digit;
  final VoidCallback? onPressed;
  final bool selected;
  final bool disabled;
  final num? pointsBadge;
  final bool showPointsBadge;
  final double? size;

  @override
  State<BetDialKey> createState() => _BetDialKeyState();
}

class _BetDialKeyState extends State<BetDialKey> {
  bool _flash = false;

  void _handleTap() {
    if (widget.disabled || widget.onPressed == null) return;
    HapticFeedback.lightImpact();
    setState(() => _flash = true);
    widget.onPressed!();
    Future.delayed(const Duration(milliseconds: 420), () {
      if (mounted) setState(() => _flash = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final picked = widget.selected;
    final glow = _flash || picked;
    final pts = widget.pointsBadge ?? 0;
    final showPts = widget.showPointsBadge && pts > 0;

    final top = isDark ? const Color(0xFFF87171) : const Color(0xFFFCA5A5);
    final mid = const Color(0xFFEF4444);
    final bot = isDark ? const Color(0xFFB91C1C) : const Color(0xFFDC2626);
    final border = picked
        ? (isDark ? Colors.white.withValues(alpha: 0.86) : Colors.black.withValues(alpha: 0.78))
        : (isDark
            ? Colors.white.withValues(alpha: 0.14)
            : const Color(0xFF7F1D1D).withValues(alpha: 0.52));

    final fontSize = widget.size != null && widget.size! >= 44 ? 22.0 : 18.0;

    return Opacity(
      opacity: widget.disabled ? 0.72 : 1,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.disabled ? null : _handleTap,
          borderRadius: BorderRadius.circular(10),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
            transform: glow ? (Matrix4.translationValues(0, -1, 0)) : Matrix4.identity(),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: widget.disabled
                    ? [top.withValues(alpha: 0.7), mid.withValues(alpha: 0.7), bot.withValues(alpha: 0.7)]
                    : [top, mid, bot],
                stops: const [0, 0.48, 1],
              ),
              border: Border.all(color: border, width: picked ? 2 : 1.5),
              boxShadow: [
                BoxShadow(
                  color: (isDark ? const Color(0xFFB91C1C) : const Color(0xFFDC2626))
                      .withValues(alpha: glow ? 0.38 : 0.28),
                  blurRadius: glow ? 14 : 8,
                  offset: const Offset(0, 3),
                ),
                if (glow)
                  BoxShadow(
                    color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.28),
                    blurRadius: 0,
                    spreadRadius: 1,
                  ),
              ],
            ),
            child: AspectRatio(
              aspectRatio: 1,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Text(
                    '${widget.digit}',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: fontSize,
                      fontWeight: picked ? FontWeight.w900 : FontWeight.w800,
                      height: 1,
                      letterSpacing: -0.5,
                      shadows: const [
                        Shadow(
                          color: Color(0x47000000),
                          offset: Offset(0, 1),
                          blurRadius: 2,
                        ),
                      ],
                    ),
                  ),
                  if (showPts)
                    Positioned(
                      top: 3,
                      right: 4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.35),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          pts > 999 ? '999+' : '${pts.toInt()}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 0–9 pad in two rows (5 + 5) — web [BidDigitKeypad].
class BidDigitKeypad extends StatelessWidget {
  const BidDigitKeypad({
    super.key,
    this.disabled = false,
    this.digits = const [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    this.selectedDigits = const {},
    this.pointsByDigit = const {},
    required this.onDigitClick,
    this.showPointsBadge = true,
    this.size = BidDigitKeypadSize.md,
    this.gap = 6,
  });

  final bool disabled;
  final List<int> digits;
  final Set<String> selectedDigits;
  final Map<int, num> pointsByDigit;
  final ValueChanged<int> onDigitClick;
  final bool showPointsBadge;
  final BidDigitKeypadSize size;
  final double gap;

  @override
  Widget build(BuildContext context) {
    final rows = <List<int>>[];
    for (var i = 0; i < digits.length; i += 5) {
      rows.add(digits.sublist(i, i + 5 > digits.length ? digits.length : i + 5));
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var r = 0; r < rows.length; r++) ...[
          if (r > 0) SizedBox(height: gap),
          Row(
            children: [
              for (var c = 0; c < rows[r].length; c++) ...[
                if (c > 0) SizedBox(width: gap),
                Expanded(
                  child: BetDialKey(
                    digit: rows[r][c],
                    disabled: disabled,
                    selected: selectedDigits.contains('${rows[r][c]}'),
                    pointsBadge: pointsByDigit[rows[r][c]],
                    showPointsBadge: showPointsBadge,
                    onPressed: disabled ? null : () => onDigitClick(rows[r][c]),
                  ),
                ),
              ],
              // Pad incomplete last row
              for (var pad = rows[r].length; pad < 5; pad++) ...[
                SizedBox(width: gap),
                const Expanded(child: SizedBox.shrink()),
              ],
            ],
          ),
        ],
      ],
    );
  }
}

/// Full numpad for typing bet numbers (read-only field + dial keys).
class BidBetNumpad extends StatelessWidget {
  const BidBetNumpad({
    super.key,
    required this.controller,
    required this.maxLength,
    this.onChanged,
    this.disabled = false,
  });

  final TextEditingController controller;
  final int maxLength;
  final VoidCallback? onChanged;
  final bool disabled;

  void _appendDigit(int d) {
    if (disabled) return;
    final cur = controller.text;
    if (cur.length >= maxLength) return;
    controller.text = '$cur$d';
    controller.selection = TextSelection.collapsed(offset: controller.text.length);
    onChanged?.call();
  }

  void _backspace() {
    if (disabled || controller.text.isEmpty) return;
    controller.text = controller.text.substring(0, controller.text.length - 1);
    controller.selection = TextSelection.collapsed(offset: controller.text.length);
    onChanged?.call();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BidDigitKeypad(
          disabled: disabled,
          digits: const [1, 2, 3, 4, 5, 6, 7, 8, 9],
          onDigitClick: _appendDigit,
          showPointsBadge: false,
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              flex: 2,
              child: BetDialKey(
                digit: 0,
                disabled: disabled,
                showPointsBadge: false,
                onPressed: disabled ? null : () => _appendDigit(0),
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: disabled ? null : _backspace,
                  borderRadius: BorderRadius.circular(10),
                  child: Builder(
                    builder: (context) {
                      final light = Theme.of(context).brightness == Brightness.light;
                      final scheme = Theme.of(context).colorScheme;
                      return Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          color: light
                              ? scheme.surfaceContainerHigh
                              : Colors.white.withValues(alpha: 0.08),
                          border: Border.all(
                            color: light
                                ? scheme.outline.withValues(alpha: 0.55)
                                : Colors.white.withValues(alpha: 0.2),
                          ),
                        ),
                        child: AspectRatio(
                          aspectRatio: 1,
                          child: Icon(
                            Icons.backspace_outlined,
                            color: light ? scheme.onSurface : Colors.white,
                            size: 22,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

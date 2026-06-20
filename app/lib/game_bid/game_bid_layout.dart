import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../constants/remote_assets.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/casino_ui.dart';
import '../utils/market_timing.dart';
import 'betting_window_scope.dart';
import 'game_bid_ui.dart';

class GameBidLayout extends StatelessWidget {
  const GameBidLayout({
    super.key,
    required this.market,
    required this.title,
    required this.body,
    required this.bidsCount,
    required this.totalPoints,
    required this.session,
    required this.onSessionChanged,
    required this.selectedDateYmd,
    required this.onDateChanged,
    required this.onBack,
    required this.walletBalance,
    this.onSubmit,
    this.hideFooter = false,
    this.submitLabel = 'Submit Bets',
    this.sessionOptionsOverride,
    this.lockSession = false,
  });

  final Map<String, dynamic> market;
  final String title;
  final Widget body;
  final int bidsCount;
  final int totalPoints;
  final String session;
  final ValueChanged<String> onSessionChanged;
  final String selectedDateYmd;
  final ValueChanged<String> onDateChanged;
  final VoidCallback onBack;
  final double walletBalance;
  final VoidCallback? onSubmit;
  final bool hideFooter;
  final String submitLabel;
  final List<String>? sessionOptionsOverride;
  final bool lockSession;

  @override
  Widget build(BuildContext context) {
    final win = BettingWindowScope.of(context);
    final light = Theme.of(context).brightness == Brightness.light;
    final scheme = Theme.of(context).colorScheme;
    final headerText = GameBidUi.onSurface(context);
    final mutedHeader = GameBidUi.onSurfaceMuted(context, light ? 0.85 : 0.65);
    final headerFill = light
        ? scheme.surfaceContainer.withValues(alpha: 0.98)
        : const Color(0xFF0A0908).withValues(alpha: 0.36);
    final footerFill = light
        ? scheme.surfaceContainer.withValues(alpha: 0.98)
        : const Color(0xFF0A0908).withValues(alpha: 0.40);
    final fieldFill = light ? scheme.surfaceContainerHigh : CasinoUi.fieldFill;
    final gameName = (market['gameName'] ?? market['marketName'] ?? '').toString();
    final headerTitle = gameName.isNotEmpty ? '$gameName - $title' : title;
    final minDate = getTodayIst();
    final isToday = selectedDateYmd == minDate;
    final isScheduled = selectedDateYmd.compareTo(minDate) > 0;
    final isRunning = market['status']?.toString() == 'running';

    final sessionOptions = sessionOptionsOverride != null && sessionOptionsOverride!.isNotEmpty
        ? sessionOptionsOverride!
        : (isToday && (isRunning || win.closeOnly) ? ['CLOSE'] : ['OPEN', 'CLOSE']);

    final shellBorder = GameBidUi.betChromeBorderSide(context, width: 1.5);
    final controlBorder = GameBidUi.betChromeBorderColor(context);

    return ColoredBox(
      color: Colors.transparent,
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _SessionValiditySync(
              session: session,
              sessionOptions: sessionOptions,
              onSessionChanged: onSessionChanged,
            ),
            CasinoUi.backdropBlur(
              borderRadius: BorderRadius.zero,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              fill: headerFill,
              border: Border(bottom: shellBorder),
              child: Row(
                children: [
                  IconButton(
                    onPressed: onBack,
                    icon: const Icon(Icons.arrow_back, size: 20),
                    color: headerText,
                  ),
                  Expanded(
                    child: Text(
                      headerTitle,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: headerText,
                      ),
                    ),
                  ),
                  CasinoUi.backdropBlur(
                    borderRadius: BorderRadius.circular(20),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    fill: light ? scheme.surfaceContainerHigh : const Color(0xFF0A0908).withValues(alpha: 0.40),
                    border: Border.all(color: controlBorder, width: 1.5),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Image.network(
                          RemoteAssets.walletIcon,
                          width: 20,
                          height: 20,
                          errorBuilder: (_, _, _) => Icon(
                            Icons.wallet,
                            size: 18,
                            color: light ? scheme.primary : GameBidUi.onSurface(context),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '₹${walletBalance.toStringAsFixed(1)}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: headerText,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (!win.allowed && win.message != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.accentRose.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.accentRose.withValues(alpha: 0.45)),
                  ),
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, color: AppColors.accentRose.withValues(alpha: 0.95)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          win.message!,
                          style: TextStyle(
                            color: GameBidUi.onSurface(context),
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      alignment: Alignment.center,
                      constraints: const BoxConstraints(minHeight: AppSpacing.buttonMinHeight),
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.buttonPaddingH,
                        vertical: AppSpacing.buttonPaddingV,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: controlBorder),
                        color: light ? scheme.surfaceContainer : null,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.calendar_today,
                            size: 16,
                            color: light ? scheme.primary : GameBidUi.onSurface(context),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              isScheduled ? '$selectedDateYmd · scheduled' : selectedDateYmd,
                              textAlign: TextAlign.center,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontWeight: FontWeight.bold, color: headerText),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Theme(
                      data: Theme.of(context).copyWith(
                        dropdownMenuTheme: DropdownMenuThemeData(
                          menuStyle: MenuStyle(
                            backgroundColor: WidgetStateProperty.all(fieldFill),
                          ),
                        ),
                      ),
                      child: DropdownButtonFormField<String>(
                        key: ValueKey<String>('${session}_${sessionOptions.join()}'),
                        initialValue: sessionOptions.contains(session) ? session : sessionOptions.first,
                        dropdownColor: fieldFill,
                        style: TextStyle(color: headerText, fontWeight: FontWeight.w600, fontSize: 14),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: fieldFill,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: controlBorder),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: controlBorder),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                              color: GameBidUi.betChromeBorderColor(context, focused: true),
                              width: 2,
                            ),
                          ),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.inputPaddingH,
                            vertical: AppSpacing.inputPaddingV,
                          ),
                        ),
                        items: sessionOptions
                            .map(
                              (e) => DropdownMenuItem(
                                value: e,
                                child: Text(
                                  e,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: headerText),
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (lockSession || (isToday && isRunning && sessionOptionsOverride == null))
                            ? null
                            : (v) {
                                if (v != null) onSessionChanged(v);
                              },
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Theme(
                data: Theme.of(context).copyWith(
                  inputDecorationTheme: GameBidUi.inputDecorationBetChrome(context),
                  textTheme: light
                      ? Theme.of(context).textTheme
                      : Theme.of(context).textTheme.apply(
                          bodyColor: Colors.white,
                          displayColor: Colors.white,
                        ),
                ),
                child: DefaultTextStyle(
                  style: GameBidUi.bodyFallback(context),
                  child: body,
                ),
              ),
            ),
            if (!hideFooter)
              SafeArea(
                top: false,
                child: CasinoUi.backdropBlur(
                  borderRadius: BorderRadius.zero,
                  fill: footerFill,
                  border: Border(top: shellBorder),
                  boxShadow: light
                      ? null
                      : [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.35),
                            blurRadius: 12,
                            offset: const Offset(0, -4),
                          ),
                        ],
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                  child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('Bets', style: TextStyle(fontSize: 10, color: mutedHeader)),
                              Text(
                                '$bidsCount',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: headerText,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('Points', style: TextStyle(fontSize: 10, color: mutedHeader)),
                              Text(
                                '$totalPoints',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: headerText,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          flex: 2,
                          child: FilledButton(
                            onPressed: (onSubmit == null ||
                                    bidsCount == 0 ||
                                    !win.allowed ||
                                    !sessionOptions.contains(session))
                                ? null
                                : onSubmit,
                            style: GameBidUi.primaryFilled(),
                            child: Text(submitLabel, textAlign: TextAlign.center),
                          ),
                        ),
                      ],
                    ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// When OPEN is no longer available (running / close-only window), updates the parent
/// [session] via [onSessionChanged]. The dropdown can show CLOSE from [initialValue]
/// while the bid screen state still said OPEN, so every line was submitted as open.
class _SessionValiditySync extends StatefulWidget {
  const _SessionValiditySync({
    required this.session,
    required this.sessionOptions,
    required this.onSessionChanged,
  });

  final String session;
  final List<String> sessionOptions;
  final ValueChanged<String> onSessionChanged;

  @override
  State<_SessionValiditySync> createState() => _SessionValiditySyncState();
}

class _SessionValiditySyncState extends State<_SessionValiditySync> {
  @override
  void initState() {
    super.initState();
    _syncAfterFrameIfNeeded();
  }

  @override
  void didUpdateWidget(covariant _SessionValiditySync oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncAfterFrameIfNeeded();
  }

  void _syncAfterFrameIfNeeded() {
    final opts = widget.sessionOptions;
    if (opts.isEmpty) return;
    if (opts.contains(widget.session)) return;
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (opts.contains(widget.session)) return;
      widget.onSessionChanged(opts.first);
    });
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}

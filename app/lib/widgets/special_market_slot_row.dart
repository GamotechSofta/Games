import 'package:flutter/material.dart';

import '../utils/special_slot_timing.dart';
import 'special_market_closed_dialog.dart';

/// One Starline / King Bazaar time-slot row — mirrors the web slot card.
class SpecialMarketSlotRow extends StatelessWidget {
  const SpecialMarketSlotRow({
    super.key,
    required this.timeLabel,
    required this.resultPill,
    required this.isClosed,
    required this.onPlay,
  });

  final String timeLabel;
  final String resultPill;
  final bool isClosed;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    final canOpen = !isClosed;
    return Material(
      color: const Color(0xFF1F2937),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: canOpen ? onPlay : null,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
          ),
          child: Row(
            children: [
              SizedBox(
                width: 72,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      timeLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 17,
                      ),
                    ),
                    if (isClosed) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Close for today',
                        style: TextStyle(
                          color: const Color(0xFFF87171).withValues(alpha: 0.95),
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Expanded(
                child: Center(
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 88),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.12),
                      ),
                    ),
                    child: Text(
                      resultPill,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFFF87171),
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        letterSpacing: 0.5,
                        fontFeatures: [FontFeature.tabularFigures()],
                      ),
                    ),
                  ),
                ),
              ),
              _PlayButton(
                enabled: canOpen,
                onPressed: () {
                  if (isClosed) {
                    showSpecialMarketClosedDialog(context);
                  } else {
                    onPlay();
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlayButton extends StatelessWidget {
  const _PlayButton({required this.enabled, required this.onPressed});

  final bool enabled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: enabled
          ? const Color(0xFF059669)
          : const Color(0xFF374151).withValues(alpha: 0.8),
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: enabled
                  ? const Color(0xFF10B981)
                  : Colors.white.withValues(alpha: 0.1),
            ),
            gradient: enabled
                ? const LinearGradient(
                    colors: [Color(0xFF059669), Color(0xFF22C55E)],
                  )
                : null,
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.play_arrow_rounded, color: Colors.white, size: 18),
              SizedBox(width: 2),
              Text(
                'Play',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Builds slot row state from a raw market map (Starline).
Widget buildStarlineSlotRow({
  required BuildContext context,
  required Map<String, dynamic> slot,
  required DateTime now,
  required VoidCallback onPlay,
}) {
  final starting = (slot['startingTime'] ?? '').toString().trim();
  final timeLabel = formatTime12(starting.isNotEmpty ? starting : null);
  final open = slot['openingNumber']?.toString();
  final slotClosed = isSlotClosedTodayIst(starting, now);
  final hasOpen = open != null && RegExp(r'^\d{3}$').hasMatch(open);
  final isClosed = slotClosed || hasOpen;
  return SpecialMarketSlotRow(
    timeLabel: timeLabel.isEmpty ? '-' : timeLabel,
    resultPill: starlineResultPill(open),
    isClosed: isClosed,
    onPlay: onPlay,
  );
}

/// Builds slot row state from a raw market map (King Bazaar).
Widget buildKingSlotRow({
  required BuildContext context,
  required Map<String, dynamic> slot,
  required DateTime now,
  required VoidCallback onPlay,
}) {
  final starting = (slot['startingTime'] ?? '').toString().trim();
  final timeLabel = formatTime12(starting.isNotEmpty ? starting : null);
  final open = slot['openingNumber']?.toString();
  final close = slot['closingNumber']?.toString();
  final slotClosed = isSlotClosedTodayIst(starting, now);
  final hasOpen = open != null && RegExp(r'^\d{3}$').hasMatch(open);
  final hasClose = close != null && RegExp(r'^\d{3}$').hasMatch(close);
  final isClosed = slotClosed || (hasOpen && hasClose);
  final display = slot['displayResult']?.toString();
  return SpecialMarketSlotRow(
    timeLabel: timeLabel.isEmpty ? '-' : timeLabel,
    resultPill: formatKingBazaarJodi(display),
    isClosed: isClosed,
    onPlay: onPlay,
  );
}

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Premium home category tile — matches [HomeCategoryCard] on the web home.
class HomeCategoryCard extends StatelessWidget {
  const HomeCategoryCard({
    super.key,
    required this.label,
    required this.backgroundAsset,
    required this.iconAsset,
    required this.onTap,
  });

  final String label;
  final String backgroundAsset;
  final String iconAsset;
  final VoidCallback onTap;

  static const _goldGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFF7E7A8),
      Color(0xFFD4AF37),
      Color(0xFF8B6914),
      Color(0xFFE8C96A),
      Color(0xFFF0D78C),
      Color(0xFFC9A227),
    ],
    stops: [0.0, 0.18, 0.42, 0.68, 0.88, 1.0],
  );

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(15),
        splashColor: Colors.amber.withValues(alpha: 0.12),
        highlightColor: Colors.amber.withValues(alpha: 0.06),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(15),
            gradient: isDark ? _goldGradient : null,
            color: isDark ? null : Colors.transparent,
            border: Border.all(
              color: const Color(0xFFE9C46A),
              width: isDark ? 0.7 : 0.6,
            ),
            boxShadow: isDark
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.4),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                    BoxShadow(
                      color: const Color(0xFFE9C46A).withValues(alpha: 0.24),
                      blurRadius: 10,
                    ),
                  ]
                : [
                    BoxShadow(
                      color: const Color(0xFFE9C46A).withValues(alpha: 0.18),
                      blurRadius: 8,
                    ),
                  ],
          ),
          child: Padding(
            padding: EdgeInsets.all(isDark ? 2 : 0),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(13),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0A0806) : Colors.transparent,
                      image: DecorationImage(
                        image: AssetImage(backgroundAsset),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.black.withValues(alpha: isDark ? 0.5 : 0.18),
                          Colors.black.withValues(alpha: isDark ? 0.2 : 0.08),
                          Colors.black.withValues(alpha: isDark ? 0.35 : 0.14),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 8,
                    ),
                    child: Row(
                      children: [
                        Image.asset(
                          iconAsset,
                          width: 40,
                          height: 40,
                          fit: BoxFit.contain,
                        ),
                        Expanded(
                          child: _CategoryLabel(text: label),
                        ),
                        Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF78350F).withValues(alpha: 0.55),
                            border: Border.all(
                              color: const Color(0xFFFDE68A).withValues(alpha: 0.45),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
                                blurRadius: 10,
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.chevron_right_rounded,
                            size: 16,
                            color: Color(0xFFFFFbeb),
                          ),
                        ),
                      ],
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

class _CategoryLabel extends StatelessWidget {
  const _CategoryLabel({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          text.toUpperCase(),
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.cinzel(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 11,
            letterSpacing: 1.2,
            height: 1.1,
            shadows: const [
              Shadow(
                color: Color(0xBF000000),
                offset: Offset(0, 1),
                blurRadius: 2,
              ),
              Shadow(
                color: Color(0x73000000),
                offset: Offset(0, 2),
                blurRadius: 6,
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const _OrnamentLine(left: true),
            const _Diamond(),
            const _OrnamentLine(left: false),
          ],
        ),
      ],
    );
  }
}

class _OrnamentLine extends StatelessWidget {
  const _OrnamentLine({required this.left});

  final bool left;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 16,
      height: 1,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: left
              ? [Colors.transparent, const Color(0xFFD4AF37)]
              : [const Color(0xFFD4AF37), Colors.transparent],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFD4AF37).withValues(alpha: 0.45),
            blurRadius: 4,
          ),
        ],
      ),
    );
  }
}

class _Diamond extends StatelessWidget {
  const _Diamond();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 3),
      child: Transform.rotate(
        angle: 0.785398,
        child: Container(
          width: 4,
          height: 4,
          decoration: BoxDecoration(
            color: const Color(0xFFF5E6A8),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFF5E6A8).withValues(alpha: 0.55),
                blurRadius: 5,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

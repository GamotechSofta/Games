import 'package:flutter/material.dart';

import 'nav_main_route.dart';

/// Pops if possible; otherwise returns to the root route (home) without wiping history.
void popOrGoHome(BuildContext context) {
  final nav = Navigator.of(context);
  if (nav.canPop()) {
    nav.pop();
  } else {
    nav.popUntil((route) => route.isFirst);
  }
}

/// Back from My Bets sub-pages (bet history, market results) → My Bets hub.
void popOrGoMyBets(BuildContext context) {
  final nav = Navigator.of(context);
  if (nav.canPop()) {
    nav.pop();
    return;
  }
  navigateMainRoute(context, '/bids');
}

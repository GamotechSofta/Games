import 'package:flutter/material.dart';

import '../../theme/casino_ui.dart';
import '../../utils/nav_main_route.dart';
import 'funds_menu.dart';

/// Full-screen funds tab — `/funds/:tab` (mirrors mobile detail in [Funds.jsx]).
class FundsTabScreen extends StatelessWidget {
  const FundsTabScreen({super.key, required this.tabKey});

  final String tabKey;

  @override
  Widget build(BuildContext context) {
    final item = FundsMenu.findByKey(context, tabKey);
    if (item == null) {
      return Center(
        child: Text(
          'Unknown funds section',
          style: TextStyle(color: CasinoUi.fundsMuted(context)),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 8, 8),
          child: Row(
            children: [
              IconButton(
                onPressed: () {
                  if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                    return;
                  }
                  navigateMainRoute(context, '/funds');
                },
                icon: const Icon(Icons.arrow_back),
                color: CasinoUi.fundsText(context),
              ),
              Expanded(
                child: Text(
                  item.title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: CasinoUi.fundsText(context),
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            child: FundsMenu.panel(
              tabKey,
              onAddFundSubmittedGoHistory: () =>
                  navigateMainRoute(context, '/funds/add-fund-history'),
            ),
          ),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';

import '../../theme/casino_ui.dart';
import '../../utils/nav_main_route.dart';
import '../../utils/nav_pop_or_home.dart';
import 'funds_menu.dart';

/// `/funds` hub — [Games/frontend/src/pages/Funds.jsx] menu (mobile list / desktop split).
class FundsPage extends StatefulWidget {
  const FundsPage({super.key});

  @override
  State<FundsPage> createState() => _FundsPageState();
}

class _FundsPageState extends State<FundsPage> {
  String _selectedKey = FundsMenu.defaultTabKey;
  bool _routeSynced = false;

  List<FundsMenuItem> get _items => FundsMenu.items(context);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_routeSynced) return;
    _routeSynced = true;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map && args['tab'] != null) {
      final t = args['tab'].toString();
      if (_items.any((e) => e.key == t)) {
        final wide = MediaQuery.sizeOf(context).width >= 720;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          if (wide) {
            setState(() => _selectedKey = t);
          } else {
            pushMainSubRoute(context, '/funds/$t');
          }
        });
      }
    }
  }

  void _openTab(String key) {
    final wide = MediaQuery.sizeOf(context).width >= 720;
    if (wide) {
      setState(() => _selectedKey = key);
    } else {
      pushMainSubRoute(context, '/funds/$key');
    }
  }

  Widget _menuTile(FundsMenuItem item, {required bool selected}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () => _openTab(item.key),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            decoration: CasinoUi.fundsMenuTileDecoration(
              context,
              selected: selected,
            ),
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: item.color,
                  child: item.icon,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: CasinoUi.fundsText(context),
                        ),
                      ),
                      Text(
                        item.subtitle,
                        style: TextStyle(
                          fontSize: 11,
                          color: CasinoUi.fundsMuted(context, 0.9),
                        ),
                      ),
                    ],
                  ),
                ),
                CasinoUi.fundsMenuChevron(context, selected: selected),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _headerTitle(String text) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.bold,
        color: CasinoUi.fundsText(context),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 720;
    final active = FundsMenu.findByKey(context, _selectedKey) ?? _items.first;

    if (wide) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
            child: Row(
              children: [
                IconButton(
                  onPressed: () => popOrGoHome(context),
                  icon: const Icon(Icons.arrow_back),
                  color: CasinoUi.fundsText(context),
                ),
                _headerTitle('Funds'),
              ],
            ),
          ),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 300,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(12, 0, 8, 100),
                    children: [
                      for (final item in _items)
                        _menuTile(item, selected: item.key == _selectedKey),
                    ],
                  ),
                ),
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(0, 0, 12, 12),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: CasinoUi.fundsCardFill(context),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: CasinoUi.fundsCardBorder(context)),
                      boxShadow: Theme.of(context).brightness == Brightness.dark
                          ? null
                          : [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.06),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 22,
                              backgroundColor: active.color,
                              child: active.icon,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    active.title,
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: CasinoUi.fundsText(context),
                                    ),
                                  ),
                                  Text(
                                    active.subtitle,
                                    style: TextStyle(
                                      color: CasinoUi.fundsMuted(context, 0.95),
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        Divider(
                          height: 24,
                          color: CasinoUi.fundsShellBorder(context, alpha: 0.5),
                        ),
                        Expanded(
                          child: FundsMenu.panel(
                            _selectedKey,
                            onAddFundSubmittedGoHistory: () =>
                                _openTab('add-fund-history'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 8, 8),
          child: Row(
            children: [
              IconButton(
                onPressed: () => popOrGoHome(context),
                icon: const Icon(Icons.arrow_back),
                color: CasinoUi.fundsText(context),
              ),
              Text(
                'Funds',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: CasinoUi.fundsText(context),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 100),
            children: [
              for (final item in _items) _menuTile(item, selected: false),
            ],
          ),
        ),
      ],
    );
  }
}

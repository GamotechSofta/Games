import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'pages/bid_options_page.dart';
import 'pages/game_bid_page.dart';
import 'pages/games_page.dart';
import 'pages/download_page.dart';
import 'pages/game_rate_page.dart';
import 'pages/home_page.dart';
import 'pages/king_bazaar_market_page.dart';
import 'pages/login_page.dart';
import 'pages/startline_dashboard_page.dart';
import 'pages/starline_market_page.dart';
import 'pages/history/bet_history_screen.dart';
import 'pages/history/market_results_screen.dart';
import 'pages/history/my_bets_page.dart';
import 'pages/support/support_landing_page.dart';
import 'pages/support/support_new_page.dart';
import 'pages/support/support_status_page.dart';
import 'pages/profile_page.dart';
import 'pages/top_winners_page.dart';
import 'pages/signup_page.dart';
import 'pages/wallet/bank_transactions_page.dart';
import 'pages/wallet/funds_page.dart';
import 'pages/wallet/funds_tab_screen.dart';
import 'pages/wallet/passbook_page.dart';
import 'services/auth_service.dart';
import 'services/session_coordinator.dart';
import 'services/theme_service.dart';
import 'services/wallet_service.dart';
import 'shell/main_shell.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';
import 'widgets/auth_widgets.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  runApp(const AakdaApp());
}

class AakdaApp extends StatefulWidget {
  const AakdaApp({super.key});

  @override
  State<AakdaApp> createState() => _AakdaAppState();
}

class _AakdaAppState extends State<AakdaApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(ThemeService.instance.loadThemeMode());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_onAppResumed());
    }
  }

  Future<void> _onAppResumed() async {
    if (!await AuthService.instance.hasValidSession()) return;
    await SessionCoordinator.instance.sendHeartbeat();
    await WalletService.instance.refreshBalanceInStorage();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeService.instance.mode,
      builder: (context, mode, _) => MaterialApp(
        navigatorKey: SessionCoordinator.instance.navigatorKey,
        title: 'Aakda',
        theme: buildLightAppTheme(),
        darkTheme: buildAppTheme(),
        themeMode: mode,
        // Cannot set [home] and also register `/` in [routes] — use initialRoute for splash.
        initialRoute: '/splash',
        routes: {
          '/splash': (_) => const _SplashScreen(),
          '/': (_) => const MainShell(
                path: '/',
                child: HomePage(),
              ),
          '/bids': (_) => const MainShell(
                path: '/bids',
                child: MyBetsPage(),
              ),
          '/bet-history': (_) => const MainShell(
                path: '/bet-history',
                child: BetHistoryScreen(),
              ),
          '/game-bet-history': (_) => const MainShell(
                path: '/game-bet-history',
                child: GameBetHistoryScreen(),
              ),
          '/market-result-history': (_) => const MainShell(
                path: '/market-result-history',
                child: MarketResultHistoryScreen(),
              ),
          '/games': (_) => const MainShell(
                path: '/games',
                child: GamesPage(),
              ),
          '/startline-dashboard': (_) => const MainShell(
                path: '/startline-dashboard',
                child: StartlineDashboardPage(),
              ),
          '/starline-market': (_) => const MainShell(
                path: '/starline-market',
                child: StarlineMarketPage(),
              ),
          '/king-bazaar-market': (_) => const MainShell(
                path: '/king-bazaar-market',
                child: KingBazaarMarketPage(),
              ),
          '/bank': (_) => const MainShell(
                path: '/bank',
                child: BankTransactionsPage(),
              ),
          '/funds': (_) => const MainShell(
                path: '/funds',
                child: FundsPage(),
              ),
          '/funds/add-fund': (_) => const MainShell(
                path: '/funds/add-fund',
                child: FundsTabScreen(tabKey: 'add-fund'),
              ),
          '/funds/withdraw-fund': (_) => const MainShell(
                path: '/funds/withdraw-fund',
                child: FundsTabScreen(tabKey: 'withdraw-fund'),
              ),
          '/funds/bank-detail': (_) => const MainShell(
                path: '/funds/bank-detail',
                child: FundsTabScreen(tabKey: 'bank-detail'),
              ),
          '/funds/add-fund-history': (_) => const MainShell(
                path: '/funds/add-fund-history',
                child: FundsTabScreen(tabKey: 'add-fund-history'),
              ),
          '/funds/withdraw-fund-history': (_) => const MainShell(
                path: '/funds/withdraw-fund-history',
                child: FundsTabScreen(tabKey: 'withdraw-fund-history'),
              ),
          '/passbook': (_) => const MainShell(
                path: '/passbook',
                child: PassbookPage(),
              ),
          '/game-rate': (_) => const MainShell(
                path: '/game-rate',
                child: GameRatePage(),
              ),
          '/support': (_) => const MainShell(
                path: '/support',
                child: SupportLandingPage(),
              ),
          '/support/new': (_) => const MainShell(
                path: '/support/new',
                child: SupportNewPage(),
              ),
          '/support/status': (_) => const MainShell(
                path: '/support/status',
                child: SupportStatusPage(),
              ),
          '/profile': (_) => const MainShell(
                path: '/profile',
                child: ProfilePage(),
              ),
          '/top-winners': (_) => const MainShell(
                path: '/top-winners',
                child: TopWinnersPage(),
              ),
          '/download': (_) => const MainShell(
                path: '/download',
                child: DownloadPage(),
              ),
          '/bidoptions': (_) => const MainShell(
                path: '/bidoptions',
                child: BidOptionsPage(),
              ),
          GameBidPage.routeName: (_) => const MainShell(
                path: '/bidoptions',
                child: GameBidPage(),
              ),
          LoginPage.routeName: (_) => const LoginPage(),
          SignupPage.routeName: (context) {
            final args = ModalRoute.of(context)?.settings.arguments;
            final ref = args is Map
                ? args['ref']?.toString()
                : (args is String ? args : null);
            return SignupPage(referredBy: ref);
          },
        },
      ),
    );
  }
}

class _SplashScreen extends StatefulWidget {
  const _SplashScreen();

  @override
  State<_SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<_SplashScreen> {
  @override
  void initState() {
    super.initState();
    _route();
  }

  Future<void> _route() async {
    final ok = await AuthService.instance.hasValidSession();
    if (!mounted) return;
    final next = ok ? '/' : LoginPage.routeName;
    await Navigator.of(context).pushReplacementNamed(next);
    if (ok) {
      SessionCoordinator.instance.startHeartbeatIfLoggedIn();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              kAakdaLogoAsset,
              width: 140,
              height: 140,
              fit: BoxFit.contain,
            ),
            const SizedBox(height: 20),
            Text(
              'Aakda',
              style: TextStyle(
                color: AppColors.goldMuted,
                fontSize: 28,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 28),
            const CircularProgressIndicator(
              color: AppColors.accentEmerald,
              strokeWidth: 2.5,
            ),
          ],
        ),
      ),
    );
  }
}

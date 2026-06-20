import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';

import 'login_page.dart';
import '../services/auth_service.dart';
import '../services/session_coordinator.dart';
import '../services/bets_service.dart';
import '../services/wallet_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/casino_ui.dart';
import '../utils/nav_main_route.dart';
import '../widgets/profile_settings_grid.dart';
import '../utils/nav_pop_or_home.dart';

/// Account hub — [frontend/src/pages/Profile.jsx].
class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> with WidgetsBindingObserver {
  Map<String, dynamic>? _user;
  String? _copiedLabel;
  bool _statementBusy = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _bootstrap();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refreshUser();
  }

  Future<void> _bootstrap() async {
    final u = await AuthService.instance.getStoredUser();
    if (!mounted) return;
    if (!AuthService.isLoggedInUser(u)) {
      Navigator.of(context).pushReplacementNamed(LoginPage.routeName);
      return;
    }
    if (AuthService.sessionToken(u) != null) {
      await WalletService.instance.refreshBalanceInStorage();
    }
    if (!mounted) return;
    final fresh = await AuthService.instance.getStoredUser();
    if (!mounted) return;
    setState(() => _user = fresh);
  }

  Future<void> _refreshUser() async {
    final u = await AuthService.instance.getStoredUser();
    if (!mounted) return;
    if (!AuthService.isLoggedInUser(u)) {
      Navigator.of(context).pushReplacementNamed(LoginPage.routeName);
      return;
    }
    if (AuthService.sessionToken(u) != null) {
      await WalletService.instance.refreshBalanceInStorage();
    }
    if (!mounted) return;
    final fresh = await AuthService.instance.getStoredUser();
    if (!mounted) return;
    if (!AuthService.isLoggedInUser(fresh)) {
      Navigator.of(context).pushReplacementNamed(LoginPage.routeName);
      return;
    }
    setState(() => _user = fresh);
  }

  String _pick(Map<String, dynamic>? u, List<String> keys) {
    if (u == null) return '';
    for (final k in keys) {
      final v = u[k];
      if (v != null && v.toString().trim().isNotEmpty)
        return v.toString().trim();
    }
    return '';
  }

  num? _wallet(Map<String, dynamic>? u) {
    if (u == null) return null;
    for (final k in [
      'wallet',
      'balance',
      'points',
      'walletAmount',
      'wallet_amount',
      'amount',
    ]) {
      final v = u[k];
      if (v is num) return v;
      final n = num.tryParse(v?.toString() ?? '');
      if (n != null) return n;
    }
    return null;
  }

  Future<void> _copy(String text, String label) async {
    if (text.isEmpty || text == 'Not set' || text == 'N/A') return;
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    setState(() => _copiedLabel = label);
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) setState(() => _copiedLabel = null);
    });
  }

  void _showToast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _downloadStatement() async {
    final u = _user;
    if (u == null || (u['id'] == null && u['_id'] == null)) {
      _showToast('Please log in to download statement');
      return;
    }
    setState(() => _statementBusy = true);
    final end = DateTime.now();
    final start = end.subtract(const Duration(days: 30));
    String ymd(DateTime d) =>
        '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    final r = await BetsService.instance.fetchMyStatement(
      startDateYmd: ymd(start),
      endDateYmd: ymd(end),
    );
    if (!mounted) return;
    setState(() => _statementBusy = false);
    if (!r.success || r.bytes == null) {
      _showToast(r.message ?? 'Failed to download statement');
      return;
    }
    final isPdf = r.contentType?.toLowerCase().contains('pdf') ?? false;
    final ext = isPdf ? 'pdf' : 'dat';
    final name = 'statement_${ymd(start)}_${ymd(end)}.$ext';
    final mime =
        r.contentType ??
        (isPdf ? 'application/pdf' : 'application/octet-stream');
    await SharePlus.instance.share(
      ShareParams(
        files: [XFile.fromData(r.bytes!, name: name, mimeType: mime)],
        text: 'Betting statement',
      ),
    );
    _showToast('Share or save your statement');
  }

  Future<void> _logout() async {
    SessionCoordinator.instance.stopHeartbeat();
    await AuthService.instance.logoutThisDevice();
    if (!mounted) return;
    Navigator.of(
      context,
    ).pushNamedAndRemoveUntil(LoginPage.routeName, (_) => false);
  }

  Widget _copyIcon(String label, String text) {
    final done = _copiedLabel == label;
    return IconButton(
      onPressed: () => _copy(text, label),
      icon: Icon(
        done ? Icons.check : Icons.copy,
        size: 18,
        color: done
            ? AppColors.accentEmerald
            : CasinoUi.profileMuted(context, 0.95),
      ),
    );
  }

  Widget _infoTile({
    required IconData icon,
    required String title,
    required String value,
    required Color iconColor,
    bool copyable = false,
    String? copyLabel,
  }) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: CasinoUi.profileSectionDecoration(context, nested: true),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: CasinoUi.profileIconBg(context),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: CasinoUi.profileCardBorder(context, nested: true)),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title.toUpperCase(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: CasinoUi.profileMuted(context, 0.9),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: CasinoUi.profileText(context),
                    ),
                  ),
                ],
              ),
            ),
            if (copyable && value != 'Not set' && copyLabel != null)
              _copyIcon(copyLabel, value),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final u = _user;
    if (u == null) {
      return Center(
        child: CircularProgressIndicator(color: CasinoUi.profileAccent(context)),
      );
    }

    final username = _pick(u, ['username', 'name', 'fullName']);
    final phone = _pick(u, [
      'phone',
      'mobile',
      'mobileNumber',
      'phoneNumber',
      'phone_number',
      'mobilenumber',
    ]);
    final email = _pick(u, ['email']);
    final userId = AuthService.storedUserId(u) ?? 'N/A';
    final wallet = _wallet(u);
    final walletFmt = NumberFormat('#,##0.00', 'en_IN');
    final avatar = (username.isNotEmpty ? username[0] : 'U').toUpperCase();
    final created = u['createdAt'] ?? u['created_at'] ?? u['createdOn'];
    DateTime? createdDt;
    if (created != null) createdDt = DateTime.tryParse(created.toString());
    final memberSince = createdDt != null
        ? DateFormat.yMMMMd().format(createdDt)
        : null;

    final wide = MediaQuery.sizeOf(context).width >= 768;

    final hero = _HeroCard(
      avatar: avatar,
      username: username.isEmpty ? 'User' : username,
      subtitle: email.isNotEmpty
          ? email
          : (phone.isNotEmpty ? phone : 'No contact info'),
      walletText: wallet != null ? '₹${walletFmt.format(wallet)}' : '₹0.00',
      onAddFund: () => pushMainSubRoute(context, '/funds/add-fund'),
      onWithdraw: () => pushMainSubRoute(context, '/funds/withdraw-fund'),
    );

    final accountHeader = Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        'Account Information',
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: CasinoUi.profileText(context),
        ),
      ),
    );

    final accountBody = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        accountHeader,
        _infoTile(
          icon: Icons.badge_outlined,
          title: 'User ID',
          value: userId,
          iconColor: CasinoUi.profileIconColor(context),
          copyable: true,
          copyLabel: 'User ID',
        ),
        const SizedBox(height: 8),
        _infoTile(
          icon: Icons.person_outline,
          title: 'Username',
          value: username.isEmpty ? 'Not set' : username,
          iconColor: CasinoUi.profileIconColor(context),
          copyable: true,
          copyLabel: 'Username',
        ),
        const SizedBox(height: 8),
        _infoTile(
          icon: Icons.email_outlined,
          title: 'Email',
          value: email.isEmpty ? 'Not set' : email,
          iconColor: CasinoUi.profileIconColor(context),
          copyable: true,
          copyLabel: 'Email',
        ),
        const SizedBox(height: 8),
        _infoTile(
          icon: Icons.phone_outlined,
          title: 'Phone',
          value: phone.isEmpty ? 'Not set' : phone,
          iconColor: CasinoUi.profileIconColor(context),
          copyable: true,
          copyLabel: 'Phone',
        ),
        if (memberSince != null) ...[
          const SizedBox(height: 8),
          _infoTile(
            icon: Icons.calendar_today_outlined,
            title: 'Member Since',
            value: memberSince,
            iconColor: CasinoUi.profileIconColor(context),
          ),
        ],
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _statementBusy ? null : _downloadStatement,
          icon: _statementBusy
              ? SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: CasinoUi.profileText(context),
                  ),
                )
              : const Icon(Icons.description_outlined),
          label: const Text('Download statement (last 30 days)'),
          style: OutlinedButton.styleFrom(
            foregroundColor: CasinoUi.profileText(context),
            side: BorderSide(color: CasinoUi.profileCardBorder(context)),
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.buttonPaddingH,
              vertical: AppSpacing.buttonPaddingV,
            ),
            minimumSize: const Size(0, AppSpacing.buttonMinHeight),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            visualDensity: VisualDensity.compact,
          ),
        ),
      ],
    );

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final logoutBtn = SizedBox(
      width: double.infinity,
      child: isDark
          ? OutlinedButton.icon(
              onPressed: _logout,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.accentRose,
                side: BorderSide(
                  color: AppColors.accentRose.withValues(alpha: 0.65),
                  width: 2,
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.buttonPaddingH,
                  vertical: AppSpacing.buttonPaddingV,
                ),
                minimumSize: const Size(0, AppSpacing.buttonMinHeight),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
                backgroundColor: AppColors.accentRose.withValues(alpha: 0.1),
              ),
              icon: const Icon(Icons.logout),
              label: const Text(
                'Sign Out',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            )
          : ElevatedButton.icon(
              onPressed: _logout,
              style: ElevatedButton.styleFrom(
                backgroundColor: CasinoUi.supportRed600,
                foregroundColor: Colors.white,
                elevation: 4,
                shadowColor: CasinoUi.supportRed600.withValues(alpha: 0.35),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.buttonPaddingH,
                  vertical: AppSpacing.buttonPaddingV,
                ),
                minimumSize: const Size(0, AppSpacing.buttonMinHeight),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
              icon: const Icon(Icons.logout),
              label: const Text(
                'Sign Out',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
    );

    final titleWide = MediaQuery.sizeOf(context).width >= 720;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 8, 8),
          child: Row(
            children: [
              IconButton(
                onPressed: () => popOrGoHome(context),
                icon: const Icon(Icons.arrow_back),
                color: CasinoUi.profileText(context),
              ),
              Expanded(
                child: Text(
                  'My Profile',
                  style: TextStyle(
                    fontSize: titleWide ? 22 : 20,
                    fontWeight: FontWeight.bold,
                    color: CasinoUi.profileText(context),
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: wide
              ? Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 320,
                        child: ListView(
                          children: [
                            hero,
                            const SizedBox(height: 10),
                            logoutBtn,
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: ListView(
                          children: [
                            DecoratedBox(
                              decoration: CasinoUi.profileSectionDecoration(
                                context,
                                radius: 16,
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(10),
                                child: accountBody,
                              ),
                            ),
                            const SizedBox(height: 10),
                            const ProfileSettingsGrid(),
                          ],
                        ),
                      ),
                    ],
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                  children: [
                    hero,
                    const SizedBox(height: 10),
                    accountBody,
                    const SizedBox(height: 10),
                    const ProfileSettingsGrid(),
                    const SizedBox(height: 10),
                    logoutBtn,
                  ],
                ),
        ),
      ],
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.avatar,
    required this.username,
    required this.subtitle,
    required this.walletText,
    required this.onAddFund,
    required this.onWithdraw,
  });

  static const double _fundButtonHeight = 40;

  final String avatar;
  final String username;
  final String subtitle;
  final String walletText;
  final VoidCallback onAddFund;
  final VoidCallback onWithdraw;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: CasinoUi.profileSectionDecoration(context, radius: 24),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        gradient: CasinoUi.profileAvatarGradient(),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFD97706).withValues(alpha: 0.35),
                            blurRadius: 12,
                          ),
                        ],
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        avatar,
                        style: const TextStyle(
                          color: Colors.black,
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Positioned(
                      right: -2,
                      bottom: -2,
                      child: Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          color: Colors.green.shade500,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isDark ? Colors.white : Colors.white,
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        username,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: CasinoUi.profileText(context),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: CasinoUi.profileMuted(context, 0.9),
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text.rich(
                        TextSpan(
                          style: TextStyle(
                            fontSize: 11,
                            color: CasinoUi.profileMuted(context),
                          ),
                          children: [
                            const TextSpan(text: 'User'),
                            TextSpan(
                              text: ' · ACTIVE',
                              style: TextStyle(
                                color: CasinoUi.profileActive(context),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: CasinoUi.profileSectionDecoration(
                context,
                radius: 16,
                nested: true,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'WALLET BALANCE',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: CasinoUi.profileMuted(context, 0.9),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          walletText,
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: CasinoUi.profileAccent(context),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.account_balance_wallet_outlined,
                    size: 32,
                    color: CasinoUi.profileMuted(context, 0.55),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: _fundButtonHeight,
              child: Row(
                children: [
                  Expanded(
                    child: _compactFundButton(
                      context,
                      label: 'Add Fund',
                      icon: Icons.payments_outlined,
                      primary: true,
                      onTap: onAddFund,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _compactFundButton(
                      context,
                      label: 'Withdraw',
                      onTap: onWithdraw,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _compactFundButton(
    BuildContext context, {
    required String label,
    required VoidCallback onTap,
    IconData? icon,
    bool primary = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fg = primary
        ? Colors.white
        : CasinoUi.profileText(context);
    final bg = primary
        ? const Color(0xFFD32F2F)
        : (isDark ? CasinoUi.profileDarkNested : Colors.white);
    final border = primary
        ? (isDark
            ? CasinoUi.supportRed600.withValues(alpha: 0.7)
            : const Color(0x33111827))
        : CasinoUi.profileCardBorder(context);

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          height: _fundButtonHeight,
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: border),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 14, color: fg),
                const SizedBox(width: 4),
              ],
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: fg,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

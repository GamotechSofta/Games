import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/auth_service.dart';
import '../../services/help_desk_service.dart';
import '../../theme/casino_ui.dart';
import '../../utils/nav_main_route.dart';

/// `/support/status` — [frontend/src/pages/Support/SupportStatus.jsx].
class SupportStatusPage extends StatelessWidget {
  const SupportStatusPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const SizedBox.expand(child: SupportStatusView());
  }
}

class SupportStatusView extends StatefulWidget {
  const SupportStatusView({super.key});

  @override
  State<SupportStatusView> createState() => _SupportStatusViewState();
}

class _SupportStatusViewState extends State<SupportStatusView> {
  Map<String, dynamic>? _user;
  bool _loading = true;
  String _error = '';
  List<Map<String, dynamic>> _tickets = [];

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final u = await AuthService.instance.getStoredUser();
    if (!mounted) return;
    setState(() => _user = u);
    if (!_hasUser) {
      setState(() {
        _loading = false;
        _tickets = [];
        _error = '';
      });
      return;
    }
    await _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    final r = await HelpDeskService.instance.fetchMyTickets();
    if (!mounted) return;
    if (r.unauthorized) return;
    setState(() {
      _loading = false;
      _tickets = r.tickets;
      _error = r.success ? '' : (r.message ?? 'Failed to load tickets.');
    });
  }

  bool get _hasUser {
    final uid = AuthService.storedUserId(_user);
    return uid != null && uid.isNotEmpty;
  }

  void _handleBack(BuildContext context) {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
      return;
    }
    navigateMainRoute(context, '/support');
  }

  static String _statusLabel(String? s) {
    switch (s) {
      case 'open':
        return 'Pending';
      case 'in-progress':
        return 'In progress';
      case 'resolved':
        return 'Resolved';
      case 'closed':
        return 'Closed';
      default:
        return s ?? '-';
    }
  }

  static ({Color bg, Color fg, Color border}) _statusStyle(
    BuildContext context,
    String? status,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    switch (status) {
      case 'open':
        return (
          bg: isDark
              ? Colors.red.shade500.withValues(alpha: 0.15)
              : Colors.red.shade50,
          fg: isDark ? Colors.red.shade300 : Colors.red.shade800,
          border: isDark
              ? Colors.red.shade500.withValues(alpha: 0.35)
              : Colors.red.shade200,
        );
      case 'in-progress':
        return (
          bg: isDark
              ? Colors.white.withValues(alpha: 0.1)
              : Colors.grey.shade100,
          fg: isDark ? const Color(0xFFE5E7EB) : Colors.grey.shade800,
          border: isDark
              ? Colors.white.withValues(alpha: 0.2)
              : Colors.grey.shade200,
        );
      case 'resolved':
        return (
          bg: isDark
              ? Colors.green.shade500.withValues(alpha: 0.15)
              : Colors.green.shade50,
          fg: isDark ? Colors.green.shade300 : Colors.green.shade800,
          border: isDark
              ? Colors.green.shade500.withValues(alpha: 0.35)
              : Colors.green.shade200,
        );
      case 'closed':
        return (
          bg: isDark
              ? Colors.white.withValues(alpha: 0.1)
              : Colors.grey.shade100,
          fg: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          border: isDark
              ? Colors.white.withValues(alpha: 0.15)
              : Colors.grey.shade200,
        );
      default:
        return (
          bg: isDark
              ? Colors.white.withValues(alpha: 0.1)
              : Colors.grey.shade100,
          fg: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          border: isDark
              ? Colors.white.withValues(alpha: 0.15)
              : Colors.grey.shade200,
        );
    }
  }

  String _fmtTime(dynamic iso) {
    if (iso == null) return '';
    final d = DateTime.tryParse(iso.toString());
    if (d == null) return '';
    return DateFormat.yMMMd().add_jm().format(d);
  }

  int _screenshotCount(Map<String, dynamic> ticket) {
    final shots = ticket['screenshots'];
    if (shots is List) return shots.length;
    return 0;
  }

  void _openTicketDetail(Map<String, dynamic> ticket) {
    final subject = ticket['subject']?.toString() ?? 'Support Request';
    final status = ticket['status']?.toString();
    final desc = ticket['description']?.toString() ?? '';
    final admin = ticket['adminResponse']?.toString() ?? '';
    final created = _fmtTime(ticket['createdAt']);
    final shots = _screenshotCount(ticket);

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: CasinoUi.supportCardFill(context),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        side: BorderSide(color: CasinoUi.supportCardBorder(context)),
      ),
      builder: (ctx) {
        final style = _statusStyle(ctx, status);
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.55,
          maxChildSize: 0.9,
          builder: (_, scroll) {
            return ListView(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: CasinoUi.supportMuted(ctx, 0.35),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        subject,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: CasinoUi.supportText(ctx),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: style.bg,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: style.border),
                      ),
                      child: Text(
                        _statusLabel(status),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: style.fg,
                        ),
                      ),
                    ),
                  ],
                ),
                if (created.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    created,
                    style: TextStyle(
                      fontSize: 12,
                      color: CasinoUi.supportMuted(ctx, 0.7),
                    ),
                  ),
                ],
                if (shots > 0) ...[
                  const SizedBox(height: 8),
                  Text(
                    '$shots photo(s) attached',
                    style: TextStyle(
                      fontSize: 12,
                      color: CasinoUi.supportMuted(ctx, 0.85),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Text(
                  'Your message',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: CasinoUi.supportAccent(ctx),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  desc.isEmpty ? '—' : desc,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: CasinoUi.supportText(ctx),
                  ),
                ),
                if (admin.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Divider(color: CasinoUi.supportCardBorder(ctx)),
                  const SizedBox(height: 8),
                  Text(
                    'Reply from support',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: CasinoUi.supportAccent(ctx),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(ctx).brightness == Brightness.dark
                          ? Colors.white.withValues(alpha: 0.05)
                          : Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: CasinoUi.supportCardBorder(ctx)),
                    ),
                    child: Text(
                      admin,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.4,
                        color: CasinoUi.supportText(ctx),
                      ),
                    ),
                  ),
                ],
              ],
            );
          },
        );
      },
    );
  }

  Widget _skeletonList(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final block = isDark
        ? Colors.white.withValues(alpha: 0.1)
        : Colors.grey.shade200;
    return Column(
      children: List.generate(4, (i) {
        return Padding(
          padding: EdgeInsets.only(bottom: i < 3 ? 12 : 0),
          child: Container(
            height: 100,
            decoration: BoxDecoration(
              color: CasinoUi.supportCardFill(context),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: CasinoUi.supportCardBorder(context)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 14,
                    width: 180,
                    decoration: BoxDecoration(
                      color: block,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    height: 12,
                    width: 100,
                    decoration: BoxDecoration(
                      color: block,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _loginBanner(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.red.shade500.withValues(alpha: 0.1)
            : Colors.red.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.red.shade500.withValues(alpha: 0.3)
              : Colors.red.shade200,
        ),
      ),
      child: Text(
        'Please log in to see your tickets.',
        textAlign: TextAlign.center,
        style: TextStyle(
          color: isDark ? Colors.red.shade200 : Colors.red.shade800,
          fontSize: 14,
        ),
      ),
    );
  }

  Widget _errorBanner(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.red.shade500.withValues(alpha: 0.1)
                : Colors.red.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? Colors.red.shade500.withValues(alpha: 0.3)
                  : Colors.red.shade200,
            ),
          ),
          child: Text(
            _error,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isDark ? Colors.red.shade200 : Colors.red.shade800,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _fetch,
          icon: const Icon(Icons.refresh),
          label: const Text('Retry'),
        ),
      ],
    );
  }

  Widget _emptyState(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: CasinoUi.supportCardFill(context),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: CasinoUi.supportCardBorder(context)),
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: CasinoUi.supportPrimaryGradient(),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.chat_bubble_outline_rounded,
              color: Colors.white,
              size: 28,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'No tickets yet.',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: CasinoUi.supportText(context),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Send a request from Support and it will show here.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: CasinoUi.supportMuted(context, 0.9),
            ),
          ),
          const SizedBox(height: 20),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: CasinoUi.supportPrimaryGradient(),
              borderRadius: BorderRadius.circular(12),
              border: isDark
                  ? Border.all(color: Colors.white.withValues(alpha: 0.2))
                  : null,
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => navigateMainRoute(context, '/support/new'),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  alignment: Alignment.center,
                  child: const Text(
                    'Ask for help',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _ticketCard(BuildContext context, Map<String, dynamic> ticket) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subject = ticket['subject']?.toString() ?? 'Support Request';
    final status = ticket['status']?.toString();
    final desc = ticket['description']?.toString() ?? '';
    final admin = ticket['adminResponse']?.toString();
    final style = _statusStyle(context, status);
    final shots = _screenshotCount(ticket);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _openTicketDetail(ticket),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: CasinoUi.supportCardFill(context),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: CasinoUi.supportCardBorder(context)),
            boxShadow: isDark
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      subject,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: CasinoUi.supportText(context),
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: style.bg,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: style.border),
                    ),
                    child: Text(
                      _statusLabel(status),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: style.fg,
                      ),
                    ),
                  ),
                ],
              ),
              if (_fmtTime(ticket['createdAt']).isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  _fmtTime(ticket['createdAt']),
                  style: TextStyle(
                    fontSize: 11,
                    color: CasinoUi.supportMuted(context, 0.65),
                  ),
                ),
              ],
              if (desc.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  desc,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark
                        ? Colors.grey.shade400
                        : Colors.grey.shade600,
                  ),
                ),
              ],
              if (admin != null && admin.isNotEmpty) ...[
                const SizedBox(height: 12),
                Divider(color: CasinoUi.supportCardBorder(context)),
                const SizedBox(height: 8),
                Text(
                  'Reply from support',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: CasinoUi.supportAccent(context),
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: CasinoUi.supportCardBorder(context)),
                  ),
                  child: Text(
                    admin,
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.4,
                      color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
                    ),
                  ),
                ),
              ],
              if (shots > 0) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(
                      Icons.image_outlined,
                      size: 14,
                      color: CasinoUi.supportMuted(context, 0.75),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '$shots photo(s)',
                      style: TextStyle(
                        fontSize: 11,
                        color: CasinoUi.supportMuted(context, 0.75),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _bodyContent(BuildContext context) {
    if (!_hasUser) return _loginBanner(context);
    if (_loading) return _skeletonList(context);
    if (_error.isNotEmpty) return _errorBanner(context);
    if (_tickets.isEmpty) return _emptyState(context);

    return RefreshIndicator(
      color: CasinoUi.supportAccent(context),
      onRefresh: _fetch,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _tickets.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, i) => _ticketCard(context, _tickets[i]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 512),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  IconButton(
                    onPressed: () => _handleBack(context),
                    icon: const Icon(Icons.arrow_back),
                    color: CasinoUi.supportMuted(context, 0.95),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 40,
                      minHeight: 40,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'My tickets',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: CasinoUi.supportText(context),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Status and replies',
                          style: TextStyle(
                            fontSize: 13,
                            color: CasinoUi.supportMuted(context, 0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_hasUser && !_loading)
                    IconButton(
                      onPressed: _fetch,
                      icon: const Icon(Icons.refresh),
                      tooltip: 'Refresh',
                      color: CasinoUi.supportMuted(context, 0.9),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(child: _bodyContent(context)),
            ],
          ),
        ),
      ),
    );
  }
}

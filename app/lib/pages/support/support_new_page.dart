import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../services/auth_service.dart';
import '../../services/help_desk_service.dart';
import '../../theme/app_spacing.dart';
import '../../theme/casino_ui.dart';
import '../../widgets/request_call_button.dart';
import '../../utils/nav_main_route.dart' show pushMainSubRoute;
import '../../utils/nav_pop_or_home.dart';

/// `/support/new` — [frontend/src/pages/Support/SupportNew.jsx].
class SupportNewPage extends StatefulWidget {
  const SupportNewPage({super.key});

  @override
  State<SupportNewPage> createState() => _SupportNewPageState();
}

class _SupportNewPageState extends State<SupportNewPage> {
  final _descCtrl = TextEditingController();
  List<XFile> _screenshots = [];
  bool _pageLoading = true;
  bool _submitting = false;
  String? _feedback;
  bool _feedbackOk = false;
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadUser() async {
    final u = await AuthService.instance.getStoredUser();
    if (!mounted) return;
    setState(() {
      _user = u;
      _pageLoading = false;
    });
  }

  String? get _userId => AuthService.storedUserId(_user);

  bool get _hasUser => _userId != null && _userId!.isNotEmpty;

  Future<void> _pickScreenshots() async {
    final files = await ImagePicker().pickMultiImage(imageQuality: 85);
    if (!mounted) return;
    if (files.isEmpty) return;
    final images = files.where((f) {
      final n = f.name.toLowerCase();
      return n.endsWith('.jpg') ||
          n.endsWith('.jpeg') ||
          n.endsWith('.png') ||
          n.endsWith('.gif') ||
          n.endsWith('.webp');
    }).toList();
    if (images.length != files.length) {
      setState(() {
        _feedback = 'Only images (PNG, JPG) allowed.';
        _feedbackOk = false;
      });
    }
    if (images.isEmpty) return;
    setState(() {
      _screenshots = images;
      if (images.length == files.length) _feedback = null;
    });
  }

  Future<void> _submit() async {
    if (!_hasUser) {
      setState(() {
        _feedback = 'Please log in to send a request.';
        _feedbackOk = false;
      });
      return;
    }
    if (_descCtrl.text.trim().isEmpty) {
      setState(() {
        _feedback = 'Please describe your issue.';
        _feedbackOk = false;
      });
      return;
    }
    if (_screenshots.isEmpty) {
      setState(() {
        _feedback = 'Please add at least one photo.';
        _feedbackOk = false;
      });
      return;
    }
    setState(() {
      _submitting = true;
      _feedback = null;
    });
    final r = await HelpDeskService.instance.submitTicket(
      subject: 'Support Request',
      description: _descCtrl.text,
      imagePaths: _screenshots.map((x) => x.path).toList(),
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (r.unauthorized) return;
    if (r.success) {
      setState(() {
        _feedback = "Request sent. We'll reply within 24 hours.";
        _feedbackOk = true;
        _descCtrl.clear();
        _screenshots = [];
      });
    } else {
      setState(() {
        _feedback = r.message ?? 'Something went wrong. Try again.';
        _feedbackOk = false;
      });
    }
  }

  Widget _loginBanner(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
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
        'Please log in to send a request.',
        textAlign: TextAlign.center,
        style: TextStyle(
          color: isDark ? Colors.red.shade200 : Colors.red.shade800,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _skeleton(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final block = isDark
        ? Colors.white.withValues(alpha: 0.1)
        : Colors.grey.shade200;
    Widget bar(double w, double h) => Container(
          width: w,
          height: h,
          decoration: BoxDecoration(
            color: block,
            borderRadius: BorderRadius.circular(8),
          ),
        );
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: CasinoUi.supportCardFill(context),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: CasinoUi.supportCardBorder(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          bar(112, 16),
          const SizedBox(height: 16),
          bar(double.infinity, 96),
          const SizedBox(height: 16),
          bar(128, 16),
          const SizedBox(height: 16),
          bar(160, 40),
          const SizedBox(height: 16),
          bar(double.infinity, 48),
        ],
      ),
    );
  }

  Widget _feedbackBanner(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _feedbackOk
            ? (isDark
                ? Colors.green.shade500.withValues(alpha: 0.1)
                : Colors.green.shade50)
            : (isDark
                ? Colors.red.shade500.withValues(alpha: 0.1)
                : Colors.red.shade50),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _feedbackOk
              ? (isDark
                  ? Colors.green.shade500.withValues(alpha: 0.3)
                  : Colors.green.shade200)
              : (isDark
                  ? Colors.red.shade500.withValues(alpha: 0.3)
                  : Colors.red.shade200),
        ),
      ),
      child: Text(
        _feedback!,
        style: TextStyle(
          fontSize: 13,
          color: _feedbackOk
              ? (isDark ? Colors.green.shade300 : Colors.green.shade800)
              : (isDark ? Colors.red.shade300 : Colors.red.shade800),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 512),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    IconButton(
                      onPressed: () => popOrGoHome(context),
                      icon: const Icon(Icons.arrow_back),
                      color: CasinoUi.supportMuted(context, 0.95),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Support',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: CasinoUi.supportText(context),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'We reply within 24 hours',
                            style: TextStyle(
                              fontSize: 13,
                              color: CasinoUi.supportMuted(context, 0.9),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (_pageLoading)
                  _skeleton(context)
                else if (!_hasUser)
                  _loginBanner(context)
                else ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: CasinoUi.supportCardFill(context),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: CasinoUi.supportCardBorder(context)),
                      boxShadow: isDark
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
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Need help on a call?',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: CasinoUi.supportFieldLabel(context),
                          ),
                        ),
                        const SizedBox(height: 12),
                        const RequestCallButton(),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: CasinoUi.supportCardFill(context),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: CasinoUi.supportCardBorder(context)),
                      boxShadow: isDark
                          ? null
                          : [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.06),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                    ),
                    child: Theme(
                      data: Theme.of(context).copyWith(
                        inputDecorationTheme:
                            CasinoUi.inputDecorationSupport(context),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          RichText(
                            text: TextSpan(
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: CasinoUi.supportFieldLabel(context),
                              ),
                              children: [
                                const TextSpan(text: 'What happened?'),
                                TextSpan(
                                  text: ' *',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: CasinoUi.supportAccent(context),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _descCtrl,
                            maxLines: 5,
                            style: TextStyle(
                              color: CasinoUi.supportText(context),
                              fontSize: 14,
                              height: 1.35,
                            ),
                            decoration: const InputDecoration(
                              hintText: 'Describe your issue in a few lines...',
                              alignLabelWithHint: true,
                              contentPadding: EdgeInsets.fromLTRB(14, 14, 14, 14),
                            ),
                          ),
                          const SizedBox(height: 20),
                          RichText(
                            text: TextSpan(
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: CasinoUi.supportFieldLabel(context),
                              ),
                              children: [
                                const TextSpan(text: 'Add photos'),
                                TextSpan(
                                  text: ' *',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: CasinoUi.supportAccent(context),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 12,
                            runSpacing: 8,
                            children: [
                              OutlinedButton.icon(
                                onPressed: _pickScreenshots,
                                icon: const Icon(Icons.photo_library_outlined, size: 18),
                                label: const Text('Choose Files'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: isDark
                                      ? const Color(0xFFE5E7EB)
                                      : CasinoUi.supportRed700,
                                  backgroundColor: isDark
                                      ? Colors.white.withValues(alpha: 0.1)
                                      : const Color(0xFFF9FAFB),
                                  side: BorderSide(
                                    color: CasinoUi.supportCardBorder(context),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 10,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                              Text(
                                _screenshots.isEmpty
                                    ? 'No file chosen'
                                    : '${_screenshots.length} photo(s) added',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: CasinoUi.supportMuted(context, 0.9),
                                ),
                              ),
                            ],
                          ),
                          if (_screenshots.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                for (var i = 0; i < _screenshots.length; i++)
                                  _PhotoChip(name: _screenshots[i].name),
                              ],
                            ),
                          ],
                          if (_feedback != null) ...[
                            const SizedBox(height: 16),
                            _feedbackBanner(context),
                          ],
                          const SizedBox(height: 16),
                          DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: CasinoUi.supportPrimaryGradient(),
                              borderRadius: BorderRadius.circular(12),
                              border: isDark
                                  ? Border.all(
                                      color: Colors.white.withValues(alpha: 0.2),
                                    )
                                  : null,
                              boxShadow: [
                                BoxShadow(
                                  color: CasinoUi.supportRed700.withValues(alpha: 0.25),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: _submitting ? null : _submit,
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  alignment: Alignment.center,
                                  child: _submitting
                                      ? const SizedBox(
                                          height: 22,
                                          width: 22,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white,
                                          ),
                                        )
                                      : const Text(
                                          'Send request',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w600,
                                            fontSize: 15,
                                          ),
                                        ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Center(
                    child: OutlinedButton.icon(
                      onPressed: () => pushMainSubRoute(context, '/support/status'),
                      icon: const Icon(Icons.receipt_long_outlined, size: 18),
                      label: const Text('View my tickets'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: CasinoUi.supportAccent(context),
                        side: BorderSide(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.2)
                              : const Color(0xFFFECACA),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.buttonPaddingH,
                          vertical: AppSpacing.buttonPaddingV,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PhotoChip extends StatelessWidget {
  const _PhotoChip({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final display = name.length > 20 ? '${name.substring(0, 18)}…' : name;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.1)
            : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.2)
              : Colors.grey.shade200,
        ),
      ),
      child: Text(
        display,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: isDark ? const Color(0xFFE5E7EB) : Colors.grey.shade700,
        ),
      ),
    );
  }
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

/// Result from PayU hosted checkout WebView (redirect back to app or API).
class PayuCheckoutResult {
  const PayuCheckoutResult({required this.queryParameters});

  final Map<String, String> queryParameters;

  bool get isSuccess => queryParameters['payu_success'] == '1';
  bool get isFailed => queryParameters['payu_failed'] == '1';
  String? get paymentId => queryParameters['paymentId'];
}

/// Loads auto-submit POST form to PayU and intercepts success/failure redirect.
class PayuCheckoutScreen extends StatefulWidget {
  const PayuCheckoutScreen({
    super.key,
    required this.formActionUrl,
    required this.formData,
  });

  final String formActionUrl;
  final Map<String, String> formData;

  @override
  State<PayuCheckoutScreen> createState() => _PayuCheckoutScreenState();
}

class _PayuCheckoutScreenState extends State<PayuCheckoutScreen> {
  late final WebViewController _controller;
  bool _loading = true;
  bool _completed = false;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    late final PlatformWebViewControllerCreationParams params;
    if (WebViewPlatform.instance is WebKitWebViewPlatform) {
      params = WebKitWebViewControllerCreationParams(
        allowsInlineMediaPlayback: true,
        mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
      );
    } else {
      params = const PlatformWebViewControllerCreationParams();
    }

    _controller = WebViewController.fromPlatformCreationParams(params)
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (!mounted) return;
            setState(() => _loading = true);
          },
          onPageFinished: (_) {
            if (!mounted) return;
            setState(() => _loading = false);
          },
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri != null && _tryComplete(uri)) {
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
          onUrlChange: (change) {
            final uri = Uri.tryParse(change.url ?? '');
            if (uri != null) _tryComplete(uri);
          },
        ),
      );

    final platformController = _controller.platform;
    if (platformController is AndroidWebViewController) {
      platformController.setMediaPlaybackRequiresUserGesture(false);
    }

    final html = _buildPostFormHtml(widget.formActionUrl, widget.formData);
    final base = Uri.tryParse(widget.formActionUrl);
    unawaited(
      _controller.loadHtmlString(
        html,
        baseUrl: base != null ? '${base.scheme}://${base.host}/' : null,
      ),
    );
  }

  bool _tryComplete(Uri uri) {
    if (_completed) return true;
    if (!_isPayuReturnUri(uri)) return false;
    _completed = true;
    if (!mounted) return true;
    Navigator.of(context).pop(PayuCheckoutResult(queryParameters: uri.queryParameters));
    return true;
  }

  bool _isPayuReturnUri(Uri uri) {
    if (uri.scheme == 'aakda' && uri.host == 'payu-return') return true;
    final path = uri.path;
    if (path.contains('/payments/payu/redirect')) return true;
    if (uri.queryParameters.containsKey('payu_success') ||
        uri.queryParameters.containsKey('payu_failed')) {
      return true;
    }
    return false;
  }

  static String _escapeHtml(String value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
  }

  static String _buildPostFormHtml(String action, Map<String, String> fields) {
    final inputs = fields.entries
        .map(
          (e) =>
              '<input type="hidden" name="${_escapeHtml(e.key)}" value="${_escapeHtml(e.value)}" />',
        )
        .join();
    return '''
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;background:#ffffff;color:#1a1a1a;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
<p>Redirecting to PayU…</p>
<form id="payuForm" method="POST" action="${_escapeHtml(action)}">$inputs</form>
<script>document.getElementById('payuForm').submit();</script>
</body>
</html>''';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('PayU Payment'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading)
            const Center(child: CircularProgressIndicator()),
        ],
      ),
    );
  }
}

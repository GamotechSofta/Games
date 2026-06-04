import 'package:flutter/material.dart';
import '../services/call_socket_service.dart';
import '../services/user_session.dart';
import '../services/native_call_service.dart';
import 'incoming_call_screen.dart';

typedef StartBackgroundFn = Future<void> Function({
  required String userId,
  String name,
  String phone,
});
typedef StopBackgroundFn = Future<void> Function();

/// Main screen: register socket, request call, background listener for native ring.
class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    this.onStartBackground,
    this.onStopBackground,
  });

  final StartBackgroundFn? onStartBackground;
  final StopBackgroundFn? onStopBackground;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _socket = CallSocketService();
  final _userIdCtrl = TextEditingController();
  final _nameCtrl = TextEditingController(text: 'Player');
  final _phoneCtrl = TextEditingController();

  bool _connected = false;
  bool _backgroundOn = false;
  String _status = 'idle';

  @override
  void initState() {
    super.initState();
    _loadSession();
    _setupSocket();
  }

  Future<void> _loadSession() async {
    final s = await UserSession.load();
    if (s['userId']!.isNotEmpty) {
      _userIdCtrl.text = s['userId']!;
      _nameCtrl.text = s['name']!;
      _phoneCtrl.text = s['phone']!;
      await _enableBackgroundListener();
    }
  }

  Future<void> _enableBackgroundListener() async {
    final userId = _userIdCtrl.text.trim();
    if (userId.isEmpty || widget.onStartBackground == null) return;
    await widget.onStartBackground!(
      userId: userId,
      name: _nameCtrl.text.trim(),
      phone: _phoneCtrl.text.trim(),
    );
    if (mounted) setState(() => _backgroundOn = true);
  }

  void _setupSocket() {
    final socket = _socket.connect();

    socket.onConnect((_) {
      setState(() => _connected = true);
      _register();
    });

    socket.onDisconnect((_) {
      setState(() => _connected = false);
    });

    _socket.on('incoming-call', (data) async {
      if (!mounted) return;
      final map = Map<String, dynamic>.from(data as Map);
      final callId = map['callId']?.toString() ?? '';
      await NativeCallService.showIncomingCall(
        callId: callId.isNotEmpty ? callId : DateTime.now().millisecondsSinceEpoch.toString(),
        callerName: map['callerName']?.toString() ?? 'Aakda.in',
        handle: 'aakda.in',
      );
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => IncomingCallScreen(
            socket: _socket,
            incoming: map,
            userId: _userIdCtrl.text.trim(),
          ),
          fullscreenDialog: true,
        ),
      );
    });

    _socket.on('call-request-ack', (_) {
      setState(() => _status = 'waiting');
    });

    _socket.on('call-ended', (_) {
      setState(() => _status = 'idle');
    });
  }

  void _register() {
    final userId = _userIdCtrl.text.trim();
    if (userId.isEmpty) return;
    _socket.registerUser(
      userId: userId,
      name: _nameCtrl.text.trim(),
      phone: _phoneCtrl.text.trim(),
    );
    UserSession.save(
      userId: userId,
      name: _nameCtrl.text.trim(),
      phone: _phoneCtrl.text.trim(),
    );
  }

  void _requestCall() {
    final userId = _userIdCtrl.text.trim();
    if (userId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter your user ID first')),
      );
      return;
    }
    _register();
    _enableBackgroundListener();
    _socket.requestCall(
      userId: userId,
      name: _nameCtrl.text.trim(),
      phone: _phoneCtrl.text.trim(),
    );
    setState(() => _status = 'waiting');
  }

  @override
  void dispose() {
    _socket.disconnect();
    _userIdCtrl.dispose();
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Aakda Calls'),
        backgroundColor: const Color(0xFF0D9488),
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: [
              Icon(
                Icons.circle,
                size: 10,
                color: _connected ? Colors.green : Colors.grey,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _connected
                      ? (_backgroundOn
                          ? 'Connected — background call listener on'
                          : 'Connected')
                      : 'Connecting…',
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _userIdCtrl,
            decoration: const InputDecoration(
              labelText: 'User ID (MongoDB _id)',
              border: OutlineInputBorder(),
            ),
            onSubmitted: (_) => _register(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Name',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneCtrl,
            decoration: const InputDecoration(
              labelText: 'Phone',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _enableBackgroundListener,
            icon: const Icon(Icons.notifications_active),
            label: const Text('Enable incoming calls (lock screen)'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
            ),
          ),
          const SizedBox(height: 24),
          if (_status == 'waiting')
            const Card(
              color: Color(0xFFFFF7ED),
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Waiting for telecaller…',
                  style: TextStyle(color: Color(0xFF9A3412)),
                ),
              ),
            ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _connected ? _requestCall : null,
            icon: const Icon(Icons.phone_callback),
            label: const Text('Request a Call'),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF0D9488),
              minimumSize: const Size.fromHeight(52),
            ),
          ),
          const SizedBox(height: 32),
          const Text(
            'Incoming calls use native Answer/Decline on the lock screen (no Firebase). '
            'Keep "incoming calls" enabled and allow notifications + microphone.',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
    );
  }
}

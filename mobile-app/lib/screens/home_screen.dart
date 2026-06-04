import 'package:flutter/material.dart';
import '../services/call_socket_service.dart';
import '../services/user_session.dart';
import 'incoming_call_screen.dart';

/// Main screen: register socket, request call, listen for incoming calls.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _socket = CallSocketService();
  final _userIdCtrl = TextEditingController();
  final _nameCtrl = TextEditingController(text: 'Player');
  final _phoneCtrl = TextEditingController();

  bool _connected = false;
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
    }
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

    _socket.on('incoming-call', (data) {
      if (!mounted) return;
      final map = Map<String, dynamic>.from(data as Map);
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
        title: const Text('Request a Call'),
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
              Text(_connected ? 'Connected to server' : 'Connecting…'),
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
          const SizedBox(height: 24),
          if (_status == 'waiting')
            const Card(
              color: Color(0xFFFFF7ED),
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Waiting for telecaller…\nKeep the app open.',
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
            'When a telecaller calls you, an incoming call screen appears. '
            'For background wake-up, configure FCM in lib/services/fcm_service.dart.',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
    );
  }
}

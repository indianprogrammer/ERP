import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _server = TextEditingController();
  final _tenant = TextEditingController();
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _showServer = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final api = context.read<ApiClient>();
    _server.text = api.baseUrl;
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _busy = true; _error = null; });
    final api = context.read<ApiClient>();
    try {
      if (_server.text.trim().isNotEmpty &&
          _server.text.trim() != api.baseUrl) {
        await api.setBaseUrl(_server.text.trim());
      }
      await api.login(
        username: _username.text.trim(),
        password: _password.text,
        tenantSlug: _tenant.text.trim(),
      );
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.account_balance, size: 56, color: Color(0xFF1A73E8)),
                  const SizedBox(height: 12),
                  Text('X3M ERP',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text('Sign in to your company',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey[600])),
                  const SizedBox(height: 28),
                  TextFormField(
                    controller: _tenant,
                    decoration: const InputDecoration(
                      labelText: 'Company slug',
                      hintText: 'e.g. acme',
                      prefixIcon: Icon(Icons.business),
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Company slug required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _username,
                    decoration: const InputDecoration(
                      labelText: 'Username',
                      prefixIcon: Icon(Icons.person),
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Username required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _password,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      prefixIcon: Icon(Icons.lock),
                    ),
                    onFieldSubmitted: (_) => _login(),
                    validator: (v) => (v == null || v.isEmpty) ? 'Password required' : null,
                  ),
                  if (_showServer) ...[
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _server,
                      decoration: const InputDecoration(
                        labelText: 'Server URL',
                        hintText: 'http://10.0.2.2:3000',
                        prefixIcon: Icon(Icons.dns),
                      ),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Text(_error!,
                        style: const TextStyle(color: Color(0xFFD93025), fontSize: 13)),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _busy ? null : _login,
                    style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                    child: _busy
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Sign in'),
                  ),
                  TextButton(
                    onPressed: () => setState(() => _showServer = !_showServer),
                    child: Text(_showServer ? 'Hide server settings' : 'Server settings'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

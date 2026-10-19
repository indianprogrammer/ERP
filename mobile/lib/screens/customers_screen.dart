import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  List<Map<String, dynamic>> _customers = [];
  String? _error;
  bool _loading = true;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await context.read<ApiClient>().get('/api/customers');
      if (mounted) {
        setState(() =>
            _customers = ((data['customers'] ?? []) as List).cast<Map<String, dynamic>>());
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _filtered {
    if (_query.isEmpty) return _customers;
    final q = _query.toLowerCase();
    return _customers
        .where((c) => [c['name'], c['gstin'], c['phone'], c['email']]
            .any((v) => '$v'.toLowerCase().contains(q)))
        .toList();
  }

  Future<void> _add() async {
    final form = GlobalKey<FormState>();
    final name = TextEditingController();
    final gstin = TextEditingController();
    final phone = TextEditingController();
    final email = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New customer'),
        content: Form(
          key: form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Name *'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(controller: gstin, decoration: const InputDecoration(labelText: 'GSTIN')),
              const SizedBox(height: 10),
              TextFormField(controller: phone, decoration: const InputDecoration(labelText: 'Phone')),
              const SizedBox(height: 10),
              TextFormField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => form.currentState!.validate() ? Navigator.pop(ctx, true) : null, child: const Text('Add')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await context.read<ApiClient>().post('/api/customers', {
        'name': name.text.trim(),
        'gstin': gstin.text.trim(),
        'phone': phone.text.trim(),
        'email': email.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Customer added')));
        await _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: TextField(
            decoration: const InputDecoration(
              hintText: 'Search name, GSTIN, phone…',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: (v) => setState(() => _query = v.trim()),
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(_error!, style: const TextStyle(color: Color(0xFFD93025))),
                        const SizedBox(height: 8),
                        FilledButton.tonal(onPressed: _load, child: const Text('Retry')),
                      ]),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: _filtered.isEmpty
                          ? ListView(children: const [
                              SizedBox(height: 120),
                              Center(child: Text('No customers found')),
                            ])
                          : ListView.separated(
                              itemCount: _filtered.length,
                              separatorBuilder: (_, __) => const Divider(height: 1),
                              itemBuilder: (context, i) {
                                final c = _filtered[i];
                                return ListTile(
                                  leading: CircleAvatar(
                                    child: Text('${c['name'] ?? '?'}'.isNotEmpty ? '${c['name']}'[0].toUpperCase() : '?'),
                                  ),
                                  title: Text('${c['name'] ?? ''}'),
                                  subtitle: Text(
                                      [c['gstin'], c['phone'], c['email']]
                                          .where((v) => '$v'.isNotEmpty && v != 'null')
                                          .join(' · ')),
                                );
                              },
                            ),
                    ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _add,
              icon: const Icon(Icons.add),
              label: const Text('Add customer'),
            ),
          ),
        ),
      ],
    );
  }
}

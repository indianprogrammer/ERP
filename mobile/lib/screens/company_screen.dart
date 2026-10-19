import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';

class CompanyScreen extends StatefulWidget {
  const CompanyScreen({super.key});

  @override
  State<CompanyScreen> createState() => _CompanyScreenState();
}

class _CompanyScreenState extends State<CompanyScreen> {
  Map<String, dynamic>? _company;
  String? _error;
  bool _loading = true;
  bool _saving = false;

  late final _name = TextEditingController();
  late final _gstin = TextEditingController();
  late final _address = TextEditingController();
  late final _phone = TextEditingController();
  late final _email = TextEditingController();
  late final _pan = TextEditingController();
  late final _stateCode = TextEditingController();
  late final _bank = TextEditingController();
  late final _upi = TextEditingController();
  late final _terms = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in [_name, _gstin, _address, _phone, _email, _pan, _stateCode, _bank, _upi, _terms]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await context.read<ApiClient>().get('/api/company');
      final c = data['company'] as Map<String, dynamic>?;
      if (mounted) {
        setState(() => _company = c);
        final s = (c?['settings'] ?? {}) as Map<String, dynamic>;
        _name.text = '${c?['name'] ?? ''}';
        _gstin.text = '${c?['gstin'] ?? ''}';
        _address.text = '${c?['address'] ?? ''}';
        _phone.text = '${s['company_phone'] ?? ''}';
        _email.text = '${s['company_email'] ?? ''}';
        _pan.text = '${s['company_pan'] ?? ''}';
        _stateCode.text = '${s['company_state_code'] ?? '27'}';
        _bank.text = '${s['bank_name'] ?? ''}';
        _upi.text = '${s['upi_id'] ?? ''}';
        _terms.text = '${s['terms_conditions'] ?? ''}';
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await context.read<ApiClient>().put('/api/company', {
        'name': _name.text.trim(),
        'gstin': _gstin.text.trim().toUpperCase(),
        'address': _address.text.trim(),
        'company_phone': _phone.text.trim(),
        'company_email': _email.text.trim(),
        'company_pan': _pan.text.trim().toUpperCase(),
        'company_state_code': _stateCode.text.trim(),
        'bank_name': _bank.text.trim(),
        'upi_id': _upi.text.trim(),
        'terms_conditions': _terms.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Company updated')),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(_error!, style: const TextStyle(color: Color(0xFFD93025))),
          const SizedBox(height: 8),
          FilledButton.tonal(onPressed: _load, child: const Text('Retry')),
        ]),
      );
    }
    final c = _company ?? {};
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: ListTile(
            leading: const Icon(Icons.domain),
            title: Text('${c['name'] ?? ''}'),
            subtitle: Text(
                'Plan: ${c['plan'] ?? '-'} · Status: ${c['status'] ?? '-'} · Slug: ${c['slug'] ?? '-'}'),
          ),
        ),
        const SizedBox(height: 16),
        _section('Legal details'),
        _field(_name, 'Company name', Icons.business),
        const SizedBox(height: 10),
        _field(_gstin, 'GSTIN (15 chars)', Icons.pin),
        const SizedBox(height: 10),
        _field(_pan, 'PAN', Icons.badge),
        const SizedBox(height: 10),
        _field(_stateCode, 'GST state code (e.g. 27)', Icons.map),
        const SizedBox(height: 10),
        _field(_address, 'Address', Icons.location_on, maxLines: 3),
        const SizedBox(height: 10),
        _field(_phone, 'Phone', Icons.phone),
        const SizedBox(height: 10),
        _field(_email, 'Email', Icons.email),
        const SizedBox(height: 20),
        _section('Invoicing'),
        _field(_bank, 'Bank name', Icons.account_balance),
        const SizedBox(height: 10),
        _field(_upi, 'UPI ID', Icons.qr_code),
        const SizedBox(height: 10),
        _field(_terms, 'Terms & conditions', Icons.description, maxLines: 4),
        const SizedBox(height: 24),
        FilledButton.icon(
          onPressed: _saving ? null : _save,
          icon: _saving
              ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.save),
          label: const Text('Save changes'),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _section(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(t, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
      );

  Widget _field(TextEditingController c, String label, IconData icon, {int maxLines = 1}) {
    return TextFormField(
      controller: c,
      maxLines: maxLines,
      decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon)),
    );
  }
}

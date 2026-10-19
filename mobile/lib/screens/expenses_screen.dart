import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});

  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  List<Map<String, dynamic>> _expenses = [];
  List<Map<String, dynamic>> _projects = [];
  Map<String, dynamic> _totals = {};
  String? _error;
  bool _loading = true;
  String _type = ''; // '', 'project', 'individual'

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final api = context.read<ApiClient>();
      final q = _type.isEmpty ? '' : '?type=$_type';
      final data = await api.get('/api/expenses$q');
      if (!mounted) return;
      setState(() {
        _expenses = ((data['expenses'] ?? []) as List).cast<Map<String, dynamic>>();
        _totals = data;
      });
      if (_projects.isEmpty) {
        try {
          final p = await api.get('/api/projects');
          if (mounted) {
            _projects = ((p['projects'] ?? []) as List).cast<Map<String, dynamic>>();
          }
        } catch (_) { /* projects module may be unavailable */ }
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _record() async {
    final form = GlobalKey<FormState>();
    int? projectId;
    final title = TextEditingController();
    String category = 'General';
    final amount = TextEditingController();
    final notes = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Record expense'),
          content: Form(
            key: form,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<int?>(
                    initialValue: null,
                    decoration: const InputDecoration(
                      labelText: 'Project (empty = individual)',
                      prefixIcon: Icon(Icons.folder),
                    ),
                    items: [
                      const DropdownMenuItem<int?>(
                          value: null, child: Text('— Individual —')),
                      ..._projects.map((p) => DropdownMenuItem<int?>(
                            value: (p['id'] as num).toInt(),
                            child: Text('${p['code']} · ${p['name']}',
                                overflow: TextOverflow.ellipsis),
                          )),
                    ],
                    onChanged: (v) => setDlg(() => projectId = v),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: title,
                    decoration: const InputDecoration(labelText: 'Title *'),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    initialValue: 'General',
                    decoration: const InputDecoration(labelText: 'Category'),
                    items: const [
                      'General', 'Travel', 'Hardware', 'Software', 'Labour',
                      'Consulting', 'Rent', 'Utilities', 'Vendor Payment'
                    ]
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) => category = v ?? 'General',
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: amount,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Amount (₹) *'),
                    validator: (v) {
                      final n = double.tryParse(v ?? '');
                      if (n == null || n <= 0) return 'Enter amount > 0';
                      return null;
                    },
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: notes,
                    decoration: const InputDecoration(labelText: 'Notes'),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () =>
                    form.currentState!.validate() ? Navigator.pop(ctx, true) : null,
                child: const Text('Save')),
          ],
        ),
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await context.read<ApiClient>().post('/api/expenses', {
        if (projectId != null) 'project_id': projectId,
        'title': title.text.trim(),
        'category': category,
        'amount': double.parse(amount.text),
        'notes': notes.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Expense recorded')));
        await _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.decimalPattern('en_IN');
    final total = (_totals['total'] as num?) ?? 0;
    final projTotal = (_totals['project_total'] as num?) ?? 0;
    final indivTotal = (_totals['individual_total'] as num?) ?? 0;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            children: [
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: '', label: Text('All')),
                  ButtonSegment(value: 'project', label: Text('Project')),
                  ButtonSegment(value: 'individual', label: Text('Individual')),
                ],
                selected: {_type},
                onSelectionChanged: (s) => setState(() => _type = s.first),
              ),
              const Spacer(),
              Text('₹${fmt.format(total)}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700)),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(children: [
            _chip('Project ₹${fmt.format(projTotal)}'),
            const SizedBox(width: 8),
            _chip('Individual ₹${fmt.format(indivTotal)}'),
          ]),
        ),
        const SizedBox(height: 4),
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
                      child: _expenses.isEmpty
                          ? ListView(children: const [
                              SizedBox(height: 120),
                              Center(child: Text('No expenses recorded')),
                            ])
                          : ListView.separated(
                              itemCount: _expenses.length,
                              separatorBuilder: (_, __) => const Divider(height: 1),
                              itemBuilder: (context, i) {
                                final e = _expenses[i];
                                final isProject = e['project_id'] != null;
                                return ListTile(
                                  leading: Icon(
                                      isProject ? Icons.folder : Icons.person_outline,
                                      color: isProject
                                          ? const Color(0xFF1A73E8)
                                          : Colors.grey),
                                  title: Text('${e['title'] ?? ''}'),
                                  subtitle: Text([
                                    isProject
                                        ? '${e['project_code'] ?? 'Project'}'
                                        : 'Individual',
                                    '${e['category'] ?? 'General'}',
                                    '${e['expense_date'] ?? ''}'.isEmpty
                                        ? ''
                                        : '${e['expense_date']}',
                                  ].join(' · ')),
                                  trailing: Text(
                                      '₹${fmt.format((e['amount'] as num?) ?? 0)}',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w600)),
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
              onPressed: _record,
              icon: const Icon(Icons.add),
              label: const Text('Record expense'),
            ),
          ),
        ),
      ],
    );
  }

  Widget _chip(String t) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.grey.shade200,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(t, style: const TextStyle(fontSize: 12)),
      );
}

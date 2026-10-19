import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';

class ItemsScreen extends StatefulWidget {
  const ItemsScreen({super.key});

  @override
  State<ItemsScreen> createState() => _ItemsScreenState();
}

class _ItemsScreenState extends State<ItemsScreen> {
  List<Map<String, dynamic>> _items = [];
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
      final data = await context.read<ApiClient>().get('/api/items');
      if (mounted) {
        setState(() => _items = ((data['items'] ?? []) as List).cast<Map<String, dynamic>>());
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _filtered {
    if (_query.isEmpty) return _items;
    final q = _query.toLowerCase();
    return _items
        .where((i) => [i['sku'], i['name'], i['category'], i['hsn_sac']]
            .any((v) => '$v'.toLowerCase().contains(q)))
        .toList();
  }

  Future<void> _add() async {
    final form = GlobalKey<FormState>();
    final sku = TextEditingController();
    final name = TextEditingController();
    final price = TextEditingController(text: '0');
    final gst = TextEditingController(text: '18');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New item'),
        content: Form(
          key: form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: sku,
                decoration: const InputDecoration(labelText: 'SKU *'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Name *'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: price,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Sale price'),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: gst,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'GST rate %'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
              onPressed: () => form.currentState!.validate() ? Navigator.pop(ctx, true) : null,
              child: const Text('Add')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await context.read<ApiClient>().post('/api/items', {
        'sku': sku.text.trim(),
        'name': name.text.trim(),
        'sale_price': double.tryParse(price.text) ?? 0,
        'gst_rate': double.tryParse(gst.text) ?? 18,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Item added')));
        await _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.decimalPattern('en_IN');
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: TextField(
            decoration: const InputDecoration(
              hintText: 'Search SKU, name, category…',
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
                              Center(child: Text('No items found')),
                            ])
                          : ListView.separated(
                              itemCount: _filtered.length,
                              separatorBuilder: (_, __) => const Divider(height: 1),
                              itemBuilder: (context, i) {
                                final it = _filtered[i];
                                final stock = (it['stock'] is num) ? (it['stock'] as num).toInt() : 0;
                                final reorder = (it['reorder_level'] is num) ? (it['reorder_level'] as num).toInt() : 0;
                                final low = reorder > 0 && stock <= reorder;
                                return ListTile(
                                  title: Text('${it['name'] ?? ''}'),
                                  subtitle: Text(
                                      '${it['sku'] ?? ''} · GST ${it['gst_rate'] ?? 0}% · ${it['uom'] ?? 'Nos'}'),
                                  trailing: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text('₹${fmt.format(double.tryParse('${it['sale_price']}') ?? 0)}',
                                          style: const TextStyle(fontWeight: FontWeight.w600)),
                                      Text('Stock: $stock',
                                          style: TextStyle(
                                              fontSize: 12,
                                              color: low ? const Color(0xFFD93025) : Colors.grey[600])),
                                    ],
                                  ),
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
              label: const Text('Add item'),
            ),
          ),
        ),
      ],
    );
  }
}

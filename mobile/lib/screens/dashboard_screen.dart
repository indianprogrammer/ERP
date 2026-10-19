import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _data;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await context.read<ApiClient>().get('/api/dashboard');
      if (mounted) setState(() => _data = data);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
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
    final kpis = (_data?['kpis'] ?? {}) as Map<String, dynamic>;
    final recent = ((_data?['recentDocs'] ?? []) as List).cast<Map<String, dynamic>>();
    final fmt = NumberFormat.decimalPattern('en_IN');
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _KpiGrid(kpis: kpis, fmt: fmt),
          const SizedBox(height: 16),
          Text('Recent documents', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (recent.isEmpty)
            const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('No documents yet')))
          else
            ...recent.map((d) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Icon(_docIcon(d['doc_type']?.toString() ?? '')),
                    title: Text('${d['doc_no'] ?? ''} · ${d['customer_name'] ?? d['customer'] ?? ''}'),
                    subtitle: Text('${d['doc_type'] ?? ''} · ${d['doc_date'] ?? ''}'),
                    trailing: Text('₹${fmt.format(double.tryParse('${d['grand_total']}') ?? 0)}',
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                  ),
                )),
        ],
      ),
    );
  }

  static IconData _docIcon(String t) => switch (t) {
        'TaxInvoice' || 'Invoice' => Icons.receipt_long,
        'Quotation' || 'Proforma' => Icons.request_quote,
        'DeliveryChallan' => Icons.local_shipping,
        'CreditNote' || 'DebitNote' => Icons.undo,
        _ => Icons.description,
      };
}

class _KpiGrid extends StatelessWidget {
  final Map<String, dynamic> kpis;
  final NumberFormat fmt;
  const _KpiGrid({required this.kpis, required this.fmt});

  double _num(dynamic v) {
    if (v is Map) return ((v['total'] ?? 0) as num).toDouble();
    if (v is num) return v.toDouble();
    return 0;
  }

  int _count(dynamic v) {
    if (v is Map) return ((v['count'] ?? 0) as num).toInt();
    if (v is num) return v.toInt();
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final items = <_Kpi>[
      _Kpi('Sales (month)', '₹${fmt.format(_num(kpis['salesMonth']))}', Icons.trending_up, const Color(0xFF1A73E8)),
      _Kpi('Receivables', '₹${fmt.format(_num(kpis['receivables']))}', Icons.account_balance_wallet, const Color(0xFFF9AB00)),
      _Kpi('Expenses (month)', '₹${fmt.format(_num(kpis['expensesMonth']))}', Icons.payments_outlined, const Color(0xFFD93025)),
      _Kpi('Customers', '${kpis['customers'] ?? 0}', Icons.people, const Color(0xFF34A853)),
      _Kpi('Items', '${kpis['items'] ?? 0}', Icons.inventory_2, const Color(0xFF9334E6)),
      _Kpi('Low stock', '${kpis['lowStock'] ?? 0}', Icons.warning_amber, const Color(0xFFE8710A)),
      _Kpi('Leads', '${_count(kpis['leads'])}', Icons.leaderboard, const Color(0xFF00ACC1)),
      _Kpi('GST pending', '${kpis['gstPending'] ?? 0}', Icons.balance, const Color(0xFF616161)),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.7,
      children: items
          .map((k) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(children: [
                        Icon(k.icon, size: 18, color: k.color),
                        const SizedBox(width: 6),
                        Expanded(
                            child: Text(k.label,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.bodySmall)),
                      ]),
                      const SizedBox(height: 4),
                      Text(k.value,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ))
          .toList(),
    );
  }
}

class _Kpi {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _Kpi(this.label, this.value, this.icon, this.color);
}

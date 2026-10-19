import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import 'company_screen.dart';
import 'customers_screen.dart';
import 'dashboard_screen.dart';
import 'expenses_screen.dart';
import 'items_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;

  static const _titles = ['Dashboard', 'Company', 'Customers', 'Items', 'Expenses'];

  @override
  Widget build(BuildContext context) {
    final api = context.watch<ApiClient>();
    final pages = const [
      DashboardScreen(),
      CompanyScreen(),
      CustomersScreen(),
      ItemsScreen(),
      ExpensesScreen(),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_index]),
        actions: [
          if (api.tenant != null)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Center(
                child: Chip(
                  label: Text(api.tenant!['name'] ?? api.tenant!['slug'] ?? '',
                      style: const TextStyle(fontSize: 12)),
                  visualDensity: VisualDensity.compact,
                ),
              ),
            ),
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            onPressed: () => api.logout(),
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.business_outlined), selectedIcon: Icon(Icons.business), label: 'Company'),
          NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Customers'),
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2), label: 'Items'),
          NavigationDestination(icon: Icon(Icons.payments_outlined), selectedIcon: Icon(Icons.payments), label: 'Expenses'),
        ],
      ),
    );
  }
}

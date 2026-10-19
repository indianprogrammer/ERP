import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'api_client.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => ApiClient()..load(),
      child: const X3mApp(),
    ),
  );
}

class X3mApp extends StatelessWidget {
  const X3mApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'X3M ERP',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1A73E8),
          brightness: Brightness.light,
        ),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
          isDense: true,
        ),
      ),
      home: Consumer<ApiClient>(
        builder: (context, api, _) {
          if (!api.authed) return const LoginScreen();
          return const HomeScreen();
        },
      ),
    );
  }
}

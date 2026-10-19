import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Authenticated API client for the X3M ERP REST API.
///
/// Uses the Bearer-token flow: POST /api/auth/token exchanges
/// username/password/tenantSlug for a JWT, which is then sent as
/// `Authorization: Bearer <token>` on every request.
class ApiClient extends ChangeNotifier {
  static const _kBaseUrl = 'api_base_url';
  static const _kToken = 'api_token';
  static const _kRefresh = 'api_refresh_token';
  static const _kUser = 'api_user';

  String baseUrl = 'http://10.0.2.2:3000'; // Android emulator loopback
  String? token;
  String? refreshToken;
  Map<String, dynamic>? user;
  Map<String, dynamic>? tenant;

  bool get authed => token != null;

  Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    baseUrl = p.getString(_kBaseUrl) ?? baseUrl;
    token = p.getString(_kToken);
    refreshToken = p.getString(_kRefresh);
    final u = p.getString(_kUser);
    if (u != null) user = jsonDecode(u) as Map<String, dynamic>;
    notifyListeners();
  }

  Future<void> setBaseUrl(String url) async {
    baseUrl = url.replaceAll(RegExp(r'/+$'), '');
    final p = await SharedPreferences.getInstance();
    await p.setString(_kBaseUrl, baseUrl);
    notifyListeners();
  }

  Future<void> login({
    required String username,
    required String password,
    required String tenantSlug,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/token'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'password': password,
        'tenantSlug': tenantSlug,
      }),
    );
    final data = _decode(res);
    if (res.statusCode != 200) {
      throw ApiException(res.statusCode, data['error']?.toString() ?? 'Login failed');
    }
    token = data['token'] as String?;
    refreshToken = data['refreshToken'] as String?;
    user = data['user'] as Map<String, dynamic>?;
    tenant = data['tenant'] as Map<String, dynamic>?;
    final p = await SharedPreferences.getInstance();
    await p.setString(_kToken, token!);
    if (refreshToken != null) await p.setString(_kRefresh, refreshToken!);
    if (user != null) await p.setString(_kUser, jsonEncode(user));
    notifyListeners();
  }

  Future<void> logout() async {
    token = null;
    refreshToken = null;
    user = null;
    tenant = null;
    final p = await SharedPreferences.getInstance();
    await p.remove(_kToken);
    await p.remove(_kRefresh);
    await p.remove(_kUser);
    notifyListeners();
  }

  Future<Map<String, dynamic>> get(String path) async {
    final res = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return _handle(res);
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );
    return _handle(res);
  }

  Future<Map<String, dynamic>> put(String path, Map<String, dynamic> body) async {
    final res = await http.put(
      Uri.parse('$baseUrl$path'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );
    return _handle(res);
  }

  Map<String, dynamic> _handle(http.Response res) {
    final data = _decode(res);
    if (res.statusCode == 401) {
      // Token expired — force re-login
      logout();
      throw ApiException(401, 'Session expired — please sign in again');
    }
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, data['error']?.toString() ?? 'Request failed');
    }
    return data;
  }

  static Map<String, dynamic> _decode(http.Response res) {
    if (res.body.isEmpty) return {};
    try {
      return jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  @override
  String toString() => message;
}

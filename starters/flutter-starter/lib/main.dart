import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const StPayStarterApp());
}

class StPayStarterApp extends StatelessWidget {
  const StPayStarterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ST Pay Flutter Starter',
      home: const StarterHomePage(),
    );
  }
}

class StarterHomePage extends StatefulWidget {
  const StarterHomePage({super.key});

  @override
  State<StarterHomePage> createState() => _StarterHomePageState();
}

class _StarterHomePageState extends State<StarterHomePage> {
  static const String baseUrl = 'http://localhost:5169';
  static const String apiKey = 'sk_test_replace_me';

  final TextEditingController amountController = TextEditingController(text: '5000');
  final TextEditingController providerController = TextEditingController(text: 'MTN');
  String result = 'Ready.';

  Future<void> createPayment() async {
    setState(() => result = 'Creating payment...');

    final response = await http.post(
      Uri.parse('$baseUrl/api/Payment'),
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: jsonEncode({
        'amount': int.tryParse(amountController.text) ?? 5000,
        'currency': 'XAF',
        'provider': providerController.text.trim(),
        'customer': {
          'phoneNumber': '237677123456',
          'name': 'Flutter User',
          'email': 'flutter@example.com',
        },
        'merchant': {
          'reference': 'FLUTTER_${DateTime.now().millisecondsSinceEpoch}',
          'callbackUrl': 'https://example.com/callback',
          'name': 'Flutter Starter',
        },
        'description': 'ST Pay Flutter starter payment',
      }),
    );

    setState(() {
      result = 'HTTP ${response.statusCode}\n${response.body}';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ST Pay Flutter Starter')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Amount'),
            TextField(controller: amountController, keyboardType: TextInputType.number),
            const SizedBox(height: 8),
            const Text('Provider (MTN/ORANGE/MOOV/WAVE)'),
            TextField(controller: providerController),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: createPayment, child: const Text('Create Payment')),
            const SizedBox(height: 12),
            Expanded(
              child: SingleChildScrollView(
                child: SelectableText(result),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

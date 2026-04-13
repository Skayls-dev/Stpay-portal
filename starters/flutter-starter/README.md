# Flutter ST Pay Starter

Minimal Flutter starter to create a first ST Pay payment.

## 1. Configure

- Set your API host and API key in `lib/main.dart` (or secure config).
- Use `sk_test_` in development only.

## 2. Run

```bash
flutter pub get
flutter run
```

## 3. Validate

- Create payment and verify JSON response.
- Keep `transactionId` for status polling.

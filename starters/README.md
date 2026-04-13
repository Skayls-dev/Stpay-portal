# ST Pay Starter Apps

This folder contains lightweight starter templates to speed up integrations.

## Starters

- Web starter: [web-js-starter](web-js-starter)
- React Native starter: [react-native-starter](react-native-starter)
- Flutter starter: [flutter-starter](flutter-starter)

## Shared goal

Each starter helps you reach a first successful payment quickly:

1. Configure your API key and base URL.
2. Trigger `POST /api/Payment` with a valid payload.
3. Poll `GET /api/Payment/{paymentId}` to observe the final status.

## Security baseline

- Never commit `sk_live_` keys.
- Keep keys in secure env storage.
- Use `sk_test_` for development.
- Validate webhooks before production go-live.

See also:
- [../MOBILE_INTEGRATION_ERRORS.md](../MOBILE_INTEGRATION_ERRORS.md)
- [../SDK_RELEASE_CHECKLIST.md](../SDK_RELEASE_CHECKLIST.md)

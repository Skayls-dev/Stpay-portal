# React Native ST Pay Starter

Minimal template for first payment integration.

## 1. Configure

- Set your API key in `.env.example` or secure storage.
- Set `STPAY_BASE_URL` to your reachable API host.

## 2. Run

Use your React Native workflow (Expo or RN CLI), then paste `App.js` content in your app.

## 3. Test

Tap **Create Payment** and check the JSON result.

## Important

- Never ship `sk_live_` in app source.
- Keep production calls proxied via a secure backend when required by policy.

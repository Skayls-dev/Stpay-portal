Project feature layout
======================

We organize UI code by feature under `src/features/<feature>`.

Structure example for a feature:

 - src/features/payment/
   - api/       -> per-feature API surface (re-exports SDK or generated client)
   - PaymentForm.jsx
   - PaymentList.jsx
   - PaymentStatus.jsx

Why this helps
---------------
- Decouples components from the global SDK import path.
- Makes it easy to swap a generated OpenAPI client per feature by replacing the `api/index.ts` file.

How to plug a generated OpenAPI client
-------------------------------------
1. Generate the client into `src/features/<feature>/api/generated`.
2. Update `src/features/<feature>/api/index.ts` to re-export the generated client functions/hooks.
3. Components import from `src/features/<feature>/api` and remain unchanged.

Example: replacing payment SDK
 - Put generated client in `src/features/payment/api/generated`
 - Update `src/features/payment/api/index.ts` to export `processPayment`, `getPaymentStatus`, etc.

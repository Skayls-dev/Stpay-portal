// Per-feature API surface for Payment — thin wrapper around the central SDK
// This keeps feature code decoupled from the SDK location and allows replacing
// the implementation later (e.g., generated OpenAPI client) without touching components.

export {
  usePaymentProcess,
  usePaymentStatus,
  usePaymentCancel,
  usePaymentHistory
} from '../../../api';

export * from '../../../api/types';

export { paymentService } from '../../../api/services';

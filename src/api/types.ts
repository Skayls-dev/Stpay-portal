import type {
  CustomerInfo as GeneratedCustomerInfo,
  MerchantInfo as GeneratedMerchantInfo,
  PaymentRequest as GeneratedPaymentRequest,
  RefundRequest as GeneratedRefundRequest,
  WebhookListResponse,
  WebhookReplayResponse,
  WebhookSummary,
} from './types.gen';

export type PaymentRequest = GeneratedPaymentRequest;
export type RefundRequest = GeneratedRefundRequest;
export type CustomerInfo = GeneratedCustomerInfo & { phone?: string | null };
export type MerchantInfo = GeneratedMerchantInfo & { id?: string | null };

export interface PaymentResponse {
  transactionId?: string;
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  provider?: string;
  providerTransactionId?: string;
  paymentUrl?: string;
  message?: string;
  customerName?: string;
  phoneNumber?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface PaymentStatusResponse extends PaymentResponse {
  description?: string;
  customer?: CustomerInfo;
  merchant?: MerchantInfo;
  errorMessage?: string;
  updatedAt?: string;
}

export interface ApiError {
  Error?: string;
  Code?: string;
  title?: string;
  detail?: string;
  message?: string;
  status?: number;
  [key: string]: unknown;
}

export type {
  WebhookListResponse,
  WebhookReplayResponse,
  WebhookSummary,
};

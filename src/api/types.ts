// Types générés pour l'API ST Pay

export interface PaymentRequest {
  amount: number;
  currency: string;
  provider: 'MTN' | 'ORANGE' | 'MOOV' | 'WAVE';
  customer: CustomerInfo;
  merchant: MerchantInfo;
  description?: string;
  metadata?: Record<string, any>;
  merchantApiKey?: string;
}

export interface PaymentResponse {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  providerTransactionId?: string;
  paymentUrl?: string;
  createdAt: string;
}

export interface PaymentStatusResponse {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  providerTransactionId?: string;
  paymentUrl?: string;
  description?: string;
  customer: CustomerInfo;
  merchant: MerchantInfo;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInfo {
  name?: string;
  email?: string;
  phoneNumber: string;  // Correspond au backend: PhoneNumber
}

export interface MerchantInfo {
  name?: string;
  reference: string;  // Correspond au backend: Reference
  callbackUrl?: string;  // Correspond au backend: CallbackUrl
}

export interface ErrorResponse {
  Error: string;
  Code?: string;
}

// Types pour les réponses d'API
export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

export interface ApiError {
  Error: string;
  Code?: string;
  status?: number;
}

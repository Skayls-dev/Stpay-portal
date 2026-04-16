import { client as generatedClient } from './client.gen';
import {
  deleteApiPaymentByPaymentId,
  getApiPayment,
  getApiPaymentByPaymentId,
  getApiPaymentHealth,
  getApiPaymentProvidersByProviderHealth,
  getApiWebhooks,
  getApiWebhooksPendingRetries,
  postApiPayment,
  postApiPaymentByPaymentIdRefund,
  postApiWebhooksByIdReplay,
} from './sdk.gen';
import type { ApiError, PaymentRequest, RefundRequest } from './types';

const DEFAULT_BASE_URL = import.meta.env.VITE_API_URL ?? '';
const DEFAULT_API_KEY = import.meta.env.VITE_API_KEY || '';
const API_KEY_STORAGE_KEY = 'st-pay-api-key';

// Load API key from localStorage if available
const getStoredApiKey = (): string => {
  try {
    return typeof window !== 'undefined' ? (localStorage.getItem(API_KEY_STORAGE_KEY) || '') : '';
  } catch (e) {
    return '';
  }
};

// Save API key to localStorage
const saveApiKeyToStorage = (apiKey: string): void => {
  try {
    if (typeof window !== 'undefined') {
      if (apiKey) {
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    }
  } catch (e) {
    console.warn('Failed to persist API key to localStorage:', e);
  }
};

const normalizeError = (error: unknown, fallbackMessage: string): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  const payload = (error ?? {}) as ApiError;
  const message =
    payload.Error || payload.title || payload.detail || payload.message || fallbackMessage;

  const wrapped = new Error(message);
  (wrapped as Error & { status?: number; response?: ApiError }).status = payload.status;
  (wrapped as Error & { status?: number; response?: ApiError }).response = payload;
  return wrapped;
};

const getErrorMetadata = (error: unknown): { status?: number; payload?: ApiError } => {
  if (!error || typeof error !== 'object') {
    return {};
  }

  const candidate = error as {
    status?: number;
    response?: ApiError;
    body?: ApiError;
    error?: ApiError;
  };

  return {
    status: candidate.status,
    payload: candidate.response || candidate.body || candidate.error,
  };
};

const applyErrorMetadata = (target: Error, status?: number, payload?: ApiError): Error => {
  (target as Error & { status?: number; response?: ApiError }).status = status;
  (target as Error & { status?: number; response?: ApiError }).response = payload;
  return target;
};

const mapRefundError = (error: unknown): Error => {
  const normalized = normalizeError(error, 'Failed to refund payment');
  const normalizedMeta = getErrorMetadata(normalized);
  const rawMeta = getErrorMetadata(error);

  const status = normalizedMeta.status ?? rawMeta.status;
  const payload = normalizedMeta.payload ?? rawMeta.payload;
  const code = String(payload?.Code || '').toUpperCase();

  if (status === 404 || code === 'PAYMENT_NOT_FOUND') {
    return applyErrorMetadata(new Error('Paiement introuvable. Vérifiez le paymentId puis réessayez.'), status, payload);
  }

  if (code === 'INVALID_REFUND_AMOUNT') {
    return applyErrorMetadata(new Error('Le montant du remboursement doit être supérieur à 0.'), status, payload);
  }

  if (status === 400 || code === 'REFUND_NOT_ALLOWED') {
    return applyErrorMetadata(new Error('Le remboursement n\'est pas autorisé pour le statut actuel de ce paiement.'), status, payload);
  }

  return normalized;
};

export class ApiClient {
  constructor(private baseUrl: string = DEFAULT_BASE_URL, private apiKey: string = DEFAULT_API_KEY || getStoredApiKey()) {
    generatedClient.setConfig({ baseUrl: this.baseUrl });
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    generatedClient.setConfig({ baseUrl: this.baseUrl });
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey.trim();
    saveApiKeyToStorage(this.apiKey);
  }

  getApiKey(): string {
    return this.apiKey;
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> | undefined {
    const headers: Record<string, string> = { ...(extra || {}) };
    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
    }

    return Object.keys(headers).length > 0 ? headers : undefined;
  }

  private async fetchRaw(path: string): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const payload = await response.json();
        message = payload?.message || payload?.detail || payload?.title || message;
      } catch {
      }

      const error = new Error(message);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    return response;
  }

  async processPayment(paymentRequest: PaymentRequest): Promise<unknown> {
    try {
      return await postApiPayment({
        body: paymentRequest,
        headers: this.buildHeaders(),
        responseStyle: 'data',
        throwOnError: true,
      });
    } catch (error) {
      throw normalizeError(error, 'Failed to process payment');
    }
  }

  async getPaymentStatus(paymentId: string): Promise<unknown> {
    try {
      return await getApiPaymentByPaymentId({
        path: { paymentId },
        headers: this.buildHeaders(),
        responseStyle: 'data',
        throwOnError: true,
      });
    } catch (error) {
      throw normalizeError(error, 'Failed to fetch payment status');
    }
  }

  async cancelPayment(paymentId: string): Promise<unknown> {
    try {
      return await deleteApiPaymentByPaymentId({
        path: { paymentId },
        headers: this.buildHeaders(),
        responseStyle: 'data',
        throwOnError: true,
      });
    } catch (error) {
      throw normalizeError(error, 'Failed to cancel payment');
    }
  }

  async refundPayment(paymentId: string, refundRequest: RefundRequest): Promise<unknown> {
    try {
      return await postApiPaymentByPaymentIdRefund({
        path: { paymentId },
        body: refundRequest,
        headers: this.buildHeaders(),
        responseStyle: 'data',
        throwOnError: true,
      });
    } catch (error) {
      throw mapRefundError(error);
    }
  }

  async getAllPayments(): Promise<unknown> {
    try {
      return await getApiPayment({
        headers: this.buildHeaders(),
        responseStyle: 'data',
        throwOnError: true,
      });
    } catch (error) {
      throw normalizeError(error, 'Failed to fetch payments');
    }
  }

  async checkHealth(): Promise<unknown> {
    try {
      return await getApiPaymentHealth({
        headers: this.buildHeaders(),
        responseStyle: 'data',
        throwOnError: true,
      });
    } catch (error) {
      throw normalizeError(error, 'Health check failed');
    }
  }

  async checkProviderHealth(provider: string): Promise<unknown> {
    try {
      return await getApiPaymentProvidersByProviderHealth({
        path: { provider },
        headers: this.buildHeaders(),
        responseStyle: 'data',
        throwOnError: true,
      });
    } catch (error) {
      throw normalizeError(error, 'Provider health check failed');
    }
  }

  async getWebhooks(query?: {
    merchantId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<unknown> {
    try {
      return await getApiWebhooks({
        query,
        headers: this.buildHeaders(),
        responseStyle: 'data',
        throwOnError: true,
      });
    } catch (error) {
      throw normalizeError(error, 'Failed to fetch webhooks');
    }
  }

  async replayWebhook(id: string): Promise<unknown> {
    try {
      return await postApiWebhooksByIdReplay({
        path: { id },
        headers: this.buildHeaders(),
        responseStyle: 'data',
        throwOnError: true,
      });
    } catch (error) {
      throw normalizeError(error, 'Failed to replay webhook');
    }
  }

  async getPendingWebhookRetries(): Promise<unknown> {
    try {
      return await getApiWebhooksPendingRetries({
        headers: this.buildHeaders(),
        responseStyle: 'data',
        throwOnError: true,
      });
    } catch (error) {
      throw normalizeError(error, 'Failed to fetch pending webhook retries');
    }
  }

  async getOperationalHealth(): Promise<unknown> {
    try {
      const response = await this.fetchRaw('/health');
      return await response.json();
    } catch (error) {
      throw normalizeError(error, 'Failed to fetch operational health');
    }
  }

  async getReadinessHealth(): Promise<unknown> {
    try {
      const response = await this.fetchRaw('/health/ready');
      return await response.json();
    } catch (error) {
      throw normalizeError(error, 'Failed to fetch readiness health');
    }
  }

  async getLivenessHealth(): Promise<unknown> {
    try {
      const response = await this.fetchRaw('/health/live');
      return await response.text();
    } catch (error) {
      throw normalizeError(error, 'Failed to fetch liveness health');
    }
  }

  async getPrometheusMetricsSample(): Promise<unknown> {
    try {
      const response = await this.fetchRaw('/metrics');
      const text = await response.text();
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && (line.startsWith('# HELP stpay_') || line.startsWith('# TYPE stpay_') || line.startsWith('stpay_')))
        .slice(0, 40);

      return {
        metricFamilyCount: lines.filter((line) => line.startsWith('# HELP stpay_')).length,
        preview: lines,
      };
    } catch (error) {
      throw normalizeError(error, 'Failed to fetch Prometheus metrics');
    }
  }
}

export const apiClient = new ApiClient(DEFAULT_BASE_URL, DEFAULT_API_KEY);

import { apiClient } from './compat-client';
import type {
  CustomerInfo,
  MerchantInfo,
  PaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
} from './types';

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
};

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
};

const firstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
};

const normalizeCustomer = (input: unknown): CustomerInfo | undefined => {
  const source = toRecord(input);
  if (Object.keys(source).length === 0) return undefined;

  const phoneNumber = firstString(source.phoneNumber, source.phone);
  if (!phoneNumber) return undefined;

  return {
    phoneNumber,
    phone: phoneNumber,
    name: firstString(source.name) ?? null,
    email: firstString(source.email) ?? null,
  };
};

const normalizeMerchant = (input: unknown): MerchantInfo | undefined => {
  const source = toRecord(input);
  if (Object.keys(source).length === 0) return undefined;

  const reference = firstString(source.reference, source.id);
  if (!reference) return undefined;

  return {
    reference,
    id: reference,
    name: firstString(source.name) ?? null,
    callbackUrl: firstString(source.callbackUrl) ?? null,
  };
};

const normalizePayment = (input: unknown): PaymentStatusResponse => {
  const source = toRecord(input);
  const customer = normalizeCustomer(source.customer);
  const merchant = normalizeMerchant(source.merchant);
  const amount = firstNumber(source.amount);

  const normalized: PaymentStatusResponse = {
    id: firstString(source.id, source.transactionId, source.paymentId),
    transactionId: firstString(source.transactionId, source.id, source.paymentId),
    status: firstString(source.status, source.state) ?? 'unknown',
    amount,
    currency: firstString(source.currency) ?? 'XAF',
    provider: firstString(source.provider) ?? 'UNKNOWN',
    providerTransactionId: firstString(source.providerTransactionId),
    paymentUrl: firstString(source.paymentUrl),
    message: firstString(source.message),
    description: firstString(source.description),
    errorMessage: firstString(source.errorMessage, source.error),
    createdAt: firstString(source.createdAt, source.timestamp),
    updatedAt: firstString(source.updatedAt, source.timestamp),
    customer,
    merchant,
    customerName: customer?.name ?? undefined,
    phoneNumber: customer?.phoneNumber ?? undefined,
  };

  return {
    ...source,
    ...normalized,
  };
};

const normalizePaymentList = (payload: unknown): PaymentStatusResponse[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizePayment);
  }

  const source = toRecord(payload);

  if (Array.isArray(source.items)) {
    return source.items.map(normalizePayment);
  }

  if (Array.isArray(source.data)) {
    return source.data.map(normalizePayment);
  }

  if (Array.isArray(source.Data)) {
    return source.Data.map(normalizePayment);
  }

  return [];
};

export class PaymentService {
  constructor(private client = apiClient) {}

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const response = await this.client.processPayment(request);
    return normalizePayment(response);
  }

  async getStatus(paymentId: string): Promise<PaymentStatusResponse> {
    const response = await this.client.getPaymentStatus(paymentId);
    return normalizePayment(response);
  }

  async cancel(paymentId: string): Promise<PaymentStatusResponse> {
    const response = await this.client.cancelPayment(paymentId);
    return normalizePayment(response);
  }

  async getHistory(): Promise<PaymentStatusResponse[]> {
    const response = await this.client.getAllPayments();
    return normalizePaymentList(response);
  }
}

export class PaymentValidationService {
  static validatePaymentRequest(request: Partial<PaymentRequest>): string[] {
    const errors: string[] = [];

    if (!request.amount || request.amount <= 0) {
      errors.push('Le montant doit être supérieur à 0');
    }

    if (!request.currency || request.currency.length !== 3) {
      errors.push('La devise doit être un code à 3 caractères');
    }

    if (!request.provider || !['MTN', 'ORANGE', 'MOOV', 'WAVE'].includes(request.provider.toUpperCase())) {
      errors.push('Le fournisseur doit être MTN, ORANGE, MOOV ou WAVE');
    }

    if (!request.customer?.phoneNumber?.trim()) {
      errors.push('Le téléphone du client est requis');
    }

    if (!request.merchant?.reference?.trim()) {
      errors.push('La référence marchand est requise');
    }

    if (request.description && request.description.length > 500) {
      errors.push('La description ne peut pas dépasser 500 caractères');
    }

    return errors;
  }
}

export class PaymentStatusService {
  static canCancel(status: string): boolean {
    const normalized = status.toLowerCase();
    return ['pending', 'processing', 'initiated', 'in_progress'].includes(normalized);
  }

  static isCompleted(status: string): boolean {
    const normalized = status.toLowerCase();
    return ['completed', 'success', 'successful'].includes(normalized);
  }

  static isFailed(status: string): boolean {
    const normalized = status.toLowerCase();
    return ['failed', 'error', 'rejected', 'declined', 'cancelled', 'canceled'].includes(normalized);
  }

  static isPending(status: string): boolean {
    const normalized = status.toLowerCase();
    return ['pending', 'processing', 'initiated', 'in_progress'].includes(normalized);
  }

  static getStatusClass(status: string): string {
    if (this.isCompleted(status)) return 'status-completed';
    if (this.isFailed(status)) return 'status-failed';
    if (this.isPending(status)) return 'status-pending';
    return 'status-unknown';
  }

  static getStatusMessage(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'En attente',
      processing: 'En cours de traitement',
      completed: 'Terminé avec succès',
      success: 'Réussi',
      successful: 'Réussi',
      failed: 'Échec',
      error: 'Erreur',
      cancelled: 'Annulé',
      canceled: 'Annulé',
      rejected: 'Rejeté',
      declined: 'Refusé',
      initiated: 'Initié',
      in_progress: 'En cours',
    };

    return statusMap[status.toLowerCase()] || status;
  }

  static getStatusDisplay(status: string): string {
    return this.getStatusMessage(status);
  }

  static getStatusIcon(status: string): string {
    if (this.isCompleted(status)) return '✅';
    if (this.isFailed(status)) return '❌';
    if (this.isPending(status)) return '⏳';
    return '❓';
  }
}

export const paymentService = new PaymentService();
export const validationService = PaymentValidationService;
export const statusService = PaymentStatusService;

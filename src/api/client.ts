import {
  PaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
  ApiResponse,
  ApiError
} from './types';

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = 'http://localhost:5169', defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorData: ApiError;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            Error: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status
          };
        }
        
        const error = new Error(errorData.Error || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).code = errorData.Code;
        (error as any).response = errorData;
        throw error;
      }

      // Handle empty responses (e.g., 204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erreur réseau ou de communication avec l\'API');
    }
  }

  // Méthodes de l'API Payment

  /**
   * Traite un nouveau paiement
   * @param paymentRequest - Les détails du paiement
   * @returns Promise<PaymentResponse>
   */
  async processPayment(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    return this.request<PaymentResponse>('/api/payment', {
      method: 'POST',
      body: JSON.stringify(paymentRequest)
    });
  }

  /**
   * Récupère le statut d'un paiement
   * @param paymentId - L'ID du paiement
   * @returns Promise<PaymentStatusResponse>
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    return this.request<PaymentStatusResponse>(`/api/payment/${encodeURIComponent(paymentId)}`);
  }

  /**
   * Annule un paiement
   * @param paymentId - L'ID du paiement à annuler
   * @returns Promise<PaymentStatusResponse>
   */
  async cancelPayment(paymentId: string): Promise<PaymentStatusResponse> {
    return this.request<PaymentStatusResponse>(`/api/payment/${encodeURIComponent(paymentId)}`, {
      method: 'DELETE'
    });
  }

  /**
   * Récupère tous les paiements
   * @returns Promise<PaymentStatusResponse[]>
   */
  async getAllPayments(): Promise<PaymentStatusResponse[]> {
    return this.request<PaymentStatusResponse[]>('/api/payment');
  }

  /**
   * Vérifie la santé de l'API
   * @returns Promise<{ status: string }>
   */
  async checkHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/api/payment/health');
  }

  /**
   * Met à jour l'URL de base
   * @param baseUrl - Nouvelle URL de base
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Met à jour les en-têtes par défaut
   * @param headers - Nouveaux en-têtes
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      ...headers
    };
  }

  /**
   * Ajoute un en-tête d'authentification
   * @param token - Token d'authentification
   */
  setAuthToken(token: string): void {
    this.setDefaultHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Supprime l'en-tête d'authentification
   */
  clearAuthToken(): void {
    const { Authorization, ...headersWithoutAuth } = this.defaultHeaders;
    this.defaultHeaders = headersWithoutAuth;
  }
}

// Instance par défaut du client API
export const apiClient = new ApiClient(
  import.meta.env.VITE_API_URL || 'http://localhost:5169'
);

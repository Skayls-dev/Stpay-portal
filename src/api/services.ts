// Services spécialisés pour l'API ST Pay
import { apiClient } from './client';
import {
  PaymentRequest,
  PaymentResponse,
  PaymentStatusResponse
} from './types';

/**
 * Service de gestion des paiements
 */
export class PaymentService {
  constructor(private client = apiClient) {}

  /**
   * Traite un nouveau paiement
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      return await this.client.processPayment(request);
    } catch (error) {
      console.error('Erreur lors du traitement du paiement:', error);
      throw error;
    }
  }

  /**
   * Récupère le statut d'un paiement
   */
  async getStatus(paymentId: string): Promise<PaymentStatusResponse> {
    try {
      return await this.client.getPaymentStatus(paymentId);
    } catch (error) {
      console.error('Erreur lors de la récupération du statut:', error);
      throw error;
    }
  }

  /**
   * Annule un paiement
   */
  async cancel(paymentId: string): Promise<PaymentStatusResponse> {
    try {
      return await this.client.cancelPayment(paymentId);
    } catch (error) {
      console.error('Erreur lors de l\'annulation du paiement:', error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des paiements
   */
  async getHistory(): Promise<PaymentStatusResponse[]> {
    try {
      const response = await this.client.getAllPayments();
      // Le backend retourne { Success: true, Data: [], Message: "...", Timestamp: "..." }
      // Nous devons extraire le tableau des données
      if (response && typeof response === 'object' && 'Data' in response) {
        return (response as any).Data || [];
      }
      // Si c'est déjà un tableau, le retourner tel quel
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      // En cas d'erreur, retourner un tableau vide pour éviter les erreurs de type
      return [];
    }
  }
}

/**
 * Service de validation des paiements
 */
export class PaymentValidationService {
  /**
   * Valide les données d'un paiement
   */
  static validatePaymentRequest(request: Partial<PaymentRequest>): string[] {
    const errors: string[] = [];

    if (!request.amount || request.amount <= 0) {
      errors.push('Le montant doit être supérieur à 0');
    }

    if (!request.currency || request.currency.length !== 3) {
      errors.push('La devise doit être un code à 3 caractères');
    }

    if (!request.provider || !['MTN', 'ORANGE', 'MOOV', 'WAVE'].includes(request.provider)) {
      errors.push('Le fournisseur doit être MTN, ORANGE, MOOV ou WAVE');
    }

    if (!request.customer) {
      errors.push('Les informations client sont requises');
    } else {
      if (!request.customer.name?.trim()) {
        errors.push('Le nom du client est requis');
      }
      if (!request.customer.email?.trim() || !this.isValidEmail(request.customer.email)) {
        errors.push('Un email client valide est requis');
      }
      if (!request.customer.phone?.trim()) {
        errors.push('Le téléphone du client est requis');
      }
    }

    if (!request.merchant) {
      errors.push('Les informations marchand sont requises');
    } else {
      if (!request.merchant.name?.trim()) {
        errors.push('Le nom du marchand est requis');
      }
      if (!request.merchant.id?.trim()) {
        errors.push('L\'ID du marchand est requis');
      }
    }

    if (request.description && request.description.length > 500) {
      errors.push('La description ne peut pas dépasser 500 caractères');
    }

    return errors;
  }

  /**
   * Valide un email
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valide un numéro de téléphone (format basique)
   */
  static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 8;
  }

  /**
   * Formate un montant pour l'affichage
   */
  static formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'XOF' ? 'EUR' : currency, // Fallback pour XOF
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount).replace('€', 'XOF');
  }
}

/**
 * Service de gestion des états de paiement
 */
export class PaymentStatusService {
  /**
   * Détermine si un paiement peut être annulé
   */
  static canCancel(status: string): boolean {
    const cancellableStatuses = ['pending', 'processing', 'initiated'];
    return cancellableStatuses.includes(status.toLowerCase());
  }

  /**
   * Détermine si un paiement est terminé
   */
  static isCompleted(status: string): boolean {
    const completedStatuses = ['completed', 'success', 'successful'];
    return completedStatuses.includes(status.toLowerCase());
  }

  /**
   * Détermine si un paiement a échoué
   */
  static isFailed(status: string): boolean {
    const failedStatuses = ['failed', 'error', 'rejected', 'declined'];
    return failedStatuses.includes(status.toLowerCase());
  }

  /**
   * Détermine si un paiement est en cours
   */
  static isPending(status: string): boolean {
    const pendingStatuses = ['pending', 'processing', 'initiated', 'in_progress'];
    return pendingStatuses.includes(status.toLowerCase());
  }

  /**
   * Retourne la classe CSS appropriée pour un statut
   */
  static getStatusClass(status: string): string {
    if (this.isCompleted(status)) return 'status-completed';
    if (this.isFailed(status)) return 'status-failed';
    if (this.isPending(status)) return 'status-pending';
    return 'status-unknown';
  }

  /**
   * Retourne un message lisible pour un statut
   */
  static getStatusMessage(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'En attente',
      'processing': 'En cours de traitement',
      'completed': 'Terminé avec succès',
      'success': 'Réussi',
      'successful': 'Réussi',
      'failed': 'Échec',
      'error': 'Erreur',
      'cancelled': 'Annulé',
      'canceled': 'Annulé',
      'rejected': 'Rejeté',
      'declined': 'Refusé'
    };
    
    return statusMap[status.toLowerCase()] || status;
  }

  /**
   * Retourne un libellé pour affichage (alias de getStatusMessage)
   */
  static getStatusDisplay(status: string): string {
    return this.getStatusMessage(status);
  }

  /**
   * Retourne l'icône appropriée pour un statut
   */
  static getStatusIcon(status: string): string {
    if (this.isCompleted(status)) return '✅';
    if (this.isFailed(status)) return '❌';
    if (this.isPending(status)) return '⏳';
    return '❓';
  }
}

// Instances par défaut des services
export const paymentService = new PaymentService();
export const validationService = PaymentValidationService;
export const statusService = PaymentStatusService;

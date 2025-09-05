// Point d'entrée principal pour l'API ST Pay SDK

// Export des types
export * from './types';

// Export du client principal
export { ApiClient, apiClient } from './client';

// Export des services
export {
  PaymentService,
  PaymentValidationService,
  PaymentStatusService,
  paymentService,
  validationService,
  statusService
} from './services';

// Export des hooks React personnalisés
export * from './hooks';

// Configuration par défaut
export const DEFAULT_CONFIG = {
  baseUrl: 'http://localhost:5169',
  timeout: 30000,
  retries: 3
};

// Version du SDK
export const SDK_VERSION = '1.0.0';

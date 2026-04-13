// Utilitaires helper pour l'application ST Pay
import toast from 'react-hot-toast';

/**
 * Gestionnaire d'erreurs global
 */
export const errorHandler = {
  /**
   * Traite et affiche les erreurs de l'API
   */
  handleApiError(error, context = 'Operation') {
    console.error(`${context} failed:`, error);
    
    let message = 'An unexpected error occurred';
    
    if (error.response?.Error) {
      message = error.response.Error;
    } else if (error.message) {
      message = error.message;
    } else if (error.status) {
      switch (error.status) {
        case 400:
          message = 'Invalid request. Please check your input.';
          break;
        case 401:
          message = 'Authentication required.';
          break;
        case 403:
          message = 'Access denied.';
          break;
        case 404:
          message = 'Resource not found.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        case 503:
          message = 'Service temporarily unavailable.';
          break;
        default:
          message = `Request failed (${error.status})`;
      }
    }
    
    toast.error(message);
    return message;
  },

  /**
   * Affiche un message de succès
   */
  showSuccess(message) {
    toast.success(message);
  },

  /**
   * Affiche un message d'information
   */
  showInfo(message) {
    toast(message, {
      icon: 'ℹ️',
    });
  }
};

/**
 * Utilitaires de formatage
 */
export const formatters = {
  /**
   * Formate un montant avec la devise
   */
  formatAmount(amount, currency = 'XAF') {
    if (typeof amount !== 'number') {
      amount = parseFloat(amount) || 0;
    }
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'XAF' ? 'EUR' : currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount).replace('€', currency);
  },

  /**
   * Formate une date
   */
  formatDate(dateString, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Date(dateString).toLocaleDateString('fr-FR', {
      ...defaultOptions,
      ...options
    });
  },

  /**
   * Formate un numéro de téléphone
   */
  formatPhoneNumber(phone) {
    // Supprimer tous les caractères non numériques sauf le +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Si ça commence par +237 (Cameroun), formater spécialement
    if (cleaned.startsWith('+237')) {
      const number = cleaned.slice(4);
      if (number.length === 9) {
        return `+237 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
      }
    }
    
    return cleaned;
  },

  /**
   * Tronque un texte
   */
  truncate(text, maxLength = 50) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }
};

/**
 * Utilitaires de validation
 */
export const validators = {
  /**
   * Valide un email
   */
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Valide un numéro de téléphone
   */
  isValidPhoneNumber(phone) {
    const cleaned = phone.replace(/[^\d+]/g, '');
    return cleaned.length >= 8 && cleaned.length <= 15;
  },

  /**
   * Valide un montant
   */
  isValidAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  },

  /**
   * Valide les données d'un paiement
   */
  validatePaymentData(data) {
    const errors = [];

    if (!this.isValidAmount(data.amount)) {
      errors.push('Amount must be greater than 0');
    }

    if (!data.provider) {
      errors.push('Payment provider is required');
    }

    if (!this.isValidPhoneNumber(data.phoneNumber)) {
      errors.push('Please enter a valid phone number');
    }

    if (!data.customerName?.trim()) {
      errors.push('Customer name is required');
    }

    if (!this.isValidEmail(data.customerEmail)) {
      errors.push('Please enter a valid email address');
    }

    return errors;
  }
};

/**
 * Utilitaires de stockage local
 */
export const storage = {
  /**
   * Sauvegarde des données dans le localStorage
   */
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  /**
   * Récupère des données du localStorage
   */
  load(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return defaultValue;
    }
  },

  /**
   * Supprime des données du localStorage
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }
};

/**
 * Constantes de l'application
 */
export const constants = {
  PROVIDERS: [
    { value: 'MTN', label: '📱 MTN Mobile Money', color: '#FFD700' },
    { value: 'ORANGE', label: '🍊 Orange Money', color: '#FF6600' },
    { value: 'WAVE', label: '🌊 Wave', color: '#0066CC' },
    { value: 'MOOV', label: '🔵 Moov Money', color: '#00AA44' }
  ],
  
  CURRENCIES: [
    { value: 'XAF', label: 'XAF (Central African Franc)' },
    { value: 'USD', label: 'USD (US Dollar)' },
    { value: 'EUR', label: 'EUR (Euro)' }
  ],
  
  PAYMENT_STATUSES: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  }
};

export default {
  errorHandler,
  formatters,
  validators,
  storage,
  constants
};

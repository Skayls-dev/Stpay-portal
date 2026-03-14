import { useCallback, useEffect, useState } from 'react';
import type { PaymentRequest, PaymentResponse, PaymentStatusResponse } from './types';
import { paymentService, statusService } from './services';

const toMessage = (err: unknown, fallback: string): string => {
  if (err && typeof err === 'object') {
    const candidate = err as { message?: string; response?: { Error?: string } };
    return candidate.response?.Error || candidate.message || fallback;
  }
  if (typeof err === 'string') return err;
  return fallback;
};

export function usePaymentProcess() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentResponse | null>(null);

  const processPayment = useCallback(async (request: PaymentRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await paymentService.processPayment(request);
      setResult(response);
      return response;
    } catch (err) {
      setError(toMessage(err, 'Erreur lors du traitement du paiement'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setIsLoading(false);
  }, []);

  return {
    processPayment,
    isLoading,
    error,
    result,
    reset,
  };
}

export function usePaymentStatus(paymentId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);

  const fetchStatus = useCallback(
    async (id?: string) => {
      const targetId = id || paymentId;
      if (!targetId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await paymentService.getStatus(targetId);
        setStatus(response);
        return response;
      } catch (err) {
        setError(toMessage(err, 'Erreur lors de la récupération du statut'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [paymentId]
  );

  const refresh = useCallback(() => {
    if (paymentId) {
      fetchStatus(paymentId);
    }
  }, [fetchStatus, paymentId]);

  useEffect(() => {
    if (paymentId) {
      fetchStatus(paymentId);
    }
  }, [fetchStatus, paymentId]);

  return {
    fetchStatus,
    refresh,
    isLoading,
    error,
    status,
    canCancel: status ? statusService.canCancel(status.status || '') : false,
    isCompleted: status ? statusService.isCompleted(status.status || '') : false,
    isPending: status ? statusService.isPending(status.status || '') : false,
    isFailed: status ? statusService.isFailed(status.status || '') : false,
  };
}

export function usePaymentCancel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelPayment = useCallback(async (paymentId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      return await paymentService.cancel(paymentId);
    } catch (err) {
      setError(toMessage(err, 'Erreur lors de l\'annulation du paiement'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    cancelPayment,
    isLoading,
    error,
  };
}

export function usePaymentHistory() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentStatusResponse[]>([]);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await paymentService.getHistory();
      setPayments(response);
      return response;
    } catch (err) {
      setError(toMessage(err, 'Erreur lors de la récupération de l\'historique'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    fetchHistory,
    refresh,
    isLoading,
    error,
    payments,
  };
}

export function useApiNotifications() {
  const showSuccess = useCallback((message: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.success(message);
      return;
    }
    console.log('✅ ' + message);
  }, []);

  const showError = useCallback((message: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.error(message);
      return;
    }
    console.error('❌ ' + message);
  }, []);

  const showLoading = useCallback((message: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      return (window as any).toast.loading(message);
    }
    console.log('⏳ ' + message);
    return null;
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    if (typeof window !== 'undefined' && (window as any).toast && toastId) {
      (window as any).toast.dismiss(toastId);
    }
  }, []);

  return {
    showSuccess,
    showError,
    showLoading,
    dismiss,
  };
}

export function usePaymentPolling(paymentId?: string, interval = 5000) {
  const [isPolling, setIsPolling] = useState(false);
  const { fetchStatus, status, error } = usePaymentStatus();

  const startPolling = useCallback(() => {
    if (!paymentId || isPolling) return;

    setIsPolling(true);
    const intervalId = setInterval(async () => {
      try {
        const currentStatus = await fetchStatus(paymentId);
        const value = currentStatus?.status || '';

        if (statusService.isCompleted(value) || statusService.isFailed(value)) {
          setIsPolling(false);
          clearInterval(intervalId);
        }
      } catch {
        clearInterval(intervalId);
        setIsPolling(false);
      }
    }, interval);

    return () => {
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [paymentId, isPolling, fetchStatus, interval]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  return {
    startPolling,
    stopPolling,
    isPolling,
    status,
    error,
  };
}

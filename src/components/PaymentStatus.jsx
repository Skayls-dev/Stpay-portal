import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { usePaymentStatus, usePaymentCancel, statusService } from '../api';

const PaymentStatus = () => {
  const { fetchStatus, isLoading, error, status: paymentStatus } = usePaymentStatus();
  const { cancelPayment, isLoading: cancelLoading } = usePaymentCancel();
  const [searchHistory, setSearchHistory] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm();

  const onSubmit = async (data) => {
    try {
      await fetchStatus(data.paymentId);
      toast.success('Statut du paiement récupéré avec succès!');
      
      // Ajouter à l'historique de recherche
      setSearchHistory(prev => {
        const newHistory = [data.paymentId, ...prev.filter(id => id !== data.paymentId)];
        return newHistory.slice(0, 5); // Garder seulement les 5 derniers
      });
    } catch (error) {
      console.error('Erreur de vérification du statut:', error);
      if (error.status === 404 || error.response?.Error === 'Payment not found') {
        toast.error('Paiement non trouvé. Vérifiez l\'ID du paiement.');
      } else {
        toast.error(error.response?.Error || error.message || 'Échec de la récupération du statut du paiement');
      }
    }
  };

  const handleCancelPayment = async () => {
    if (!paymentStatus?.transactionId) return;

    if (!confirm('Êtes-vous sûr de vouloir annuler ce paiement?')) {
      return;
    }

    try {
      await cancelPayment(paymentStatus.transactionId);
      toast.success('Paiement annulé avec succès!');
      
      // Actualiser le statut du paiement
      await fetchStatus(paymentStatus.transactionId);
    } catch (error) {
      console.error('Erreur d\'annulation du paiement:', error);
      toast.error(error.response?.Error || error.message || 'Échec de l\'annulation du paiement');
    }
  };

  const getStatusClass = (status) => {
    return statusService.getStatusClass(status);
  };

  const canCancelPayment = (status) => {
    return statusService.canCancel(status);
  };

  const handleNewSearch = () => {
    reset();
  };

  const selectFromHistory = (paymentId) => {
    setValue('paymentId', paymentId);
    fetchStatus(paymentId);
  };

  const getStatusIcon = (status) => {
    if (statusService.isCompleted(status)) return '✅';
    if (statusService.isFailed(status)) return '❌';
    if (statusService.isPending(status)) return '⏳';
    return '🔄';
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>📊 Check Payment Status</h1>
        <p>Vérifiez le statut de vos paiements en temps réel</p>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2>🔍 Search Payment</h2>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="paymentId">Payment ID / Transaction ID *</label>
            <input
              id="paymentId"
              type="text"
              {...register('paymentId', { required: 'L\'ID du paiement est requis' })}
              placeholder="Entrez l'ID du paiement ou de la transaction"
              style={{ fontFamily: 'monospace' }}
            />
            {errors.paymentId && <div className="error">{errors.paymentId.message}</div>}
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                  Checking...
                </>
              ) : (
                <>
                  🔍 Check Status
                </>
              )}
            </button>

            {paymentStatus && (
              <button type="button" className="btn btn-secondary" onClick={handleNewSearch}>
                🆕 New Search
              </button>
            )}
          </div>
        </form>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-6)' }}>
            <h4 style={{ marginBottom: 'var(--spacing-3)', color: 'var(--gray-700)' }}>
              🕒 Recent Searches
            </h4>
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
              {searchHistory.map((id, index) => (
                <button
                  key={index}
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => selectFromHistory(id)}
                  style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                >
                  {id.substring(0, 12)}...
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {paymentStatus && (
        <div className="card fade-in">
          <div className="card-header">
            <h2>💳 Payment Details</h2>
            <span style={{ fontSize: '2rem' }}>
              {getStatusIcon(paymentStatus.status)}
            </span>
          </div>
          
          <div className={`status-badge ${getStatusClass(paymentStatus.status)}`} 
               style={{ display: 'inline-flex', marginBottom: 'var(--spacing-6)' }}>
            {statusService.getStatusMessage(paymentStatus.status)}
          </div>

          <div className="card card-compact" style={{ background: 'var(--gray-50)' }}>
            <div className="form-row">
              <div>
                <h4 style={{ marginBottom: 'var(--spacing-4)', color: 'var(--gray-800)' }}>
                  Transaction Info
                </h4>
                <p><strong>Transaction ID:</strong> 
                  <span style={{ fontFamily: 'monospace', marginLeft: 'var(--spacing-2)' }}>
                    {paymentStatus.transactionId}
                  </span>
                </p>
                <p><strong>Amount:</strong> {paymentStatus.amount?.toLocaleString()} {paymentStatus.currency}</p>
                <p><strong>Provider:</strong> {paymentStatus.provider}</p>
                {paymentStatus.providerTransactionId && (
                  <p><strong>Provider Transaction ID:</strong> 
                    <span style={{ fontFamily: 'monospace', marginLeft: 'var(--spacing-2)' }}>
                      {paymentStatus.providerTransactionId}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <h4 style={{ marginBottom: 'var(--spacing-4)', color: 'var(--gray-800)' }}>
                  Timestamps
                </h4>
                {paymentStatus.createdAt && (
                  <p><strong>Created:</strong> {new Date(paymentStatus.createdAt).toLocaleString('fr-FR')}</p>
                )}
                {paymentStatus.updatedAt && (
                  <p><strong>Last Updated:</strong> {new Date(paymentStatus.updatedAt).toLocaleString('fr-FR')}</p>
                )}
                {paymentStatus.createdAt && paymentStatus.updatedAt && (
                  <p><strong>Duration:</strong> {
                    Math.round((new Date(paymentStatus.updatedAt) - new Date(paymentStatus.createdAt)) / 1000)
                  } seconds</p>
                )}
              </div>
            </div>

            {paymentStatus.description && (
              <div style={{ marginTop: 'var(--spacing-4)' }}>
                <p><strong>Description:</strong> {paymentStatus.description}</p>
              </div>
            )}
          </div>

          {paymentStatus.customer && (
            <div className="card card-compact">
              <h4 style={{ marginBottom: 'var(--spacing-4)', color: 'var(--gray-800)' }}>
                👤 Customer Information
              </h4>
              <div className="form-row">
                <div>
                  <p><strong>Name:</strong> {paymentStatus.customer.name}</p>
                  <p><strong>Email:</strong> {paymentStatus.customer.email}</p>
                </div>
                <div>
                  <p><strong>Phone:</strong> {paymentStatus.customer.phone}</p>
                </div>
              </div>
            </div>
          )}

          {paymentStatus.merchant && (
            <div className="card card-compact">
              <h4 style={{ marginBottom: 'var(--spacing-4)', color: 'var(--gray-800)' }}>
                🏢 Merchant Information
              </h4>
              <div className="form-row">
                <div>
                  <p><strong>Name:</strong> {paymentStatus.merchant.name}</p>
                </div>
                <div>
                  <p><strong>ID:</strong> {paymentStatus.merchant.id}</p>
                </div>
              </div>
            </div>
          )}

          {paymentStatus.errorMessage && (
            <div className="card card-compact" style={{ background: 'var(--error-50)', border: '1px solid var(--error-200)' }}>
              <h4 style={{ color: 'var(--error-800)', marginBottom: 'var(--spacing-3)' }}>
                ⚠️ Error Details
              </h4>
              <p style={{ color: 'var(--error-700)' }}>{paymentStatus.errorMessage}</p>
            </div>
          )}

          {paymentStatus.paymentUrl && statusService.isPending(paymentStatus.status) && (
            <div className="card card-compact" style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-200)' }}>
              <h4 style={{ color: 'var(--primary-800)', marginBottom: 'var(--spacing-3)' }}>
                🔗 Action Required
              </h4>
              <p style={{ color: 'var(--primary-700)', marginBottom: 'var(--spacing-4)' }}>
                Complete your payment using the link below:
              </p>
              <a 
                href={paymentStatus.paymentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                🌐 Complete Payment
              </a>
            </div>
          )}

          <div style={{ marginTop: 'var(--spacing-6)', display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigator.clipboard.writeText(paymentStatus.transactionId)}
            >
              📋 Copy Transaction ID
            </button>
            
            {canCancelPayment(paymentStatus.status) && (
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={handleCancelPayment}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    Cancelling...
                  </>
                ) : (
                  <>
                    ❌ Cancel Payment
                  </>
                )}
              </button>
            )}

            <button 
              className="btn btn-secondary" 
              onClick={() => fetchStatus(paymentStatus.transactionId)}
              disabled={isLoading}
            >
              🔄 Refresh Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentStatus;

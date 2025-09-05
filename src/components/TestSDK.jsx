import React, { useState } from 'react';
import { apiClient, paymentService } from '../api';

const TestSDK = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Test simple: récupérer tous les paiements via le service
      const payments = await paymentService.getHistory();
      setResult({
        success: true,
        message: 'Connection réussie!',
        data: payments
      });
    } catch (err) {
      console.error('Erreur de connexion SDK:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const testHealth = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Test l'endpoint health qui fonctionne
      const health = await apiClient.checkHealth();
      setResult({
        success: true,
        message: 'Health check réussi!',
        data: health
      });
    } catch (err) {
      console.error('Erreur health check:', err);
      setError(err.message || 'Erreur health check');
    } finally {
      setLoading(false);
    }
  };

  const testPayment = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const testPaymentData = {
        amount: 1000,
        currency: 'XAF',
        provider: 'MTN',
        phoneNumber: '237677123456',
        customerName: 'Test User',
        customerEmail: 'test@example.com',
        description: 'Test SDK Payment'
      };

      const response = await paymentService.processPayment(testPaymentData);
      setResult({
        success: true,
        message: 'Paiement traité!',
        data: response
      });
    } catch (err) {
      console.error('Erreur de paiement SDK:', err);
      setError(err.message || 'Erreur de paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ccc', 
      borderRadius: '8px',
      margin: '20px 0',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>🔧 Test SDK ST Pay</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={testConnection}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Test...' : 'Test Connection'}
        </button>

        <button 
          onClick={testHealth}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Test...' : 'Test Health'}
        </button>
        
        <button 
          onClick={testPayment}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Test...' : 'Test Payment'}
        </button>
      </div>

      {loading && (
        <div style={{ color: '#007bff' }}>
          🔄 Test en cours...
        </div>
      )}

      {error && (
        <div style={{ 
          color: '#dc3545',
          padding: '10px',
          backgroundColor: '#f8d7da',
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          ❌ Erreur: {error}
        </div>
      )}

      {result && (
        <div style={{ 
          color: result.success ? '#155724' : '#dc3545',
          padding: '10px',
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          {result.success ? '✅' : '❌'} {result.message}
          {result.data && (
            <pre style={{ 
              marginTop: '10px', 
              fontSize: '12px',
              backgroundColor: 'white',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <strong>SDK Configuration:</strong><br/>
        Base URL: http://localhost:5169<br/>
        Client: @hey-api/client-fetch
      </div>
    </div>
  );
};

export default TestSDK;

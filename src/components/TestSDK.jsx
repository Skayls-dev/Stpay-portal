import React, { useState } from 'react';
import { apiClient, paymentService } from '../api';

const TestSDK = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentId, setPaymentId] = useState('');
  const [provider, setProvider] = useState('MTN');
  const [merchantId, setMerchantId] = useState('');
  const [page, setPage] = useState('1');
  const [pageSize, setPageSize] = useState('20');
  const [webhookId, setWebhookId] = useState('');
  const [apiKey, setApiKey] = useState(apiClient.getApiKey() || '');

  const applyResult = (message, data) => {
    setResult({
      success: true,
      message,
      data,
    });
  };

  const runTest = async (runner, successMessage) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await runner();
      applyResult(successMessage, data);
      return data;
    } catch (err) {
      console.error('Erreur SDK:', err);
      setError(err.message || 'Erreur SDK');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    await runTest(() => paymentService.getHistory(), 'Connection réussie!');
  };

  const testHealth = async () => {
    await runTest(() => apiClient.checkHealth(), 'Health check réussi!');
  };

  const testPayment = async () => {
    const data = await runTest(async () => {
      const testPaymentData = {
        amount: 1000,
        currency: 'XAF',
        provider,
        customer: {
          phoneNumber: '237677123456',
          email: 'test@example.com',
          name: 'Test User',
        },
        merchant: {
          reference: 'TEST_MERCHANT_001',
          callbackUrl: 'http://localhost:3000/callback',
          name: 'Test Merchant',
        },
        description: 'Test SDK Payment',
      };

      return paymentService.processPayment(testPaymentData);
    }, 'Paiement traité!');

    const createdId = data?.transactionId || data?.id;
    if (createdId) {
      setPaymentId(createdId);
    }
  };

  const testProviderHealth = async () => {
    await runTest(
      () => apiClient.checkProviderHealth(provider.trim()),
      `Provider health check réussi (${provider})`
    );
  };

  const testPaymentStatus = async () => {
    if (!paymentId.trim()) {
      setError('Saisissez un paymentId pour tester le statut');
      return;
    }

    await runTest(
      () => paymentService.getStatus(paymentId.trim()),
      'Statut paiement récupéré!'
    );
  };

  const testCancelPayment = async () => {
    if (!paymentId.trim()) {
      setError('Saisissez un paymentId pour tester la suppression/annulation');
      return;
    }

    await runTest(
      () => paymentService.cancel(paymentId.trim()),
      'Paiement annulé/supprimé!'
    );
  };

  const testRefund = async () => {
    if (!paymentId.trim()) {
      setError('Saisissez un paymentId pour tester le remboursement');
      return;
    }

    await runTest(
      () =>
        apiClient.refundPayment(paymentId.trim(), {
          amount: 100,
          reason: 'Test refund depuis frontend',
        }),
      'Remboursement déclenché!'
    );
  };

  const testWebhookList = async () => {
    const parsedPage = Number(page);
    const parsedPageSize = Number(pageSize);

    await runTest(
      () =>
        apiClient.getWebhooks({
          merchantId: merchantId.trim() || undefined,
          page: Number.isFinite(parsedPage) ? parsedPage : 1,
          pageSize: Number.isFinite(parsedPageSize) ? parsedPageSize : 20,
        }),
      'Liste des webhooks récupérée!'
    );
  };

  const testWebhookReplay = async () => {
    if (!webhookId.trim()) {
      setError('Saisissez un webhookId pour tester le replay');
      return;
    }

    await runTest(() => apiClient.replayWebhook(webhookId.trim()), 'Replay webhook envoyé!');
  };

  const testPendingRetries = async () => {
    await runTest(() => apiClient.getPendingWebhookRetries(), 'Pending retries récupérés!');
  };

  const testOperationalHealth = async () => {
    await runTest(() => apiClient.getOperationalHealth(), 'Health (ops) récupéré!');
  };

  const testReadinessHealth = async () => {
    await runTest(() => apiClient.getReadinessHealth(), 'Health readiness récupéré!');
  };

  const testLivenessHealth = async () => {
    await runTest(() => apiClient.getLivenessHealth(), 'Health liveness récupéré!');
  };

  const testPrometheusMetrics = async () => {
    await runTest(() => apiClient.getPrometheusMetricsSample(), 'Metrics Prometheus récupérées!');
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

      <div style={{ display: 'grid', gap: '10px', marginBottom: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <input
          value={apiKey}
          onChange={(event) => {
            const value = event.target.value;
            setApiKey(value);
            apiClient.setApiKey(value);
          }}
          placeholder="X-Api-Key"
          type="password"
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
          placeholder="Provider (MTN, ORANGE...)"
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          value={paymentId}
          onChange={(event) => setPaymentId(event.target.value)}
          placeholder="Payment ID (status/delete/refund)"
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          value={webhookId}
          onChange={(event) => setWebhookId(event.target.value)}
          placeholder="Webhook ID (replay)"
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          value={merchantId}
          onChange={(event) => setMerchantId(event.target.value)}
          placeholder="Merchant ID (optionnel, webhooks)"
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          value={page}
          onChange={(event) => setPage(event.target.value)}
          placeholder="Page"
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          value={pageSize}
          onChange={(event) => setPageSize(event.target.value)}
          placeholder="Page size"
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
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

        <button
          onClick={testProviderHealth}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0ea5e9',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Test...' : 'Test Provider Health'}
        </button>

        <button
          onClick={testPaymentStatus}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Test...' : 'Test Status'}
        </button>

        <button
          onClick={testCancelPayment}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Test...' : 'Test Cancel/Delete'}
        </button>

        <button
          onClick={testRefund}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Test...' : 'Test Refund'}
        </button>

        <button
          onClick={testWebhookList}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#14b8a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Test...' : 'Test Webhooks'}
        </button>

        <button
          onClick={testWebhookReplay}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Test...' : 'Test Replay'}
        </button>

        <button
          onClick={testPendingRetries}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#64748b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Test...' : 'Test Pending Retries'}
        </button>

        <button
          onClick={testOperationalHealth}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#334155',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Test...' : 'Test /health'}
        </button>

        <button
          onClick={testReadinessHealth}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#475569',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Test...' : 'Test /health/ready'}
        </button>

        <button
          onClick={testLivenessHealth}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#64748b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Test...' : 'Test /health/live'}
        </button>

        <button
          onClick={testPrometheusMetrics}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0f766e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Test...' : 'Test /metrics'}
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
        Client: @hey-api/client-fetch<br/>
        Endpoints testables: Payment (POST/GET/DELETE), Refund, Provider Health, Webhooks, Replay, Pending Retries
        <br/>
        Observabilité: /health, /health/ready, /health/live, /metrics
        <br/>
        API Key: {apiKey ? `***${apiKey.slice(-4)}` : 'non défini'}
      </div>
    </div>
  );
};

export default TestSDK;

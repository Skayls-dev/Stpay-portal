import React, { useState } from 'react';
import { paymentService, statusService } from '../api';
import toast from 'react-hot-toast';

const MobilePaymentSimulator = () => {
  const [mockMode, setMockMode] = useState(import.meta.env.VITE_MOCK_MODE === 'true');
  const [phoneNumber, setPhoneNumber] = useState('237677123456');
  const [amount, setAmount] = useState('1000');
  const [customerName, setCustomerName] = useState('John Doe');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // Simulate USSD payment flow
  const handleInitiatePayment = async () => {
    setLoading(true);
    try {
      const request = {
        amount: parseFloat(amount),
        currency: 'XAF',
        provider: 'MTN',
        customer: {
          phoneNumber,
          name: customerName,
          email: 'test@example.com'
        },
        merchant: {
          reference: 'MOBILE_SIM_001',
          name: 'Mobile Payment Simulator',
          callbackUrl: 'http://localhost:3000/callback'
        },
        description: 'Mobile payment simulation test',
        metadata: {
          mockMode,
          source: 'mobile-simulator'
        }
      };

      const response = await paymentService.processPayment(request);
      const txId = response.transactionId || response.id;
      setTransactionId(txId);
      setPollingStatus({
        status: 'PENDING',
        message: '📞 Please complete payment on your phone'
      });
      setPollingActive(true);
      setPollCount(0);
      
      toast.success(`✅ Payment initiated! Transaction ID: ${txId}`);
      
      // Auto-start polling
      startPolling(txId);
    } catch (err) {
      console.error('Payment initiation failed:', err);
      toast.error(err.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  // Poll payment status
  const startPolling = async (txId) => {
    let attempts = 0;
    const maxAttempts = 12; // 1 minute with 5-second intervals
    
    const pollInterval = setInterval(async () => {
      attempts++;
      setPollCount(attempts);
      
      try {
        const status = await paymentService.getStatus(txId);
        
        setPollingStatus(status);
        
        if (statusService.isCompleted(status.status)) {
          clearInterval(pollInterval);
          setPollingActive(false);
          toast.success(`✅ Payment completed! Status: ${status.status}`);
        } else if (statusService.isFailed(status.status)) {
          clearInterval(pollInterval);
          setPollingActive(false);
          toast.error(`❌ Payment failed: ${status.status}`);
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setPollingActive(false);
          toast(
            '⏱️ Polling timeout. Payment may still be processing.',
            { icon: '⏳' }
          );
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Continue polling on error
      }
    }, 5000); // Poll every 5 seconds
  };

  const stopPolling = () => {
    setPollingActive(false);
  };

  const handleManualStatusCheck = async () => {
    if (!transactionId) {
      toast.error('No active transaction');
      return;
    }
    
    setLoading(true);
    try {
      const status = await paymentService.getStatus(transactionId);
      setPollingStatus(status);
      toast.success('✅ Status updated');
    } catch (err) {
      toast.error(err.message || 'Failed to check status');
    } finally {
      setLoading(false);
    }
  };

  const resetSimulation = () => {
    setTransactionId('');
    setPollingStatus(null);
    setPollingActive(false);
    setPollCount(0);
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>📱 Mobile Payment Simulator</h1>
        <p>
          Simulate a complete mobile payment flow without a real phone.
          {mockMode && (
            <span style={{ display: 'block', marginTop: '8px', color: 'var(--primary-600)', fontWeight: '600' }}>
              🧪 Mock Mode Enabled
            </span>
          )}
        </p>
      </div>

      {/* Configuration Panel */}
      <div className="card">
        <div className="card-header">
          <h2>⚙️ Configuration</h2>
        </div>

        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--gray-50)', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '16px' }}>
            <input
              type="checkbox"
              checked={mockMode}
              onChange={(e) => setMockMode(e.target.checked)}
              disabled={loading}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span>
              🧪 <strong>Enable Mock Mode</strong>
              <br />
              <small style={{ color: 'var(--gray-600)' }}>
                When enabled, uses local mock payment adapter (fast, no real provider needed)
              </small>
            </span>
          </label>
        </div>

        {!transactionId ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label>Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={loading}
                placeholder="John Doe"
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
                placeholder="237677123456"
              />
              <small style={{ color: 'var(--gray-600)' }}>
                E.g., 237677123456 or 46733123454 (MTN sandbox test number)
              </small>
            </div>

            <div className="form-group">
              <label>Amount (XAF)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                placeholder="1000"
                min="1"
                step="100"
              />
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px', backgroundColor: 'var(--primary-50)', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Active Transaction ID:</strong>
            </p>
            <code style={{ 
              display: 'block', 
              padding: '12px', 
              backgroundColor: 'white', 
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              {transactionId}
            </code>
          </div>
        )}
      </div>

      {/* Payment Initiation */}
      {!transactionId ? (
        <div className="card">
          <div className="card-header">
            <h2>💳 Step 1: Initiate Payment</h2>
          </div>

          <p style={{ marginBottom: '24px', color: 'var(--gray-700)' }}>
            Click the button below to initiate a payment. This will simulate the payment request
            being sent to the payment provider.
          </p>

          <button
            onClick={handleInitiatePayment}
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ minWidth: '200px' }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
                Initiating...
              </>
            ) : (
              '💰 Initiate Payment'
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Status Polling Display */}
          <div className="card">
            <div className="card-header">
              <h2>📊 Step 2: Payment Processing</h2>
              {pollingActive && <span style={{ color: 'var(--primary-600)' }}>🔄 Polling...</span>}
            </div>

            {pollingStatus && (
              <div style={{ marginBottom: '24px' }}>
                <div className={`status-badge ${statusService.getStatusClass(pollingStatus.status || '')}`}
                     style={{ marginBottom: '16px', display: 'inline-block' }}>
                  {statusService.getStatusMessage(pollingStatus.status || 'unknown')}
                </div>

                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--gray-50)',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Customer:</strong> {pollingStatus.customerName || customerName}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Amount:</strong> {pollingStatus.amount?.toLocaleString() || amount} {pollingStatus.currency || 'XAF'}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Provider:</strong> {pollingStatus.provider || 'MTN'} {mockMode ? '(mock-routed)' : ''}
                  </div>
                  <div>
                    <strong>Status:</strong> {pollingStatus.status}
                  </div>
                  {pollingActive && (
                    <div style={{ marginTop: '12px', color: 'var(--primary-600)', fontSize: '0.875rem' }}>
                      ⏳ Polling attempt {pollCount}... (will check up to 12 times)
                    </div>
                  )}
                </div>

                {pollingStatus.errorMessage && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--error-50)',
                    borderRadius: '4px',
                    color: 'var(--error-700)',
                    marginBottom: '16px'
                  }}>
                    <strong>Error:</strong> {pollingStatus.errorMessage}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {pollingActive ? (
                <button
                  onClick={stopPolling}
                  className="btn btn-secondary"
                  style={{ minWidth: '120px' }}
                >
                  ⏹️ Stop Polling
                </button>
              ) : (
                <button
                  onClick={handleManualStatusCheck}
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ minWidth: '120px' }}
                >
                  {loading ? '...' : '🔄 Check Status'}
                </button>
              )}

              <button
                onClick={resetSimulation}
                className="btn btn-secondary"
                style={{ minWidth: '120px' }}
              >
                🔄 New Payment
              </button>

              <button
                onClick={() => navigator.clipboard.writeText(transactionId)}
                className="btn btn-secondary"
                style={{ minWidth: '120px' }}
              >
                📋 Copy Transaction ID
              </button>
            </div>
          </div>

          {/* Information Panel */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary-50), var(--primary-100))' }}>
            <h3 style={{ color: 'var(--primary-800)', marginBottom: '16px' }}>ℹ️ How It Works</h3>
            <ul style={{ marginLeft: '24px', color: 'var(--primary-700)' }}>
              <li>The payment is submitted with provider MTN ({mockMode ? 'mock-routed by backend config' : 'live adapter route'}).</li>
              <li>In real scenarios, the customer would receive a USSD prompt on their phone.</li>
              <li>The simulator automatically polls the payment status every 5 seconds.</li>
              <li>The status will transition from PENDING → SUCCESSFUL or FAILED.</li>
              <li>In mock mode, the payment will succeed after 2-3 polling attempts.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default MobilePaymentSimulator;

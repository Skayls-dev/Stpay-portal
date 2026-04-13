import React, { useState } from 'react';
import { usePaymentProcess } from '../api';
import { errorHandler, validators, formatters, constants } from '../utils/helpers';
import toast from 'react-hot-toast';

const PaymentForm = () => {
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'XAF',
    provider: '',
    phoneNumber: '',
    customerName: '',
    customerEmail: '',
    description: ''
  });

  const [step, setStep] = useState(1);
  const { processPayment, isLoading, error, result: paymentResult, reset } = usePaymentProcess();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      // Validation before going to confirmation step
      const errors = validators.validatePaymentData(formData);
      
      if (errors.length > 0) {
        errors.forEach(error => toast.error(error));
        return;
      }
      setStep(2);
    } else {
      // Process payment
      try {
        const paymentRequest = {
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          provider: formData.provider,
          customer: {
            name: formData.customerName,
            email: formData.customerEmail,
            phoneNumber: formatters.formatPhoneNumber(formData.phoneNumber)
          },
          merchant: {
            name: 'STPAY Merchant',
            reference: 'STPAY_MERCHANT',
            callbackUrl: 'https://skayls.com/api/callbacks/stpay'
          },
          description: formData.description || 'Payment via ST Pay'
        };
        await processPayment(paymentRequest);
        errorHandler.showSuccess('Payment initiated successfully!');
      } catch (err) {
        console.error('Payment creation failed:', err);
        errorHandler.handleApiError(err, 'Payment creation');
      }
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleReset = () => {
    setFormData({
      amount: '',
      currency: 'XAF',
      provider: '',
      phoneNumber: '',
      customerName: '',
      customerEmail: '',
      description: ''
    });
    setStep(1);
    reset();
  };

  if (paymentResult) {
    return (
      <div className="card">
        <div className="success-header">
          <div className="success-icon">✅</div>
          <h2 className="page-title">Payment Processed Successfully!</h2>
        </div>
        
        <div className="success-content">
          <div className="payment-details">
            <div className="detail-card">
              <h3>Transaction Details</h3>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="label">Transaction ID:</span>
                  <span className="value transaction-id">{paymentResult.transactionId}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Amount:</span>
                  <span className="value amount">{paymentResult.amount} {paymentResult.currency}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Customer:</span>
                  <span className="value">{paymentResult.customerName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Phone:</span>
                  <span className="value">{paymentResult.phoneNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Provider:</span>
                  <span className="value provider">{paymentResult.provider}</span>
                </div>
                {paymentResult.providerTransactionId && (
                  <div className="detail-row">
                    <span className="label">Provider Transaction ID:</span>
                    <span className="value">{paymentResult.providerTransactionId}</span>
                  </div>
                )}
                {paymentResult.message && (
                  <div className="detail-row">
                    <span className="label">Message:</span>
                    <span className="value">{paymentResult.message}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="next-steps">
              <h4>📋 What's Next?</h4>
              <ul>
                <li>You will receive a confirmation SMS shortly</li>
                <li>The payment will be processed by {paymentResult.provider}</li>
                <li>You can track the status in the Payment History section</li>
              </ul>
            </div>
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleReset}
            >
              ← Create New Payment
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              🏠 Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="page-title">💳 Create New Payment</h2>
      
      <div className="progress-container">
        <div className={`progress-steps step-${step}`}>
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-number">
              {step > 1 ? '✓' : '1'}
            </div>
            <label className="step-label">Payment Details</label>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <label className="step-label">Confirmation</label>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️</span>
          Error: {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="form-step">
            <h3>👤 Customer Information</h3>
            
            <div className="form-group">
              <label htmlFor="customerName">Full Name *</label>
              <div className="form-group-floating">
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  required
                  placeholder=" "
                />
                <label htmlFor="customerName" className="floating-label">Enter your full name</label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="customerEmail">Email Address</label>
              <div className="form-group-floating">
                <input
                  type="email"
                  id="customerEmail"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  placeholder=" "
                />
                <label htmlFor="customerEmail" className="floating-label">Enter your email address</label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number *</label>
              <div className="form-group-floating">
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  required
                  placeholder=" "
                />
                <label htmlFor="phoneNumber" className="floating-label">Enter your phone number</label>
              </div>
              <small className="form-help">
                Example: 237677123456 or 677123456
              </small>
            </div>

            <h3>💰 Payment Information</h3>

            <div className="form-group">
              <label htmlFor="amount">Amount *</label>
              <div className="amount-input-group">
                <div className="form-group-floating">
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    min="1"
                    step="0.01"
                    placeholder=" "
                  />
                  <label htmlFor="amount" className="floating-label">Enter amount</label>
                </div>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="currency-select"
                >
                  {constants.CURRENCIES.map(currency => (
                    <option key={currency.value} value={currency.value}>
                      {currency.value}
                    </option>
                  ))}
                </select>
              </div>
              <small className="form-help">
                Minimum amount: 1 {formData.currency}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="provider">Payment Provider *</label>
              <div className="provider-grid">
                {constants.PROVIDERS.map(provider => (
                  <div
                    key={provider.value}
                    className={`provider-card ${formData.provider === provider.value ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({...prev, provider: provider.value}))}
                  >
                    <span className="provider-icon">
                      {provider.value === 'MTN' && '📱'}
                      {provider.value === 'ORANGE' && '🍊'}
                      {provider.value === 'WAVE' && '🌊'}
                      {provider.value === 'MOOV' && '🔵'}
                    </span>
                    <span className="provider-name">{provider.label}</span>
                    <span className="provider-check">
                      {formData.provider === provider.value ? '✓' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description (Optional)</label>
              <div className="form-group-floating">
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder=" "
                ></textarea>
                <label htmlFor="description" className="floating-label">Enter payment description</label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lg">
                Review Payment →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-step">
            <h3>🔍 Confirm Payment Details</h3>
            
            <div className="confirmation-card">
              <div className="confirmation-section">
                <h4>Customer Information</h4>
                <div className="confirmation-details">
                  <div className="detail-row">
                    <span className="label">Name:</span>
                    <span className="value">{formData.customerName}</span>
                  </div>
                  {formData.customerEmail && (
                    <div className="detail-row">
                      <span className="label">Email:</span>
                      <span className="value">{formData.customerEmail}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Phone:</span>
                    <span className="value">{formData.phoneNumber}</span>
                  </div>
                </div>
              </div>

              <div className="confirmation-section">
                <h4>Payment Information</h4>
                <div className="confirmation-details">
                  <div className="detail-row highlight">
                    <span className="label">Amount:</span>
                    <span className="value amount">{formData.amount} {formData.currency}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Provider:</span>
                    <span className="value provider">{formData.provider}</span>
                  </div>
                  {formData.description && (
                    <div className="detail-row">
                      <span className="label">Description:</span>
                      <span className="value">{formData.description}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="warning-note">
              <span>⚠️</span>
              <div>
                <strong>Important:</strong> Please ensure all details are correct before confirming. 
                Once processed, this payment cannot be cancelled.
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={handleBack}
                className="btn btn-secondary"
              >
                ← Back to Edit
              </button>
              <button 
                type="submit" 
                className="btn btn-primary btn-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    💳 Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default PaymentForm;
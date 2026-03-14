import React, { useState } from 'react';
import { usePaymentProcess } from '../../api';
import { errorHandler, formatters } from '../../utils/helpers';
import toast from 'react-hot-toast';

const EventPaymentForm = ({ reservation, onPaymentSuccess, onCancel }) => {
  const [step, setStep] = useState(1);
  const { processPayment, isLoading, error, result: paymentResult, reset } = usePaymentProcess();

  const handlePayment = async () => {
    try {
      const paymentRequest = {
        amount: reservation.totalAmount,
        currency: reservation.currency,
        provider: 'MTN', // Default provider, could be made selectable
        customer: {
          name: reservation.customerName,
          email: reservation.customerEmail,
          phoneNumber: reservation.customerPhone
        },
        merchant: {
          name: 'ST Events',
          reference: `EVENT_${reservation.eventId}`,
          callbackUrl: 'https://skayls.com/api/callbacks/event-payment'
        },
        description: `Event ticket payment - ${reservation.eventName}`,
        metadata: {
          eventId: reservation.eventId,
          reservationId: reservation.reservationId,
          eventName: reservation.eventName,
          quantity: reservation.quantity
        }
      };

      await processPayment(paymentRequest);
      setStep(2);
      
    } catch (err) {
      console.error('Payment failed:', err);
      errorHandler.handleApiError(err, 'Payment');
    }
  };

  const handleSuccess = () => {
    // Update reservation status and notify parent
    const updatedReservation = {
      ...reservation,
      status: 'confirmed',
      paymentId: paymentResult.transactionId,
      paymentStatus: 'completed',
      confirmedAt: new Date().toISOString()
    };

    onPaymentSuccess(updatedReservation, paymentResult);
    toast.success('Tickets confirmed! Check your email for details.');
  };

  if (!reservation) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content payment-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">💳 Payment for Event Tickets</h2>
          <button onClick={onCancel} className="close-btn">×</button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <>
              <div className="reservation-summary">
                <h3>🎫 Reservation Summary</h3>
                <div className="summary-card">
                  <div className="event-info">
                    <h4>{reservation.eventName}</h4>
                    <div className="event-details">
                      <div className="detail-item">
                        <span>📅</span>
                        <span>{formatters.formatDate(reservation.eventDate + 'T' + reservation.eventTime)}</span>
                      </div>
                      <div className="detail-item">
                        <span>📍</span>
                        <span>{reservation.eventLocation}</span>
                      </div>
                      <div className="detail-item">
                        <span>🎫</span>
                        <span>{reservation.quantity} ticket{reservation.quantity > 1 ? 's' : ''}</span>
                      </div>
                      <div className="detail-item">
                        <span>👤</span>
                        <span>{reservation.customerName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="payment-breakdown">
                    <div className="breakdown-row">
                      <span>Ticket Price:</span>
                      <span>{formatters.formatAmount(reservation.ticketPrice, reservation.currency)}</span>
                    </div>
                    <div className="breakdown-row">
                      <span>Quantity:</span>
                      <span>× {reservation.quantity}</span>
                    </div>
                    <div className="breakdown-row total">
                      <span>Total Amount:</span>
                      <span className="total-amount">
                        {formatters.formatAmount(reservation.totalAmount, reservation.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="payment-info">
                <h3>💳 Payment Information</h3>
                <div className="payment-method">
                  <div className="method-card selected">
                    <span className="method-icon">📱</span>
                    <div className="method-details">
                      <div className="method-name">MTN Mobile Money</div>
                      <div className="method-description">Pay with your MTN Mobile Money account</div>
                    </div>
                    <span className="method-check">✓</span>
                  </div>
                </div>

                <div className="payment-instructions">
                  <h4>📋 Payment Instructions</h4>
                  <ol>
                    <li>Click "Pay Now" to initiate the payment</li>
                    <li>You will receive an SMS prompt on your phone</li>
                    <li>Enter your Mobile Money PIN to confirm</li>
                    <li>Your tickets will be confirmed automatically</li>
                  </ol>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <span>⚠️</span>
                  Error: {error}
                </div>
              )}
            </>
          )}

          {step === 2 && paymentResult && (
            <div className="payment-success">
              <div className="success-header">
                <div className="success-icon">✅</div>
                <h2>Payment Successful!</h2>
                <p>Your event tickets have been confirmed</p>
              </div>

              <div className="success-details">
                <div className="detail-card">
                  <h3>Payment Details</h3>
                  <div className="detail-grid">
                    <div className="detail-row">
                      <span className="label">Transaction ID:</span>
                      <span className="value">{paymentResult.transactionId}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Amount:</span>
                      <span className="value">{formatters.formatAmount(paymentResult.amount, paymentResult.currency)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Event:</span>
                      <span className="value">{reservation.eventName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Tickets:</span>
                      <span className="value">{reservation.quantity}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Reservation ID:</span>
                      <span className="value">{reservation.reservationId}</span>
                    </div>
                  </div>
                </div>

                <div className="next-steps">
                  <h4>📧 What's Next?</h4>
                  <ul>
                    <li>Confirmation email sent to {reservation.customerEmail}</li>
                    <li>QR code tickets attached to the email</li>
                    <li>Bring your tickets (printed or on phone) to the event</li>
                    <li>Arrive 30 minutes before the event starts</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 1 && (
            <>
              <button onClick={onCancel} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                onClick={handlePayment}
                className="btn btn-primary btn-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    💳 Pay {formatters.formatAmount(reservation.totalAmount, reservation.currency)}
                  </>
                )}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button onClick={onCancel} className="btn btn-secondary">
                Close
              </button>
              <button onClick={handleSuccess} className="btn btn-primary">
                ✅ Confirm & Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventPaymentForm;

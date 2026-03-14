import React, { useState } from 'react';
import { errorHandler, validators, formatters } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ReservationForm = ({ event, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    quantity: 1,
    specialRequests: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getAvailableTickets = () => {
    const reserved = event.reservations?.reduce((sum, res) => sum + res.quantity, 0) || 0;
    return event.capacity - reserved;
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.customerName.trim()) {
      errors.push('Customer name is required');
    }

    if (!validators.isValidEmail(formData.customerEmail)) {
      errors.push('Valid email address is required');
    }

    if (!validators.isValidPhoneNumber(formData.customerPhone)) {
      errors.push('Valid phone number is required');
    }

    if (!formData.quantity || formData.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    const availableTickets = getAvailableTickets();
    if (formData.quantity > availableTickets) {
      errors.push(`Only ${availableTickets} tickets available`);
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const errors = validateForm();
      if (errors.length > 0) {
        errors.forEach(error => toast.error(error));
        return;
      }

      const reservationData = {
        eventId: event.id,
        eventName: event.name,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        ticketPrice: event.price,
        currency: event.currency,
        ...formData,
        quantity: parseInt(formData.quantity),
        totalAmount: event.price * parseInt(formData.quantity),
        status: 'pending',
        createdAt: new Date().toISOString(),
        reservationId: generateReservationId()
      };

      await onSubmit(reservationData);
      toast.success('Reservation created successfully!');
      
    } catch (err) {
      console.error('Reservation creation failed:', err);
      errorHandler.handleApiError(err, 'Reservation creation');
    } finally {
      setIsLoading(false);
    }
  };

  const generateReservationId = () => {
    return 'RES-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  };

  const availableTickets = getAvailableTickets();
  const totalAmount = event.price * parseInt(formData.quantity || 0);

  if (!event) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content reservation-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🎫 Reserve Tickets</h2>
          <button onClick={onCancel} className="close-btn">×</button>
        </div>

        <div className="modal-body">
          <div className="event-summary">
            <h3>📋 Event Summary</h3>
            <div className="event-info">
              <div className="event-title">{event.name}</div>
              <div className="event-details">
                <span>📅 {formatters.formatDate(event.date + 'T' + event.time)}</span>
                <span>📍 {event.location}</span>
                <span>💰 {formatters.formatAmount(event.price, event.currency)} per ticket</span>
                <span>🎫 {availableTickets} tickets available</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
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
              <label htmlFor="customerEmail">Email Address *</label>
              <div className="form-group-floating">
                <input
                  type="email"
                  id="customerEmail"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  required
                  placeholder=" "
                />
                <label htmlFor="customerEmail" className="floating-label">your@email.com</label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="customerPhone">Phone Number *</label>
              <div className="form-group-floating">
                <input
                  type="tel"
                  id="customerPhone"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  required
                  placeholder=" "
                />
                <label htmlFor="customerPhone" className="floating-label">+237677123456</label>
              </div>
            </div>

            <h3>🎫 Ticket Details</h3>

            <div className="form-group">
              <label htmlFor="quantity">Number of Tickets *</label>
              <select
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                required
              >
                {Array.from({ length: Math.min(availableTickets, 10) }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>
                    {num} ticket{num > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              <small className="form-help">
                Maximum {Math.min(availableTickets, 10)} tickets per reservation
              </small>
            </div>

            <div className="total-summary">
              <div className="summary-row">
                <span>Ticket Price:</span>
                <span>{formatters.formatAmount(event.price, event.currency)}</span>
              </div>
              <div className="summary-row">
                <span>Quantity:</span>
                <span>{formData.quantity}</span>
              </div>
              <div className="summary-row total">
                <span>Total Amount:</span>
                <span className="total-amount">
                  {formatters.formatAmount(totalAmount, event.currency)}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="specialRequests">Special Requests (Optional)</label>
              <div className="form-group-floating">
                <textarea
                  id="specialRequests"
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder=" "
                />
                <label htmlFor="specialRequests" className="floating-label">
                  Any special requirements or requests
                </label>
              </div>
            </div>

            <div className="reservation-notice">
              <span>ℹ️</span>
              <div>
                <strong>Important:</strong> After submitting this reservation, you will be redirected 
                to payment. Your tickets will be confirmed once payment is completed.
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="btn btn-primary btn-lg"
            disabled={isLoading || availableTickets === 0}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Creating Reservation...
              </>
            ) : (
              <>
                🎫 Reserve & Pay {formatters.formatAmount(totalAmount, event.currency)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationForm;

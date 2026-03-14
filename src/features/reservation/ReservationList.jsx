import React, { useState, useEffect } from 'react';
import { formatters } from '../../utils/helpers';

const ReservationList = ({ reservations = [], onViewDetails, onCancelReservation, onPayReservation }) => {
  const [filteredReservations, setFilteredReservations] = useState(reservations);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    let filtered = reservations.filter(reservation => {
      if (statusFilter === 'all') return true;
      return reservation.status === statusFilter;
    });

    // Sort reservations
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'event':
          return a.eventName.localeCompare(b.eventName);
        case 'amount':
          return b.totalAmount - a.totalAmount;
        default:
          return 0;
      }
    });

    setFilteredReservations(filtered);
  }, [reservations, statusFilter, sortBy]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      case 'cancelled': return '❌';
      case 'expired': return '⏰';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'success';
      case 'cancelled': return 'danger';
      case 'expired': return 'muted';
      default: return 'muted';
    }
  };

  const canPay = (reservation) => {
    return reservation.status === 'pending' && new Date(reservation.eventDate) > new Date();
  };

  const canCancel = (reservation) => {
    return ['pending', 'confirmed'].includes(reservation.status) && 
           new Date(reservation.eventDate) > new Date();
  };

  if (reservations.length === 0) {
    return (
      <div className="card text-center">
        <h2 className="page-title">🎫 My Reservations</h2>
        <div className="empty-state">
          <span className="empty-icon">🎪</span>
          <h3>No Reservations Yet</h3>
          <p>You haven't made any event reservations yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="list-header">
        <h2 className="page-title">🎫 My Reservations ({filteredReservations.length})</h2>
        
        <div className="filter-controls">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">⏳ Pending Payment</option>
            <option value="confirmed">✅ Confirmed</option>
            <option value="cancelled">❌ Cancelled</option>
            <option value="expired">⏰ Expired</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="date">Sort by Date</option>
            <option value="event">Sort by Event</option>
            <option value="amount">Sort by Amount</option>
          </select>
        </div>
      </div>

      <div className="reservations-list">
        {filteredReservations.map(reservation => (
          <div key={reservation.reservationId} className="reservation-card">
            <div className="reservation-header">
              <div className="reservation-title">
                <h3>{reservation.eventName}</h3>
                <div className={`status-badge ${getStatusColor(reservation.status)}`}>
                  {getStatusIcon(reservation.status)} {reservation.status.toUpperCase()}
                </div>
              </div>
              <div className="reservation-id">
                ID: {reservation.reservationId}
              </div>
            </div>

            <div className="reservation-content">
              <div className="reservation-details">
                <div className="detail-section">
                  <h4>📅 Event Details</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="icon">📅</span>
                      <span>{formatters.formatDate(reservation.eventDate + 'T' + reservation.eventTime)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="icon">📍</span>
                      <span>{reservation.eventLocation}</span>
                    </div>
                    <div className="detail-item">
                      <span className="icon">🎫</span>
                      <span>{reservation.quantity} ticket{reservation.quantity > 1 ? 's' : ''}</span>
                    </div>
                    <div className="detail-item">
                      <span className="icon">💰</span>
                      <span className="amount">
                        {formatters.formatAmount(reservation.totalAmount, reservation.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>👤 Customer Details</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="icon">👤</span>
                      <span>{reservation.customerName}</span>
                    </div>
                    <div className="detail-item">
                      <span className="icon">📧</span>
                      <span>{reservation.customerEmail}</span>
                    </div>
                    <div className="detail-item">
                      <span className="icon">📞</span>
                      <span>{reservation.customerPhone}</span>
                    </div>
                  </div>
                </div>

                {reservation.specialRequests && (
                  <div className="detail-section">
                    <h4>📝 Special Requests</h4>
                    <p className="special-requests">{reservation.specialRequests}</p>
                  </div>
                )}

                <div className="detail-section">
                  <h4>⏰ Timeline</h4>
                  <div className="timeline">
                    <div className="timeline-item">
                      <span className="timeline-icon">🎫</span>
                      <div className="timeline-content">
                        <div className="timeline-title">Reservation Created</div>
                        <div className="timeline-date">
                          {formatters.formatDate(reservation.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    {reservation.paymentId && (
                      <div className="timeline-item">
                        <span className="timeline-icon">💳</span>
                        <div className="timeline-content">
                          <div className="timeline-title">Payment Completed</div>
                          <div className="timeline-date">
                            {formatters.formatDate(reservation.confirmedAt)}
                          </div>
                          <div className="timeline-detail">
                            Payment ID: {reservation.paymentId}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="reservation-actions">
              <button
                onClick={() => onViewDetails(reservation)}
                className="btn btn-secondary btn-sm"
              >
                📋 View Details
              </button>
              
              {canPay(reservation) && (
                <button
                  onClick={() => onPayReservation(reservation)}
                  className="btn btn-primary btn-sm"
                >
                  💳 Pay Now
                </button>
              )}
              
              {canCancel(reservation) && (
                <button
                  onClick={() => onCancelReservation(reservation)}
                  className="btn btn-danger btn-sm"
                >
                  🗑️ Cancel
                </button>
              )}

              {reservation.status === 'confirmed' && (
                <button
                  onClick={() => window.open(`/tickets/${reservation.reservationId}`, '_blank')}
                  className="btn btn-success btn-sm"
                >
                  🎫 View Tickets
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredReservations.length === 0 && reservations.length > 0 && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <h3>No Reservations Match Your Filter</h3>
          <p>Try changing the status filter or search criteria.</p>
        </div>
      )}
    </div>
  );
};

export default ReservationList;

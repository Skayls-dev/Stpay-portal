import React from 'react';
import { formatters } from '../../utils/helpers';

const EventDetails = ({ event, onClose, onReserve, onEdit }) => {
  if (!event) return null;

  const getEventStatus = (event) => {
    const eventDate = new Date(event.date);
    const now = new Date();
    
    if (eventDate < now) return 'past';
    if (eventDate.toDateString() === now.toDateString()) return 'today';
    return 'upcoming';
  };

  const getAvailableTickets = (event) => {
    const reserved = event.reservations?.reduce((sum, res) => sum + res.quantity, 0) || 0;
    return event.capacity - reserved;
  };

  const status = getEventStatus(event);
  const availableTickets = getAvailableTickets(event);
  const soldTickets = event.capacity - availableTickets;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🎪 Event Details</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-body">
          {event.imageUrl && (
            <div className="event-image-large">
              <img src={event.imageUrl} alt={event.name} />
            </div>
          )}

          <div className="event-header">
            <h1 className="event-title">{event.name}</h1>
            <div className={`event-status ${status}`}>
              {status === 'past' && '✅ Event Completed'}
              {status === 'today' && '🔥 Happening Today'}
              {status === 'upcoming' && '📅 Upcoming Event'}
            </div>
          </div>

          {event.description && (
            <div className="event-description">
              <h3>📋 About This Event</h3>
              <p>{event.description}</p>
            </div>
          )}

          <div className="event-info-grid">
            <div className="info-section">
              <h3>📅 Date & Time</h3>
              <div className="info-content">
                <div className="detail-item">
                  <span className="icon">📅</span>
                  <span>{formatters.formatDate(event.date + 'T' + event.time, { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="detail-item">
                  <span className="icon">🕐</span>
                  <span>{event.time}</span>
                </div>
              </div>
            </div>

            <div className="info-section">
              <h3>📍 Location</h3>
              <div className="info-content">
                <div className="detail-item">
                  <span className="icon">📍</span>
                  <span>{event.location}</span>
                </div>
              </div>
            </div>

            <div className="info-section">
              <h3>🎫 Tickets</h3>
              <div className="info-content">
                <div className="detail-item">
                  <span className="icon">💰</span>
                  <span className="price">
                    {formatters.formatAmount(event.price, event.currency)} per ticket
                  </span>
                </div>
                <div className="detail-item">
                  <span className="icon">👥</span>
                  <span>
                    {availableTickets > 0 
                      ? `${availableTickets} tickets available`
                      : 'Sold out'
                    }
                  </span>
                </div>
                <div className="detail-item">
                  <span className="icon">📊</span>
                  <span>{soldTickets} / {event.capacity} tickets sold</span>
                </div>
              </div>
            </div>

            <div className="info-section">
              <h3>👤 Organizer</h3>
              <div className="info-content">
                <div className="detail-item">
                  <span className="icon">👤</span>
                  <span>{event.organizerName}</span>
                </div>
                <div className="detail-item">
                  <span className="icon">📧</span>
                  <span>{event.organizerEmail}</span>
                </div>
                <div className="detail-item">
                  <span className="icon">📞</span>
                  <span>{event.organizerPhone}</span>
                </div>
              </div>
            </div>
          </div>

          {event.category && (
            <div className="event-category">
              <span className="category-tag large">{event.category}</span>
            </div>
          )}

          <div className="capacity-progress">
            <h3>📊 Capacity</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(soldTickets / event.capacity) * 100}%` }}
              ></div>
            </div>
            <div className="progress-text">
              {soldTickets} / {event.capacity} attendees ({Math.round((soldTickets / event.capacity) * 100)}% full)
            </div>
          </div>

          {event.reservations && event.reservations.length > 0 && (
            <div className="recent-reservations">
              <h3>🎫 Recent Reservations</h3>
              <div className="reservations-list">
                {event.reservations.slice(-5).map((reservation, index) => (
                  <div key={index} className="reservation-item">
                    <span className="reservation-name">{reservation.customerName}</span>
                    <span className="reservation-quantity">{reservation.quantity} ticket(s)</span>
                    <span className="reservation-date">
                      {formatters.formatDate(reservation.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          
          {onEdit && (
            <button onClick={() => onEdit(event)} className="btn btn-outline">
              ✏️ Edit Event
            </button>
          )}
          
          {status !== 'past' && availableTickets > 0 && onReserve && (
            <button onClick={() => onReserve(event)} className="btn btn-primary">
              🎫 Reserve Tickets
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;

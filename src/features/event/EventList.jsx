import React, { useState, useEffect } from 'react';
import { formatters } from '../../utils/helpers';

const EventList = ({ events = [], onEdit, onDelete, onViewDetails, onReserve }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filteredEvents, setFilteredEvents] = useState(events);

  useEffect(() => {
    let filtered = events.filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !filterCategory || event.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort events
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.date) - new Date(b.date);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.price - b.price;
        default:
          return 0;
      }
    });

    setFilteredEvents(filtered);
  }, [events, searchTerm, filterCategory, sortBy]);

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

  const eventCategories = [
    { value: '', label: 'All Categories' },
    { value: 'conference', label: 'Conference' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'concert', label: 'Concert' },
    { value: 'sports', label: 'Sports' },
    { value: 'exhibition', label: 'Exhibition' },
    { value: 'networking', label: 'Networking' },
    { value: 'other', label: 'Other' }
  ];

  if (events.length === 0) {
    return (
      <div className="card text-center">
        <h2 className="page-title">🎪 Events</h2>
        <div className="empty-state">
          <span className="empty-icon">📅</span>
          <h3>No Events Found</h3>
          <p>There are no events available at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="list-header">
        <h2 className="page-title">🎪 Events ({filteredEvents.length})</h2>
        
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-controls">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              {eventCategories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
            </select>
          </div>
        </div>
      </div>

      <div className="events-grid">
        {filteredEvents.map(event => {
          const status = getEventStatus(event);
          const availableTickets = getAvailableTickets(event);
          
          return (
            <div key={event.id} className={`event-card ${status}`}>
              {event.imageUrl && (
                <div className="event-image">
                  <img src={event.imageUrl} alt={event.name} />
                </div>
              )}
              
              <div className="event-content">
                <div className="event-header">
                  <h3 className="event-title">{event.name}</h3>
                  <div className={`event-status ${status}`}>
                    {status === 'past' && '✅ Past'}
                    {status === 'today' && '🔥 Today'}
                    {status === 'upcoming' && '📅 Upcoming'}
                  </div>
                </div>

                <div className="event-details">
                  <div className="detail-item">
                    <span className="icon">📅</span>
                    <span>{formatters.formatDate(event.date + 'T' + event.time)}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="icon">📍</span>
                    <span>{event.location}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="icon">💰</span>
                    <span className="price">
                      {formatters.formatAmount(event.price, event.currency)}
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

                  {event.category && (
                    <div className="detail-item">
                      <span className="category-tag">{event.category}</span>
                    </div>
                  )}
                </div>

                {event.description && (
                  <p className="event-description">
                    {formatters.truncate(event.description, 100)}
                  </p>
                )}

                <div className="event-organizer">
                  <small>
                    <span className="icon">👤</span>
                    Organized by {event.organizerName}
                  </small>
                </div>
              </div>

              <div className="event-actions">
                <button
                  onClick={() => onViewDetails(event)}
                  className="btn btn-secondary btn-sm"
                >
                  📋 Details
                </button>
                
                {status !== 'past' && availableTickets > 0 && (
                  <button
                    onClick={() => onReserve(event)}
                    className="btn btn-primary btn-sm"
                  >
                    🎫 Reserve
                  </button>
                )}
                
                {onEdit && (
                  <button
                    onClick={() => onEdit(event)}
                    className="btn btn-outline btn-sm"
                  >
                    ✏️ Edit
                  </button>
                )}
                
                {onDelete && (
                  <button
                    onClick={() => onDelete(event)}
                    className="btn btn-danger btn-sm"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && events.length > 0 && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <h3>No Events Match Your Search</h3>
          <p>Try adjusting your search terms or filters.</p>
        </div>
      )}
    </div>
  );
};

export default EventList;

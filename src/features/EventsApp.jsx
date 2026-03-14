import React, { useState } from 'react';
import EventForm from './event/EventForm';
import EventList from './event/EventList';
import EventDetails from './event/EventDetails';
import ReservationForm from './reservation/ReservationForm';
import ReservationList from './reservation/ReservationList';
import EventPaymentForm from './payment/EventPaymentForm';
import { errorHandler } from '../utils/helpers';
import toast from 'react-hot-toast';

const EventsApp = () => {
  // State management
  const [currentView, setCurrentView] = useState('events');
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Event Management
  const handleCreateEvent = () => {
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleSaveEvent = async (eventData) => {
    try {
      if (editingEvent) {
        // Update existing event
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...eventData, id: editingEvent.id } : e));
        toast.success('Event updated successfully!');
      } else {
        // Create new event
        const newEvent = { ...eventData, id: generateEventId() };
        setEvents(prev => [...prev, newEvent]);
        toast.success('Event created successfully!');
      }
      setShowEventForm(false);
      setEditingEvent(null);
    } catch (error) {
      errorHandler.handleApiError(error, 'Event save');
    }
  };

  const handleDeleteEvent = async (event) => {
    if (window.confirm(`Are you sure you want to delete "${event.name}"?`)) {
      try {
        setEvents(prev => prev.filter(e => e.id !== event.id));
        toast.success('Event deleted successfully!');
      } catch (error) {
        errorHandler.handleApiError(error, 'Event deletion');
      }
    }
  };

  const handleViewEventDetails = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  // Reservation Management
  const handleReserveEvent = (event) => {
    setSelectedEvent(event);
    setShowReservationForm(true);
  };

  const handleSubmitReservation = async (reservationData) => {
    try {
      // Add reservation to state
      setReservations(prev => [...prev, reservationData]);
      
      // Update event with reservation
      setEvents(prev => prev.map(event => 
        event.id === reservationData.eventId 
          ? { 
              ...event, 
              reservations: [...(event.reservations || []), reservationData] 
            }
          : event
      ));

      setShowReservationForm(false);
      
      // Show payment form
      setSelectedReservation(reservationData);
      setShowPaymentForm(true);
      
    } catch (error) {
      errorHandler.handleApiError(error, 'Reservation creation');
    }
  };

  const handlePayReservation = (reservation) => {
    setSelectedReservation(reservation);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = async (updatedReservation, paymentResult) => {
    try {
      // Update reservation status
      setReservations(prev => prev.map(r => 
        r.reservationId === updatedReservation.reservationId ? updatedReservation : r
      ));

      // Update event reservations
      setEvents(prev => prev.map(event => 
        event.id === updatedReservation.eventId 
          ? { 
              ...event, 
              reservations: event.reservations?.map(r => 
                r.reservationId === updatedReservation.reservationId ? updatedReservation : r
              ) || []
            }
          : event
      ));

      setShowPaymentForm(false);
      setSelectedReservation(null);
      
      toast.success('Payment completed successfully! Your tickets are confirmed.');
      
    } catch (error) {
      errorHandler.handleApiError(error, 'Payment confirmation');
    }
  };

  const handleCancelReservation = async (reservation) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      try {
        // Update reservation status
        const cancelledReservation = { ...reservation, status: 'cancelled' };
        setReservations(prev => prev.map(r => 
          r.reservationId === reservation.reservationId ? cancelledReservation : r
        ));

        toast.success('Reservation cancelled successfully!');
        
      } catch (error) {
        errorHandler.handleApiError(error, 'Reservation cancellation');
      }
    }
  };

  // Utility functions
  const generateEventId = () => {
    return 'EVT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  };

  // Navigation
  const navigationItems = [
    { key: 'events', label: '🎪 Events', count: events.length },
    { key: 'reservations', label: '🎫 My Reservations', count: reservations.length },
    { key: 'create', label: '➕ Create Event', action: handleCreateEvent }
  ];

  return (
    <div className="events-app">
      <div className="container">
        <header className="events-header">
          <h1 className="events-title">🎪 ST Events</h1>
          <p className="events-subtitle">Manage events and reservations with ST Pay</p>
        </header>

        <nav className="events-navigation">
          {navigationItems.map(item => (
            <button
              key={item.key}
              onClick={item.action || (() => setCurrentView(item.key))}
              className={`nav-btn ${currentView === item.key ? 'active' : ''}`}
            >
              {item.label}
              {item.count !== undefined && (
                <span className="nav-count">{item.count}</span>
              )}
            </button>
          ))}
        </nav>

        <main className="events-content">
          {currentView === 'events' && (
            <EventList
              events={events}
              onEdit={handleEditEvent}
              onDelete={handleDeleteEvent}
              onViewDetails={handleViewEventDetails}
              onReserve={handleReserveEvent}
            />
          )}

          {currentView === 'reservations' && (
            <ReservationList
              reservations={reservations}
              onViewDetails={(reservation) => {
                // Could show reservation details modal
                console.log('View reservation details:', reservation);
              }}
              onCancelReservation={handleCancelReservation}
              onPayReservation={handlePayReservation}
            />
          )}

          {/* Modals */}
          {showEventForm && (
            <EventForm
              event={editingEvent}
              onSave={handleSaveEvent}
              onCancel={() => {
                setShowEventForm(false);
                setEditingEvent(null);
              }}
            />
          )}

          {showEventDetails && selectedEvent && (
            <EventDetails
              event={selectedEvent}
              onClose={() => {
                setShowEventDetails(false);
                setSelectedEvent(null);
              }}
              onReserve={handleReserveEvent}
              onEdit={handleEditEvent}
            />
          )}

          {showReservationForm && selectedEvent && (
            <ReservationForm
              event={selectedEvent}
              onSubmit={handleSubmitReservation}
              onCancel={() => {
                setShowReservationForm(false);
                setSelectedEvent(null);
              }}
            />
          )}

          {showPaymentForm && selectedReservation && (
            <EventPaymentForm
              reservation={selectedReservation}
              onPaymentSuccess={handlePaymentSuccess}
              onCancel={() => {
                setShowPaymentForm(false);
                setSelectedReservation(null);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default EventsApp;

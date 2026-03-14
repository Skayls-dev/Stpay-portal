import React, { useState } from 'react';
import { errorHandler, validators } from '../../utils/helpers';
import toast from 'react-hot-toast';

const EventForm = ({ event = null, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: event?.name || '',
    description: event?.description || '',
    date: event?.date || '',
    time: event?.time || '',
    location: event?.location || '',
    price: event?.price || '',
    currency: event?.currency || 'XAF',
    capacity: event?.capacity || '',
    category: event?.category || '',
    imageUrl: event?.imageUrl || '',
    organizerName: event?.organizerName || '',
    organizerEmail: event?.organizerEmail || '',
    organizerPhone: event?.organizerPhone || ''
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.name.trim()) {
      errors.push('Event name is required');
    }

    if (!formData.date) {
      errors.push('Event date is required');
    }

    if (!formData.time) {
      errors.push('Event time is required');
    }

    if (!formData.location.trim()) {
      errors.push('Event location is required');
    }

    if (!validators.isValidAmount(formData.price)) {
      errors.push('Valid price is required');
    }

    if (!formData.capacity || formData.capacity <= 0) {
      errors.push('Valid capacity is required');
    }

    if (!formData.organizerName.trim()) {
      errors.push('Organizer name is required');
    }

    if (!validators.isValidEmail(formData.organizerEmail)) {
      errors.push('Valid organizer email is required');
    }

    if (!validators.isValidPhoneNumber(formData.organizerPhone)) {
      errors.push('Valid organizer phone is required');
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

      const eventData = {
        ...formData,
        price: parseFloat(formData.price),
        capacity: parseInt(formData.capacity),
        id: event?.id || null,
        createdAt: event?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSave(eventData);
      toast.success(event ? 'Event updated successfully!' : 'Event created successfully!');
      
    } catch (err) {
      console.error('Event save failed:', err);
      errorHandler.handleApiError(err, 'Event save');
    } finally {
      setIsLoading(false);
    }
  };

  const eventCategories = [
    { value: 'conference', label: 'Conference' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'concert', label: 'Concert' },
    { value: 'sports', label: 'Sports' },
    { value: 'exhibition', label: 'Exhibition' },
    { value: 'networking', label: 'Networking' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="card">
      <h2 className="page-title">
        {event ? '✏️ Edit Event' : '🎉 Create New Event'}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="form-step">
          <h3>📋 Event Information</h3>
          
          <div className="form-group">
            <label htmlFor="name">Event Name *</label>
            <div className="form-group-floating">
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder=" "
              />
              <label htmlFor="name" className="floating-label">Enter event name</label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <div className="form-group-floating">
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                placeholder=" "
              />
              <label htmlFor="description" className="floating-label">Describe your event</label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">Time *</label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location *</label>
            <div className="form-group-floating">
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                placeholder=" "
              />
              <label htmlFor="location" className="floating-label">Event location or venue</label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Ticket Price *</label>
              <div className="amount-input-group">
                <div className="form-group-floating">
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder=" "
                  />
                  <label htmlFor="price" className="floating-label">Price per ticket</label>
                </div>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="currency-select"
                >
                  <option value="XAF">XAF</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="capacity">Capacity *</label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                required
                min="1"
                placeholder="Maximum attendees"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
            >
              <option value="">Select a category</option>
              {eventCategories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="imageUrl">Event Image URL</label>
            <div className="form-group-floating">
              <input
                type="url"
                id="imageUrl"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleInputChange}
                placeholder=" "
              />
              <label htmlFor="imageUrl" className="floating-label">https://example.com/image.jpg</label>
            </div>
          </div>

          <h3>👤 Organizer Information</h3>

          <div className="form-group">
            <label htmlFor="organizerName">Organizer Name *</label>
            <div className="form-group-floating">
              <input
                type="text"
                id="organizerName"
                name="organizerName"
                value={formData.organizerName}
                onChange={handleInputChange}
                required
                placeholder=" "
              />
              <label htmlFor="organizerName" className="floating-label">Enter organizer name</label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="organizerEmail">Organizer Email *</label>
            <div className="form-group-floating">
              <input
                type="email"
                id="organizerEmail"
                name="organizerEmail"
                value={formData.organizerEmail}
                onChange={handleInputChange}
                required
                placeholder=" "
              />
              <label htmlFor="organizerEmail" className="floating-label">organizer@example.com</label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="organizerPhone">Organizer Phone *</label>
            <div className="form-group-floating">
              <input
                type="tel"
                id="organizerPhone"
                name="organizerPhone"
                value={formData.organizerPhone}
                onChange={handleInputChange}
                required
                placeholder=" "
              />
              <label htmlFor="organizerPhone" className="floating-label">+237677123456</label>
            </div>
          </div>

          <div className="form-actions">
            {onCancel && (
              <button 
                type="button" 
                onClick={onCancel}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              className="btn btn-primary btn-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  {event ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {event ? '💾 Update Event' : '🎉 Create Event'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EventForm;

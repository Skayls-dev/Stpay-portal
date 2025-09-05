import React, { useState, useEffect } from 'react';
import { apiClient } from '../api';

const ApiStatus = () => {
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('Checking API connection...');

  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      setStatus('checking');
      setMessage('Checking API connection...');
      
      await apiClient.checkHealth();
      setStatus('online');
      setMessage('API is online and ready');
    } catch (error) {
      setStatus('offline');
      setMessage(`API connection failed: ${error.message}`);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return '🟢';
      case 'offline':
        return '🔴';
      case 'checking':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'online':
        return 'api-status online';
      case 'offline':
        return 'api-status offline';
      case 'checking':
        return 'api-status checking';
      default:
        return 'api-status';
    }
  };

  return (
    <div className={getStatusClass()}>
      <div className="api-status-content">
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-message">{message}</span>
        <button 
          className="btn-small" 
          onClick={checkApiHealth}
          disabled={status === 'checking'}
        >
          {status === 'checking' ? '⏳' : '🔄'} Test
        </button>
      </div>
    </div>
  );
};

export default ApiStatus;

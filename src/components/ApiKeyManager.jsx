import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { keyManagementAPI } from '../api/keyManagement';
import '../styles/ApiKeyManager.css';

export default function ApiKeyManager() {
  const [currentApiKey, setCurrentApiKey] = useState('');
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [keyMode, setKeyMode] = useState('test');

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('stpay_api_key');
    if (savedKey) {
      setCurrentApiKey(savedKey);
      loadActiveKeys(savedKey);
    }
  }, []);

  // Fetch active keys
  const loadActiveKeys = async (key) => {
    try {
      setLoading(true);
      const response = await keyManagementAPI.listKeys(key);
      setApiKeys(response.keys || []);
    } catch (error) {
      toast.error('Failed to load API keys: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate new key
  const handleGenerateKey = async (e) => {
    e.preventDefault();
    if (!currentApiKey) {
      toast.error('Please enter your current API key first');
      return;
    }

    try {
      setLoading(true);
      const response = await keyManagementAPI.generateKey(keyMode === 'test', currentApiKey);
      setGeneratedKey(response.apiKey);
      toast.success(`New ${response.mode} key generated!`);
      
      // Update active keys list
      setTimeout(() => loadActiveKeys(currentApiKey), 500);
      
      setShowGenerateForm(false);
    } catch (error) {
      toast.error('Failed to generate key: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Rotate key
  const handleRotateKey = async () => {
    if (!currentApiKey) {
      toast.error('Please enter your current API key first');
      return;
    }

    const confirmed = window.confirm(
      'This will revoke your current key and generate a new one. Do you want to continue?'
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await keyManagementAPI.rotateKey(currentApiKey, keyMode === 'test');
      setGeneratedKey(response.apiKey);
      setCurrentApiKey(response.apiKey);
      localStorage.setItem('stpay_api_key', response.apiKey);
      toast.success(`Key rotated! New ${response.mode} key generated.`);
      
      // Update active keys list
      setTimeout(() => loadActiveKeys(response.apiKey), 500);
    } catch (error) {
      toast.error('Failed to rotate key: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Revoke key
  const handleRevokeKey = async (keyToRevoke) => {
    const confirmed = window.confirm('Are you sure you want to revoke this key? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setLoading(true);
      await keyManagementAPI.revokeKey(keyToRevoke, currentApiKey);
      toast.success('API key revoked successfully');
      
      // If the revoked key was the current one, clear it
      if (keyToRevoke === currentApiKey) {
        setCurrentApiKey('');
        localStorage.removeItem('stpay_api_key');
      }
      
      // Update active keys list
      loadActiveKeys(currentApiKey);
    } catch (error) {
      toast.error('Failed to revoke key: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Copy key to clipboard
  const copyToClipboard = (key) => {
    navigator.clipboard.writeText(key);
    toast.success('Copied to clipboard!');
  };

  // Save API key to localStorage
  const handleSaveApiKey = () => {
    if (currentApiKey) {
      localStorage.setItem('stpay_api_key', currentApiKey);
      toast.success('API key saved to browser storage');
      loadActiveKeys(currentApiKey);
    }
  };

  const maskKey = (key) => {
    if (!key) return '';
    const parts = key.split('_');
    if (parts.length >= 2) {
      const prefix = parts.slice(0, 2).join('_');
      const suffix = key.slice(-4);
      const middleLength = key.length - prefix.length - suffix.length;
      return `${prefix}_${'*'.repeat(Math.max(0, middleLength))}${suffix}`;
    }
    return `${'*'.repeat(key.length - 4)}${key.slice(-4)}`;
  };

  return (
    <div className="api-key-manager">
      <div className="container">
        <h1>🔑 API Key Management</h1>

        {/* Current API Key Input */}
        <div className="section">
          <h2>Current API Key</h2>
          <div className="input-group">
            <input
              type="password"
              value={currentApiKey}
              onChange={(e) => setCurrentApiKey(e.target.value)}
              placeholder="Enter your API key (sk_test_... or sk_live_...)"
              className="input-field"
            />
            <button onClick={handleSaveApiKey} className="btn btn-primary">
              💾 Save to Browser
            </button>
          </div>
          <p className="info-text">
            ℹ️ Your API key is stored locally in your browser storage for convenience.
          </p>
        </div>

        {/* Active API Keys */}
        {currentApiKey && (
          <div className="section">
            <h2>Active API Keys</h2>
            {loading && <p>Loading keys...</p>}
            {!loading && apiKeys.length === 0 && (
              <p className="empty-state">No active keys found. Generate one below.</p>
            )}
            {apiKeys.length > 0 && (
              <div className="keys-list">
                {apiKeys.map((key, idx) => (
                  <div key={idx} className="key-item">
                    <div className="key-info">
                      <span className={`mode-badge mode-${key.mode}`}>{key.mode.toUpperCase()}</span>
                      <code className="key-display">{maskKey(key.key)}</code>
                    </div>
                    <div className="key-actions">
                      <button
                        onClick={() => copyToClipboard(key.key)}
                        className="btn btn-secondary"
                        title="Copy full key to clipboard"
                      >
                        📋 Copy
                      </button>
                      <button
                        onClick={() => handleRevokeKey(key.key)}
                        className="btn btn-danger"
                        disabled={loading}
                      >
                        🗑️ Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generate New Key */}
        {currentApiKey && (
          <div className="section">
            <h2>Generate New Key</h2>
            {!showGenerateForm && (
              <button
                onClick={() => setShowGenerateForm(true)}
                className="btn btn-success"
                disabled={loading}
              >
                ➕ Generate New Key
              </button>
            )}

            {showGenerateForm && (
              <form onSubmit={handleGenerateKey} className="form">
                <div className="form-group">
                  <label>Key Type</label>
                  <select
                    value={keyMode}
                    onChange={(e) => setKeyMode(e.target.value)}
                    className="input-field"
                  >
                    <option value="test">🧪 Test Mode (sk_test_)</option>
                    <option value="live">🚀 Live Mode (sk_live_)</option>
                  </select>
                  <p className="info-text">
                    {keyMode === 'test'
                      ? 'Test mode keys can only be used with test payment methods.'
                      : 'Live mode keys are for production payments.'}
                  </p>
                </div>
                <div className="button-group">
                  <button type="submit" className="btn btn-success" disabled={loading}>
                    ✅ Generate Key
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGenerateForm(false);
                      setGeneratedKey('');
                    }}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Generated Key Display */}
        {generatedKey && (
          <div className="section success-section">
            <h2>✅ New API Key Generated</h2>
            <div className="generated-key">
              <code className="key-code">{generatedKey}</code>
              <button onClick={() => copyToClipboard(generatedKey)} className="btn btn-primary">
                📋 Copy
              </button>
            </div>
            <p className="warning-text">
              ⚠️ Save this key somewhere safe. You won't be able to see it again.
            </p>
          </div>
        )}

        {/* Key Rotation */}
        {currentApiKey && (
          <div className="section">
            <h2>Rotate Key</h2>
            <p className="info-text">
              Rotating your key will revoke the current one and generate a new one in its place.
            </p>
            <button
              onClick={handleRotateKey}
              className="btn btn-warning"
              disabled={loading}
            >
              🔄 Rotate Key
            </button>
          </div>
        )}

        {/* Key Management Tips */}
        <div className="section tips-section">
          <h2>💡 Best Practices</h2>
          <ul>
            <li>Store your API keys securely. Never commit them to version control.</li>
            <li>Use test keys (sk_test_) for development and testing.</li>
            <li>Use live keys (sk_live_) only in production.</li>
            <li>Rotate your keys regularly for security.</li>
            <li>Revoke keys immediately if you suspect they've been compromised.</li>
            <li>Each request must include the key in the X-Api-Key header.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * API Key Management Service
 * Handles generation, rotation, and revocation of API keys
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface GenerateKeyResponse {
  apiKey: string;
  mode: 'test' | 'live';
  createdAt: string;
}

interface RevokeKeyResponse {
  message: string;
}

interface RotateKeyResponse {
  apiKey: string;
  mode: 'test' | 'live';
  createdAt: string;
}

interface ListKeysResponse {
  keys: Array<{
    key: string;
    mode: 'test' | 'live';
  }>;
}

export const keyManagementAPI = {
  /**
   * Generate a new API key
   */
  async generateKey(isTestMode = true, apiKey: string): Promise<GenerateKeyResponse> {
    const response = await fetch(`${API_BASE_URL}/api/keys/generate?isTestMode=${isTestMode}`, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate API key');
    }

    return response.json();
  },

  /**
   * Revoke an existing API key
   */
  async revokeKey(apiKeyToRevoke: string, currentApiKey: string): Promise<RevokeKeyResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/keys/revoke?apiKey=${encodeURIComponent(apiKeyToRevoke)}`,
      {
        method: 'DELETE',
        headers: {
          'X-Api-Key': currentApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to revoke API key');
    }

    return response.json();
  },

  /**
   * Rotate API key (revoke current, generate new)
   */
  async rotateKey(currentApiKey: string, isTestMode = true): Promise<RotateKeyResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/keys/rotate?currentApiKey=${encodeURIComponent(currentApiKey)}&isTestMode=${isTestMode}`,
      {
        method: 'POST',
        headers: {
          'X-Api-Key': currentApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to rotate API key');
    }

    return response.json();
  },

  /**
   * List active API keys
   */
  async listKeys(apiKey: string): Promise<ListKeysResponse> {
    const response = await fetch(`${API_BASE_URL}/api/keys`, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to list API keys');
    }

    return response.json();
  },
};

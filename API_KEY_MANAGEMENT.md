# API Key Management Frontend

The ST Pay frontend now includes a complete API Key management interface for managing your authentication credentials.

## Features

✅ **Generate API Keys** - Create test and live API keys
✅ **Rotate Keys** - Safely rotate your credentials
✅ **Revoke Keys** - Immediately revoke compromised keys
✅ **List Active Keys** - View all active API keys (masked for security)
✅ **Local Storage** - Save API keys to browser for development
✅ **Copy to Clipboard** - Easy key copying for integration

## Getting Started

### Access the API Key Manager

1. Start the frontend: `npm run dev` in `stpay-frontend/`
2. Start the backend: `dotnet run` in `Stpayment/`
3. Navigate to **🔑 API Keys** in the top navigation menu
4. Or visit: `http://localhost:5173/api-keys`

### Generate Your First API Key

1. You'll need an existing API key to generate new ones (bootstrap key)
2. Enter your bootstrap key in the "Current API Key" field
3. Click **💾 Save to Browser** to store it locally
4. Click **➕ Generate New Key**
5. Select **🧪 Test Mode** or **🚀 Live Mode**
6. Click **✅ Generate Key**
7. **⚠️ Save the key immediately** - you won't see it again

### Using Your API Key

Once you have an API key, include it in all API requests:

```bash
curl -X POST http://localhost:5000/api/Payment \
  -H "X-Api-Key: sk_test_..." \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

Or in JavaScript:

```javascript
const response = await fetch('http://localhost:5000/api/Payment', {
  method: 'POST',
  headers: {
    'X-Api-Key': 'sk_test_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
});
```

## Available Endpoints

### Generate Key
- **Endpoint**: `POST /api/keys/generate`
- **Parameters**: `isTestMode` (boolean, default: true)
- **Response**: 
  ```json
  {
    "apiKey": "sk_test_...",
    "mode": "test",
    "createdAt": "2025-02-24T12:00:00Z"
  }
  ```

### List Keys
- **Endpoint**: `GET /api/keys`
- **Response**: 
  ```json
  {
    "keys": [
      { "key": "sk_test_...", "mode": "test" },
      { "key": "sk_live_...", "mode": "live" }
    ]
  }
  ```

### Revoke Key
- **Endpoint**: `DELETE /api/keys/revoke`
- **Parameters**: `apiKey` (query parameter with key to revoke)
- **Response**: 
  ```json
  { "message": "API key revoked successfully" }
  ```

### Rotate Key
- **Endpoint**: `POST /api/keys/rotate`
- **Parameters**: 
  - `currentApiKey` (query parameter)
  - `isTestMode` (boolean, default: true)
- **Response**: 
  ```json
  {
    "apiKey": "sk_test_...",
    "mode": "test",
    "createdAt": "2025-02-24T12:00:01Z"
  }
  ```

## Key Formats

### Test Keys
- **Prefix**: `sk_test_`
- **Use Case**: Development and testing
- **Example**: `sk_test_aBC123xYz...`

### Live Keys
- **Prefix**: `sk_live_`
- **Use Case**: Production payments
- **Example**: `sk_live_lMn456XyZ...`

## Security Best Practices

🔒 **Do:**
- Store keys securely (use environment variables, secrets management)
- Rotate keys regularly (monthly recommended)
- Use test keys for development
- Revoke keys immediately if compromised
- Include keys only in server-to-server requests

🚫 **Don't:**
- Commit API keys to version control
- Share keys via email or messaging
- Use live keys in development environments
- Expose keys in client-side code
- Use the same key across multiple environments

## Integration with Payment Flow

The API Key Manager integrates seamlessly with the rest of the ST Pay system:

1. **Generate a key** in the API Key Manager
2. **Save it** to browser storage or environment
3. **Use it** in Payment Form, Mobile Simulator, or API Playground
4. **Monitor** key usage in the API Key Manager

All API calls to ST Pay require the `X-Api-Key` header with a valid key.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check that your API key is correct and hasn't been revoked |
| Cannot generate key | Your current API key may be revoked. Use a valid key. |
| Key not saving | Check that browser storage (localStorage) is enabled |
| "API key not persisting" | Clear browser cache and close/reopen the page |

## API Key Service

The frontend uses the `keyManagementAPI` service for all key operations:

```typescript
import { keyManagementAPI } from '@/api/keyManagement';

// Generate
const response = await keyManagementAPI.generateKey(true, currentApiKey);

// List
const keys = await keyManagementAPI.listKeys(currentApiKey);

// Revoke
await keyManagementAPI.revokeKey(keyToRevoke, currentApiKey);

// Rotate
const newKey = await keyManagementAPI.rotateKey(currentApiKey, true);
```

## Related Documentation

- [API Documentation](../stpay-api.json)
- [Backend Implementation](../Stpayment/Documents/ApiKey_Auth_Implementation_Plan.md)
- [Mobile Simulator Guide](./README_MOBILE_SIMULATOR.md)
- [API Playground](./components/ApiPlayground.jsx)

---

**Status**: ✅ Production Ready  
**Last Updated**: February 2025  
**Frontend Version**: 1.0.0

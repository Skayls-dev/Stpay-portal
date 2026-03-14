# 🧪 ST Pay Mock Provider Guide

A comprehensive guide to testing ST Pay payment flows using the built-in Mock Provider, without requiring live mobile money provider credentials (MTN, Orange, Moov, Wave).

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Backend Configuration](#backend-configuration)
4. [Frontend Features](#frontend-features)
5. [Testing Scenarios](#testing-scenarios)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Usage](#advanced-usage)

---

## Overview

The Mock Provider (`MockAdapter.cs`) simulates payment flows without hitting live APIs, making it ideal for:

- **Local development** without external dependencies
- **Testing error scenarios** (approve/decline flows)
- **Demo presentations** with instant payment responses
- **CI/CD pipelines** with deterministic test outputs

### What's Included

| Component | Location | Purpose |
|-----------|----------|---------|
| **MockAdapter** | `Stpayment/Adapters/MockAdapter.cs` | Backend mock payment service |
| **Mobile Simulator** | `stpay-frontend/src/components/MobilePaymentSimulator.jsx` | Frontend UI for simulating mobile payments |
| **API Playground** | `stpay-frontend/src/components/ApiPlayground.jsx` | Endpoint testing interface |
| **Configuration** | `Stpayment/appsettings.Development.json` | Feature flags and settings |

---

## Quick Start

### Option 1: Use Mobile Payment Simulator (Recommended for End-to-End Testing)

1. **Start the application**
   ```bash
   cd stpay-frontend
   npm run dev
   
   # In another terminal:
   cd Stpayment
   dotnet run
   ```

2. **Enable Mock Mode** (one of two ways)
   
   **Via Environment Variable:**
   ```bash
   # .env.development (already pre-configured)
   VITE_MOCK_MODE=true
   VITE_API_KEY=sk_test_local_stpay_2026
   ```
   
   **Via Backend Config:**
   ```json
   // appsettings.Development.json
   "PaymentService": {
     "MockModeEnabled": true,
     "MockProviders": "MTN,ORANGE,MOOV,WAVE"
   }
   ```

3. **Navigate to Mobile Simulator**
   - Open http://localhost:5173
   - Click "📱 Mobile Simulator" in navigation
   - Or click the quick-action card on dashboard

4. **Initiate a Payment**
   - ✅ Enable mock mode checkbox
   - Enter customer details (name, phone, amount)
   - Click "💰 Initiate Payment"
   - System automatically polls status every 5 seconds
   - Payment will succeed after 2-3 polling attempts

### Option 2: Use API Playground (For Quick Endpoint Testing)

1. Navigate to http://localhost:5173/api-playground
2. Enter API key: `sk_test_local_stpay_2026`
3. Select provider: `MOCK`
4. Test individual endpoints:
   - **Test Payment**: POST /api/Payment
   - **Test Status**: GET /api/Payment/{paymentId}
   - **Test Provider Health**: GET /api/Payment/providers/MOCK/health

---

## Backend Configuration

### Setting Up Mock Mode

#### Global Mock Mode (All Payments Use Mock)

```json
// appsettings.Development.json
{
  "PaymentService": {
    "MockModeEnabled": true,
    "MockProviders": "MTN,ORANGE,MOOV,WAVE"
  }
}
```

When `MockModeEnabled: true`, ALL payment requests route to `MockAdapter` regardless of the provider specified.

#### Selective Mock Mode (Specific Providers Use Mock)

```json
{
  "PaymentService": {
    "MockModeEnabled": false,
    "MockProviders": "MTN,MOOV"
  }
}
```

Only payments for "MTN" and "MOOV" use the mock provider. "ORANGE" and "WAVE" would use real adapters.

#### Disable Mock Mode (Production-like)

```json
{
  "PaymentService": {
    "MockModeEnabled": false,
    "MockProviders": ""
  }
}
```

All payments route to appropriate real adapters (requires valid credentials).

### How ProviderFactory Routes Requests

```csharp
// From Stpayment/Services/MissingServices.cs

public IProviderAdapter GetProvider(string providerName)
{
    var mockModeEnabled = _configuration.GetValue<bool>("PaymentService:MockModeEnabled", false);
    var mockProviders = _configuration.GetValue<string>("PaymentService:MockProviders", "");
    
    // Check if mock mode is globally enabled or provider is in mock list
    if (mockModeEnabled || mockProviders.Contains(providerName, StringComparison.OrdinalIgnoreCase))
    {
        return _serviceProvider.GetRequiredService<MockAdapter>();
    }

    // Route to real adapter
    return providerName.ToUpper() switch
    {
        "MTN" => _serviceProvider.GetRequiredService<MtnAdapter>(),
        "MOCK" => _serviceProvider.GetRequiredService<MockAdapter>(),
        _ => throw new NotSupportedException($"Provider {providerName} is not supported")
    };
}
```

---

## Frontend Features

### Mobile Payment Simulator

Located at: `stpay-frontend/src/components/MobilePaymentSimulator.jsx`

#### Features

| Feature | Description |
|---------|-------------|
| **Mock Mode Toggle** | Enable/disable mock provider routing |
| **Payment Initiation** | Input customer name, phone, amount |
| **Auto-Polling** | Automatically checks status every 5 seconds |
| **Real-time Status** | Displays PENDING → SUCCESSFUL/FAILED transitions |
| **Transaction Tracking** | Shows transaction ID and payment details |
| **Manual Checks** | "Check Status" button for on-demand polling |
| **Error Display** | Shows error messages if payment fails |
| **Copy Transaction ID** | Quick copy-to-clipboard for testing |

#### Usage Flow

```
1. Enable Mock Mode ✓
   ↓
2. Enter Payment Details (name, phone, amount)
   ↓
3. Click "Initiate Payment"
   ↓
4. System shows transaction ID
   ↓
5. Auto-polling begins (checks every 5 seconds)
   ↓
6. Status transitions: PENDING → SUCCESSFUL
   ↓
7. Success toast appears with final status
```

#### Payment Polling Behavior

- **First check (T+5s)**: Status = PENDING
- **Second check (T+10s)**: Status = PENDING
- **Third check (T+15s)**: Status = SUCCESSFUL
- **Max attempts**: 12 (1 minute timeout)
- **Auto-stop**: When status is COMPLETED or FAILED

### API Playground

Located at: `stpay-frontend/src/components/ApiPlayground.jsx`

#### Features

- Test all Payment, Webhook, and Provider endpoints
- Real-time JSON response display
- Input fields for paymentId, provider, merchantId, webhookId
- Password-protected API key input (masked as `***{last4chars}`)
- Success/error color-coded results
- Request details panel

---

## Testing Scenarios

### Scenario 1: Happy Path - Successful Payment

**Goal**: Verify successful payment flow from initiation to completion

**Steps**:
1. Open Mobile Simulator
2. Enable mock mode ✓
3. Enter:
   - Name: "Test User"
   - Phone: "237677123456"
   - Amount: "1000"
4. Click "Initiate Payment"
5. Wait for auto-polling to complete
6. Verify: Status shows SUCCESSFUL ✓

**Expected Output**:
```json
{
  "transactionId": "tx_1234567890",
  "status": "SUCCESSFUL",
  "amount": 1000,
  "currency": "XAF",
  "provider": "MOCK",
  "customerName": "Test User"
}
```

### Scenario 2: Immediate Status Check via API Playground

**Goal**: Verify API endpoint connectivity and response structure

**Steps**:
1. Open API Playground
2. Enter API Key: `sk_test_local_stpay_2026`
3. Click "Test Connection"
4. Verify: List of recent payments appears ✓

**Expected Output**:
```json
{
  "data": [
    {
      "id": "..." ,
      "status": "PENDING|SUCCESSFUL|FAILED",
      "amount": 1000,
      ...
    }
  ],
  "status": 200
}
```

### Scenario 3: Test Different Providers

**Goal**: Verify mock routing for different providers

**Steps**:
1. Update `appsettings.Development.json`:
   ```json
   "MockProviders": "MTN,ORANGE"
   ```
2. Restart backend
3. In Mobile Simulator, enable mock mode
4. Create payment with provider "MTN" → routes to MOCK ✓
5. Create payment with provider "MOOV" → routes to real adapter (if configured)

### Scenario 4: Test Health Checks

**Goal**: Verify provider health endpoint

**Steps**:
1. Open API Playground
2. Click "Test Provider Health"
3. Select Provider: "MOCK"
4. Verify: Response shows `"healthy": true` ✓

---

## Troubleshooting

### Issue: "401 Unauthorized" Error

**Cause**: Missing or incorrect API key

**Solution**:
1. Check .env.development: `VITE_API_KEY=sk_test_local_stpay_2026`
2. In API Playground, enter API key: `sk_test_local_stpay_2026`
3. In Mobile Simulator, check configuration has API key set
4. Verify backend `Auth:DevApiKey` matches in appsettings.Development.json

### Issue: Mock Mode Not Enabled

**Cause**: Configuration not applied or cache issue

**Solution**:
1. Verify `appsettings.Development.json`:
   ```json
   "PaymentService": {
     "MockModeEnabled": true
   }
   ```
2. Restart backend: `dotnet run`
3. Check logs for "Using MOCK adapter" message

### Issue: Payment Polling Times Out

**Cause**: Backend not responding or Payment Orchestrator not working

**Solution**:
1. Check backend logs for errors
2. Run "Test Connection" in API Playground first
3. Verify database connection: `test-db-connection.bat`
4. Restart both frontend and backend

### Issue: API Key Not Persisting After Page Refresh

**Cause**: localStorage not enabled or cleared

**Solution**:
1. Verify browser allows localStorage (check DevTools Settings)
2. In API Playground, re-enter the API key
3. The key will auto-save to localStorage
4. On next page load, it will auto-restore

---

## Advanced Usage

### Programmatic Testing with MockAdapter

The MockAdapter provides deterministic responses, making it ideal for automated testing:

```csharp
// Example: Unit test using MockAdapter
[Test]
public async Task ProcessPayment_WithMock_ReturnsSuccessful()
{
    var adapter = new MockAdapter(logger);
    
    var request = new PaymentRequest
    {
        Amount = 1000,
        Currency = "XAF",
        Provider = "MOCK"
    };

    var result = await adapter.InitiatePaymentAsync(request);
    
    Assert.That(result.Status, Is.EqualTo("PENDING"));
    Assert.That(result.ReferenceId, Is.Not.Null);
}
```

### Chaining Multiple Test Payments

**Goal**: Test payment history and filtering

```javascript
// Frontend: Simulate 5 payments in succession
for (let i = 0; i < 5; i++) {
  const request = {
    amount: 1000 + (i * 100),
    currency: 'XAF',
    provider: 'MOCK',
    customer: {
      phoneNumber: '237677123456',
      name: `Test Payment ${i + 1}`
    }
  };
  
  const result = await paymentService.processPayment(request);
  console.log(`Payment ${i + 1} ID:`, result.transactionId);
}
```

### Simulating Mixed Provider Routing

**appsettings.Development.json**:
```json
{
  "PaymentService": {
    "MockModeEnabled": false,
    "MockProviders": "MTN,ORANGE",
    "Providers": {
      "MTN": { "Enabled": true },
      "ORANGE": { "Enabled": false },
      "MOOV": { "Enabled": true }
    }
  }
}
```

**Result**:
- MTN requests → MockAdapter ✓
- ORANGE requests → MockAdapter ✓
- MOOV requests → Real adapter (requires credentials)

---

## Environment Variables Reference

### Frontend (.env.development)

```env
# API Configuration
VITE_API_URL=http://localhost:5169

# Authentication
VITE_API_KEY=sk_test_local_stpay_2026

# Mock Mode
VITE_MOCK_MODE=true
VITE_MOCK_MODE_AUTO_APPROVE=true
```

### Backend (appsettings.Development.json)

```json
{
  "Auth": {
    "DevApiKey": "sk_test_local_stpay_2026"
  },
  "PaymentService": {
    "MockModeEnabled": true,
    "MockProviders": "MTN,ORANGE,MOOV,WAVE"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning"
    }
  }
}
```

---

## Summary

✅ **Mock Provider enables**:
- Zero-dependency local testing
- Deterministic payment flows
- Fast feedback loops
- Production-like testing without credentials
- Automated test scenario validation

✅ **Start testing now**:
1. Enable mock mode in config
2. Open Mobile Simulator: http://localhost:5173/simulator
3. Initiate a payment → Automatic polling → Success in 15 seconds

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review backend logs: `Stpayment/logs/`
3. Open browser DevTools for frontend errors
4. Run health check: Open API Playground → "Test Health"

Happy testing! 🚀

# 🚀 Quick Start Card - Mobile Payment Simulator

**Save time:** Copy-paste commands and quick reference for the new testing features.

---

## ⚡ 60-Second Startup

```bash
# Terminal 1 - Backend
cd Stpayment
dotnet run
# → http://localhost:5169

# Terminal 2 - Frontend  
cd stpay-frontend
npm run dev
# → http://localhost:5173
```

**Then**: Open http://localhost:5173/simulator ✓

---

## 🎯 Test Path (90 seconds)

```
1. Check "🧪 Enable Mock Mode"
   ↓
2. Fill: Name = "Test", Phone = "237677123456", Amount = "1000"
   ↓
3. Click "💰 Initiate Payment"
   ↓
4. Wait 15 seconds (auto-polls every 5 sec)
   ↓
5. Success! See green ✅ SUCCESSFUL badge
```

**Result**: Complete payment flow without any external credentials

---

## 🔑 API Key Reference

```env
# Frontend (.env.development)
VITE_API_KEY=sk_test_local_stpay_2026

# Backend (appsettings.Development.json)
"Auth": {
  "DevApiKey": "sk_test_local_stpay_2026"
}
```

**Use in API Playground**: http://localhost:5173/api-playground

---

## 🎛️ Enable Mock Mode (Pick ONE)

### Option A: Backend Config (Restart Required)
```json
// Stpayment/appsettings.Development.json - CHANGE THIS:
"PaymentService": {
  "MockModeEnabled": true,  // ← Set to true
  "MockProviders": "MTN,ORANGE,MOOV,WAVE"
}

// Then restart: dotnet run
```

### Option B: UI Toggle (Instant)
```
Open Mobile Simulator → Check the "🧪 Enable Mock Mode" box → Done!
```

### Option C: Frontend Env (Restart Required)
```env
# stpay-frontend/.env.development
VITE_MOCK_MODE=true
```

---

## 📍 Navigation Map

| Route | Purpose | Time |
|-------|---------|------|
| `/` | Dashboard with quick-links | 10 sec |
| `/simulator` | **Mobile Payment Simulator** | **2 min** |
| `/api-playground` | Test individual endpoints | 1 min |
| `/process` | Manual payment form | 3 min |
| `/status` | Look up payment status | 30 sec |
| `/payments` | View payment history | 20 sec |

---

## 🧪 Test Scenarios

### Scenario 1: Happy Path (2 minutes)
```javascript
Mock Mode: ON ✓
Amount: 1000 XAF
Provider: Auto-routes to MOCK
Result: ✅ SUCCESSFUL (after 3 polling attempts)
```

### Scenario 2: Check API Response
```
1. Note the Transaction ID from Scenario 1
2. Go to /api-playground
3. Paste Transaction ID
4. Click "Test Status"
5. Inspect JSON response
```

### Scenario 3: Health Check
```
1. Open /api-playground
2. Click "Test Health"
3. See: { "status": "healthy" }
```

### Scenario 4: Provider Health
```
1. Open /api-playground
2. Click "Test Provider Health"
3. Select: MOCK
4. See: { healthy: true }
```

---

## 🔍 Debugging Commands

```bash
# Check backend is running
curl http://localhost:5169/api/Payment/health

# Check frontend is running
curl http://localhost:5173

# View backend logs (if using file logging)
tail -f Stpayment/logs/app-*.log

# Rebuild frontend if having issues
cd stpay-frontend && npm run build

# Rebuild backend if having issues
cd Stpayment && dotnet clean && dotnet build
```

---

## 📊 Response Examples

### Successful Payment (Mock)
```json
{
  "transactionId": "tx_12345678",
  "status": "SUCCESSFUL",
  "amount": 1000,
  "currency": "XAF",
  "provider": "MOCK",
  "customerName": "Test User",
  "customerPhone": "237677123456",
  "timestamp": "2025-01-17T10:30:45.123Z"
}
```

### Pending Payment (Mock)
```json
{
  "transactionId": "tx_12345678",
  "status": "PENDING",
  "amount": 1000,
  "currency": "XAF",
  "message": "Waiting for customer confirmation"
}
```

### Health Check Response
```json
{
  "status": "healthy",
  "environment": "development",
  "database": "connected",
  "timestamp": "2025-01-17T10:30:45.123Z"
}
```

---

## 🚨 Common Issues & Fixes

| Problem | Fix | Time |
|---------|-----|------|
| `401 Unauthorized` | Check API key in config/UI | 30 sec |
| Mock mode not working | Set `MockModeEnabled: true`, restart backend | 1 min |
| Polling stuck on PENDING | Check backend logs, verify DB connection | 2 min |
| API key not saving | Clear browser cache, reload page | 1 min |
| Frontend build fails | `npm install` then `npm run build` | 2 min |
| Backend won't start | Check port 5169 not in use: `netstat -ano \| findstr 5169` | 1 min |

---

## 🛠️ File Locations

```
Project Root/
├── Stpayment/                          (Backend)
│   ├── Adapters/
│   │   └── MockAdapter.cs              ← Mock payment provider
│   ├── Services/MissingServices.cs     ← ProviderFactory routing logic
│   ├── Program.cs                      ← MockAdapter DI registration
│   └── appsettings.Development.json    ← Mock mode config
│
├── stpay-frontend/                     (Frontend)
│   ├── src/
│   │   ├── components/
│   │   │   ├── MobilePaymentSimulator.jsx  ← Main simulator UI
│   │   │   ├── ApiPlayground.jsx           ← Endpoint tester
│   │   │   └── Dashboard.jsx               ← Updated with links
│   │   ├── api/
│   │   │   └── compat-client.ts            ← API client with localStorage
│   │   └── App.jsx                         ← New routes
│   ├── .env.development                ← API key & mock mode config
│   └── package.json
│
├── MOCK_PROVIDER_GUIDE.md              ← Full documentation
├── TESTING_INFRASTRUCTURE_UPDATE.md    ← Detailed feature guide
└── QUICK_START.md                      ← This file
```

---

## 🎓 Learning Path

**For first-time users:**

1. **Day 1 - Understanding** (30 min)
   - Read: MOCK_PROVIDER_GUIDE.md
   - Watch: Test scenario workflow above

2. **Day 2 - Hands-on** (30 min)
   - Follow: 60-second startup
   - Complete: Test Path (90 sec)
   - Verify: All 4 test scenarios

3. **Day 3 - Integration** (1 hour)
   - Read: TESTING_INFRASTRUCTURE_UPDATE.md
   - Integrate: Simulator into your test suite
   - Document: Custom test scenarios

---

## 💡 Pro Tips

### Tip 1: Copy Transaction ID
- After initiating payment, click "📋 Copy Transaction ID"
- Paste into API Playground to verify response

### Tip 2: Multiple Payments
- Each payment creates unique transaction ID
- Check `/payments` to see all created payments
- Useful for testing pagination

### Tip 3: Monitor Logs
- Backend logs to console → check for "MOCK adapter" prefix
- Frontend logs to DevTools → check Network tab for requests

### Tip 4: API Key Persistence
- API key auto-saves after 500ms to localStorage
- Survives page refresh and browser restart
- Click "📋 Copy" button to reuse in other tabs

---

## 📞 Quick Support

| Question | Answer |
|----------|--------|
| **Where do I start?** | http://localhost:5173/simulator |
| **How do I enable mocking?** | Check "🧪 Enable Mock Mode" or set config |
| **Does it work offline?** | Yes! No external dependencies needed |
| **Can I test real MTN?** | Yes, set `MockModeEnabled: false` with real credentials |
| **How long does a payment take?** | ~15 seconds (5-sec polling × 3 attempts) |

---

## 🔗 Related Documentation

- **Full Guide**: MOCK_PROVIDER_GUIDE.md
- **Features Overview**: TESTING_INFRASTRUCTURE_UPDATE.md
- **API Docs**: Stpayment/Documents/
- **Postman Collection**: Stpayment/Documents/ST_Payment_API_Fixed.postman_collection.json

---

## ✅ Confidence Checklist

Before considering setup complete:

- [ ] Backend runs: `dotnet run` → http://localhost:5169/api/Payment/health returns OK
- [ ] Frontend runs: `npm run dev` → http://localhost:5173 loads
- [ ] Mobile Simulator accessible: http://localhost:5173/simulator loads
- [ ] Mock mode enabled: Dashboard shows 🧪 indicator
- [ ] Payment initiated: Transaction ID generated and shown
- [ ] Polling working: Status auto-updates every 5 seconds
- [ ] Final status: Shows ✅ SUCCESSFUL after ~15 seconds
- [ ] API Playground accessible: http://localhost:5173/api-playground loads
- [ ] API key persisted: Reload page, key still set

**All checked?** You're ready to test! 🚀

---

**Version**: 1.0
**Last Updated**: January 2025
**Setup Time**: ~10 minutes
**First Test Time**: ~3 minutes

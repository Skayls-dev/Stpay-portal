# ST Pay Frontend

A React.js frontend application for the ST Pay payment gateway microservice.

## Features

- **Process Payments**: Submit payment requests through a user-friendly form
- **Check Payment Status**: Look up payment status using transaction IDs
- **Payment History**: View list of processed payments (requires backend implementation)
- **Provider Support**: Support for MTN, Orange, Moov, and Wave payment providers
- **Responsive Design**: Mobile-friendly interface
- **Real-time Feedback**: Toast notifications for user actions

## Week 2 - Delivery Status

Week 2 planning is now documented and executable with dedicated guides:

- Mobile frequent errors guide: [MOBILE_INTEGRATION_ERRORS.md](MOBILE_INTEGRATION_ERRORS.md)
- SDK stable publication checklist (Web + React Native): [SDK_RELEASE_CHECKLIST.md](SDK_RELEASE_CHECKLIST.md)
- SDK implementation guide: [SDK_README.md](SDK_README.md)

## Week 3 - Starter Apps

Starter templates are now available for fast integration:

- Global starter index: [starters/README.md](starters/README.md)
- Web starter: [starters/web-js-starter/index.html](starters/web-js-starter/index.html)
- React Native starter: [starters/react-native-starter/App.js](starters/react-native-starter/App.js)
- Flutter starter: [starters/flutter-starter/lib/main.dart](starters/flutter-starter/lib/main.dart)

These starters are designed for a first successful payment flow:

1. Configure base URL and API key.
2. Call `POST /api/Payment`.
3. Use `transactionId` for status follow-up.

## Tech Stack

- **React 18** - Frontend framework
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **React Hook Form** - Form handling and validation
- **Axios** - HTTP client for API calls
- **React Hot Toast** - Toast notifications

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- ST Pay API running on `http://localhost:5169`

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Integration

The frontend communicates with the ST Pay API through the following endpoints:

- `POST /api/payment` - Process new payment
- `GET /api/payment/{id}` - Get payment status
- `DELETE /api/payment/{id}` - Cancel payment
- `GET /api/payment` - Get all payments (to be implemented)

### API Service

The `src/services/api.js` file contains all API interaction logic:

```javascript
import { paymentService } from './services/api';

// Process payment
const result = await paymentService.processPayment(paymentData);

// Get payment status
const status = await paymentService.getPaymentStatus(paymentId);

// Cancel payment
await paymentService.cancelPayment(paymentId);
```

## Configuration

### Environment Variables

Create `.env.development` or `.env.production` files:

```env
VITE_API_URL=http://localhost:5169
VITE_APP_NAME=ST Pay Gateway
VITE_APP_VERSION=1.0.0
```

### Proxy Configuration

Vite is configured to proxy API requests to the backend in `vite.config.js`:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5169',
      changeOrigin: true,
      secure: false,
    }
  }
}
```

## Components

### PaymentForm
- Form for processing new payments
- Input validation using React Hook Form
- Support for all payment providers
- Customer and merchant information capture

### PaymentStatus
- Look up payment status by transaction ID
- Display detailed payment information
- Cancel pending payments
- Real-time status updates

### PaymentList
- Display payment history (demo data for now)
- Requires backend implementation of GET /api/payment
- Refresh functionality
- View payment details

## Payment Providers

The application supports the following payment providers:

- **MTN** - MTN Mobile Money
- **ORANGE** - Orange Money
- **MOOV** - Moov Money
- **WAVE** - Wave

## Form Validation

Form validation is handled by React Hook Form with the following rules:

- **Amount**: Required, must be greater than 0
- **Currency**: Required, defaults to XOF
- **Provider**: Required, must be one of supported providers
- **Customer Info**: Name, email, and phone are required
- **Merchant Info**: Name and ID are required

## Error Handling

The application includes comprehensive error handling:

- API errors are caught and displayed as toast notifications
- Form validation errors are shown inline
- Network errors are handled gracefully
- 404 errors for payment not found scenarios

## Styling

The application uses custom CSS with:

- Responsive grid layouts
- Status-based color coding
- Mobile-first design approach
- Consistent spacing and typography

## Deployment

### Build for Production

```bash
npm run build
```

The build files will be in the `dist` directory.

### Deploy to Web Server

Copy the contents of the `dist` directory to your web server. Make sure to:

1. Configure the web server to serve the `index.html` file for all routes (SPA routing)
2. Set the correct `VITE_API_URL` in production environment
3. Ensure CORS is properly configured on the backend API

## Backend Integration Notes

To fully integrate with the ST Pay API, ensure:

1. **CORS Configuration**: The API should allow requests from the frontend origin
2. **Content-Type Headers**: API should accept `application/json`
3. **Error Response Format**: Consistent error response structure
4. **Authentication**: If required, implement API key or JWT authentication

### Recommended Backend Endpoint Addition

Add this endpoint to your PaymentController for payment history:

```csharp
[HttpGet]
public async Task<IActionResult> GetAllPayments()
{
    try
    {
        var payments = await _paymentOrchestrator.GetAllPaymentsAsync();
        return Ok(payments);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error retrieving payments");
        return StatusCode(500, new { Error = "Internal server error" });
    }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the ST Pay payment gateway system.

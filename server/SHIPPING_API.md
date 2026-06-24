# Shipping Service Integration with Guba Syria API

This document describes the integration of the Sham Shop shipping service with the Guba Syria (شركة الفاتح للشحن) API.

## Overview

The shipping service provides a unified interface for:
- Creating shipping orders
- Checking order status
- Getting pricing estimates
- Retrieving available cities
- Health checks

## Configuration

### Environment Variables

Set the following environment variables in your `.env` file:

```bash
# Guba Syria API Configuration
GUBA_API_BASE_URL=https://guba-sy.com/api
GUBA_API_TOKEN=your_api_token_here

# Optional Configuration
GUBA_API_TIMEOUT=30000
GUBA_API_RETRY_ATTEMPTS=3
GUBA_API_RETRY_DELAY=1000

# Service Configuration
SHIPPING_FALLBACK_TO_MOCK=true
SHIPPING_LOG_LEVEL=info
SHIPPING_ENABLE_CACHE=true
SHIPPING_CACHE_TTL=300000
```

### Configuration Validation

The service automatically validates configuration on startup:

```typescript
import { ShippingService } from './lib/shippingService';

// Check if configuration is valid
const isValid = ShippingService.validateConfig();

// Get detailed configuration status
const status = ShippingService.getConfigStatus();
console.log(status);
```

## API Endpoints

### 1. Health Check (Ping)

```typescript
const response = await ShippingService.ping();
```

**Response:**
```json
{
  "success": true,
  "message": "Shipping API is active",
  "store": {
    "id": 1,
    "name": "Guba Syria",
    "email": "info@guba-sy.com"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 2. Create Shipping Order

```typescript
const orderData: CreateOrderRequest = {
  source: "Damascus",
  destination: "Aleppo",
  sender_name: "John Doe",
  sender_phone: "+963-11-123-4567",
  sender_address: "123 Main St, Damascus",
  receiver_name: "Jane Smith",
  receiver_phone: "+963-21-987-6543",
  receiver_address: "456 Oak Ave, Aleppo",
  products_count: 2,
  weight_class: "medium",
  pickup_date: "2024-01-15",
  products: [
    { name: "Product 1", price: 50, quantity: 1 },
    { name: "Product 2", price: 75, quantity: 1 }
  ]
};

const response = await ShippingService.createOrder(orderData);
```

**Response:**
```json
{
  "success": true,
  "message": "Shipping order created successfully",
  "data": {
    "order_code": "GUBA-20240101-ABC123",
    "status": "pending",
    "estimated_price": 45.50,
    "pickup_date": "2024-01-15",
    "created_at": "2024-01-01T10:00:00.000Z"
  }
}
```

### 3. Check Order Status

```typescript
const orderCode = "GUBA-20240101-ABC123";
const status = await ShippingService.getOrderStatus(orderCode);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_code": "GUBA-20240101-ABC123",
    "status": "in_transit",
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-02T14:30:00.000Z",
    "details": {
      "sender_name": "John Doe",
      "receiver_name": "Jane Smith",
      "weight_class": "medium",
      "products_count": 2,
      "pickup_date": "2024-01-15"
    }
  }
}
```

### 4. Get Pricing Estimate

```typescript
const pricingData: PricingRequest = {
  source: "Damascus",
  destination: "Aleppo",
  weight_class: "medium"
};

const pricing = await ShippingService.getPricing(pricingData);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "source": "Damascus",
    "destination": "Aleppo",
    "weight_class": "medium",
    "estimated_price": 45.50,
    "currency": "USD",
    "calculation_date": "2024-01-01T10:00:00.000Z"
  }
}
```

### 5. Get Available Cities

```typescript
const cities = await ShippingService.getCities();
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Damascus",
      "code": 1001,
      "category": "major"
    },
    {
      "id": 2,
      "name": "Aleppo",
      "code": 1002,
      "category": "major"
    }
  ]
}
```

## Weight Classes

The service supports the following weight classes:

- **light**: 0-1 kg
- **medium**: 1-5 kg
- **heavy**: 5-20 kg
- **extra_heavy**: 20-100 kg

## Order Statuses

Supported order statuses:

- `pending` - Order created, awaiting confirmation
- `confirmed` - Order confirmed by shipping company
- `in_transit` - Package is being transported
- `delivered` - Package delivered successfully
- `cancelled` - Order cancelled
- `returned` - Package returned to sender

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  const response = await ShippingService.createOrder(orderData);
} catch (error) {
  if (error instanceof ShippingServiceError) {
    console.error(`Shipping error: ${error.message}`);
    console.error(`Status code: ${error.statusCode}`);
    console.error(`API error details:`, error.apiError);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Error Types

- **Configuration errors**: Missing API token, invalid base URL
- **API errors**: HTTP errors from Guba Syria API
- **Network errors**: Connection timeouts, network failures
- **Validation errors**: Invalid weight class, missing required fields

## Retry Logic

The service automatically retries failed requests:

- **Server errors (5xx)**: Retry up to 3 times with exponential backoff
- **Network errors**: Retry up to 3 times with exponential backoff
- **Client errors (4xx)**: No retry (user error)

## Fallback Mode

When the API is unavailable, the service can fall back to mock responses:

```bash
SHIPPING_FALLBACK_TO_MOCK=true
```

This ensures your application continues to function even when the shipping API is down.

## Rate Limiting

The service respects rate limits and includes:
- Request timeout (30 seconds default)
- Exponential backoff for retries
- User-Agent identification

## Security

- API tokens are stored in environment variables
- All requests use HTTPS
- Bearer token authentication
- Input validation and sanitization

## Monitoring

Monitor the service health:

```typescript
// Check configuration status
const status = ShippingService.getConfigStatus();

// Health check
const health = await ShippingService.ping();

// Get available weight classes
const weightClasses = ShippingService.getWeightClasses();
```

## Troubleshooting

### Common Issues

1. **"Guba API token not configured"**
   - Set `GUBA_API_TOKEN` environment variable

2. **"API request timeout"**
   - Increase `GUBA_API_TIMEOUT` value
   - Check network connectivity

3. **"Invalid weight class"**
   - Use one of: `light`, `medium`, `heavy`, `extra_heavy`

4. **"API request failed: 401"**
   - Check API token validity
   - Verify token permissions

### Debug Mode

Enable debug logging:

```bash
SHIPPING_LOG_LEVEL=debug
```

## Support

For issues with the Guba Syria API:
- Contact: [Guba Syria Support](https://guba-sy.com)
- API Documentation: [Guba Syria API Docs](https://guba-sy.com/api/docs)

For issues with this integration:
- Check the configuration
- Review error logs
- Verify network connectivity
- Test with fallback mode enabled 
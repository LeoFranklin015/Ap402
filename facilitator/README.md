# x402 Aptos Facilitator

A middleware service for the x402 protocol on Aptos blockchain that handles payment verification and transaction submission.

## What the Facilitator Does

The **Facilitator** is the third service in the x402 protocol that:

1. **Receives signed transactions** from clients via the server
2. **Submits transactions to the Aptos blockchain**
3. **Verifies transactions are successful**
4. **Notifies the server** to proceed with resource access

## Features

- **Mock Mode**: For testing - always returns successful verification
- **Express Middleware**: Easy integration with Express.js servers
- **Aptos Integration**: Built on Aptos TypeScript SDK
- **Route-based Pricing**: Define different prices for different endpoints
- **Transaction Verification**: Verifies blockchain transactions

## Installation

```bash
cd facilitator
npm install
```

## Quick Start

### 1. Basic Server Setup

```typescript
import express from 'express';
import { paymentMiddleware } from './src';

const app = express();

// Define payment routes
const paymentRoutes = {
  "GET /weather": {
    price: "1000000", // 0.01 APT in octas
    network: "aptos-testnet"
  },
  "/premium/*": {
    price: {
      amount: "10000000", // 0.1 APT
      asset: {
        address: "0x1::aptos_coin::AptosCoin",
        decimals: 8
      }
    },
    network: "aptos-testnet"
  }
};

// Apply middleware
app.use(paymentMiddleware(
  "0x1234567890abcdef1234567890abcdef12345678", // Payment address
  paymentRoutes,
  { url: "http://localhost:3001" }
));

// Your routes
app.get("/weather", (req, res) => {
  res.send({ weather: "sunny" });
});
```

### 2. Run Example Server

```bash
npm run dev
```

The server will start on `http://localhost:4021` with mock payment verification enabled.

## API Reference

### PaymentMiddleware

#### Constructor
```typescript
paymentMiddleware(
  payTo: string,           // Payment recipient address
  routes: PaymentRoutes,   // Route pricing configuration
  options: PaymentOptions  // Facilitator options
)
```

#### PaymentRoutes
```typescript
interface PaymentRoutes {
  [path: string]: {
    price: string | {
      amount: string;
      asset: {
        address: string;
        decimals: number;
      };
    };
    network: 'aptos-mainnet' | 'aptos-testnet' | 'aptos-devnet';
  };
}
```

### AptosFacilitator

#### Methods

##### `processPayment(paymentRequest: PaymentRequest): Promise<PaymentVerification>`
Process a payment request and return verification result.

##### `isTransactionConfirmed(transactionHash: string): Promise<boolean>`
Check if a transaction is confirmed on the blockchain.

##### `getTransactionDetails(transactionHash: string): Promise<any>`
Get detailed transaction information.

## Configuration

### Environment Variables

```bash
# Required
FACILITATOR_URL=http://localhost:3001
ADDRESS=0x1234567890abcdef1234567890abcdef12345678

# Optional
PORT=4021
APTOS_NETWORK=testnet
```

### Mock Mode

The facilitator runs in mock mode by default for testing. In mock mode:
- All payment verifications return `true`
- Mock transaction hashes are generated
- No actual blockchain transactions are submitted

To disable mock mode, set `mockMode: false` in the facilitator config.

## How It Works

### 1. Client Request
Client makes HTTP request to server.

### 2. Payment Required (402)
If route requires payment, server responds with 402 and payment details.

### 3. Client Payment
Client creates and signs Aptos transaction, sends in `X-Payment` header.

### 4. Facilitator Processing
- Server forwards payment to facilitator
- Facilitator verifies signature
- Facilitator submits transaction to Aptos blockchain
- Facilitator confirms transaction success

### 5. Resource Access
If payment is verified, server grants access to requested resource.

## Example Usage

### Testing with curl

```bash
# First request - will get 402
curl http://localhost:4021/weather

# Response:
# {
#   "payment": {
#     "amount": "1000000",
#     "token": "0x1::aptos_coin::AptosCoin",
#     "recipient": "0x1234...",
#     "deadline": 1234567890
#   },
#   "message": "Payment required to access this resource"
# }

# Second request with payment (mock)
curl -H "X-Payment: {\"transaction\":\"...\",\"signature\":\"...\",\"address\":\"0x...\"}" \
     http://localhost:4021/weather

# Response:
# {
#   "report": {
#     "weather": "sunny",
#     "temperature": 70
#   },
#   "payment": {
#     "transactionHash": "0x...",
#     "verified": true
#   }
# }
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run example server
npm run dev src/example-server.ts
```

## Production Notes

- **Security**: Implement proper signature verification
- **Error Handling**: Add comprehensive error handling
- **Monitoring**: Add logging and monitoring
- **Rate Limiting**: Implement rate limiting for payment endpoints
- **Database**: Store transaction records for audit

## License

MIT


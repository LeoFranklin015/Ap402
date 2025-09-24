# @x402/aptos-facilitator

A TypeScript SDK for implementing x402 payment protocol on Aptos blockchain. This SDK provides easy-to-use middleware and utilities for handling payment verification in your Express.js applications.

## Features

- 🔐 **Payment Verification**: Verify Aptos blockchain transactions
- 🛡️ **Express Middleware**: Drop-in middleware for Express.js applications
- 🌐 **Multi-Network Support**: Works with Aptos mainnet, testnet, and devnet
- 📦 **TypeScript Support**: Full TypeScript definitions included
- 🧪 **Mock Mode**: Built-in testing mode for development
- ⚡ **Easy Integration**: Simple API for quick setup

## Installation

```bash
npm install @x402/aptos-facilitator
# or
yarn add @x402/aptos-facilitator
```

## Quick Start

### Basic Setup

```typescript
import express from 'express';
import { AptosFacilitator, paymentMiddleware } from '@x402/aptos-facilitator';

const app = express();

// Configure payment routes
const paymentRoutes = {
  '/premium-content': {
    price: '1000000', // 1 APT (in micro-APT)
    network: 'aptos-testnet'
  },
  '/api/data': {
    price: '500000', // 0.5 APT
    network: 'aptos-testnet'
  }
};

// Add payment middleware
app.use(paymentMiddleware(
  '0x123...', // Your Aptos address to receive payments
  paymentRoutes,
  { url: 'https://your-server.com' }
));

// Your protected routes
app.get('/premium-content', (req, res) => {
  res.json({ 
    message: 'This content requires payment!',
    transactionHash: req.transactionHash 
  });
});

app.listen(3000);
```

### Using the Facilitator Directly

```typescript
import { AptosFacilitator } from '@x402/aptos-facilitator';

const facilitator = new AptosFacilitator({
  aptosNetwork: 'testnet',
  port: 3000,
  mockMode: true // Set to false for production
});

// Process a payment
const paymentRequest = {
  transaction: '...', // Serialized transaction
  signature: '...',   // Transaction signature
  publicKey: '...',   // Public key
  address: '...',     // Sender address
  timestamp: Date.now()
};

const verification = await facilitator.processPayment(paymentRequest);

if (verification.isValid) {
  console.log('Payment verified!', verification.transactionHash);
} else {
  console.log('Payment failed:', verification.error);
}
```

## API Reference

### AptosFacilitator

The main class for handling payment verification.

#### Constructor

```typescript
new AptosFacilitator(config: FacilitatorConfig)
```

#### Configuration

```typescript
interface FacilitatorConfig {
  aptosNetwork: 'mainnet' | 'testnet' | 'devnet';
  port: number;
  mockMode?: boolean; // For testing - always returns true
}
```

#### Methods

- `processPayment(paymentRequest: PaymentRequest): Promise<PaymentVerification>`
- `isTransactionConfirmed(transactionHash: string): Promise<boolean>`
- `getTransactionDetails(transactionHash: string): Promise<any>`

### Payment Middleware

Express middleware for handling x402 payments.

```typescript
paymentMiddleware(
  payTo: string,           // Address to receive payments
  routes: PaymentRoutes,   // Route configuration
  options: PaymentMiddlewareOptions
)
```

#### Route Configuration

```typescript
interface PaymentRoutes {
  [path: string]: PaymentRoute;
}

interface PaymentRoute {
  price: string | {
    amount: string;
    asset: {
      address: string;
      decimals: number;
    };
  };
  network: 'aptos-mainnet' | 'aptos-testnet' | 'aptos-devnet';
}
```

## Examples

### Advanced Route Configuration

```typescript
const paymentRoutes = {
  // Simple price
  '/basic': {
    price: '1000000',
    network: 'aptos-testnet'
  },
  
  // Custom asset
  '/premium': {
    price: {
      amount: '1000000',
      asset: {
        address: '0x1::aptos_coin::AptosCoin',
        decimals: 8
      }
    },
    network: 'aptos-mainnet'
  },
  
  // Wildcard routes
  '/api/*': {
    price: '500000',
    network: 'aptos-testnet'
  }
};
```

### Custom Payment Handler

```typescript
import { AptosFacilitator } from '@x402/aptos-facilitator';

const facilitator = new AptosFacilitator({
  aptosNetwork: 'mainnet',
  port: 3000,
  mockMode: false
});

app.post('/custom-payment', async (req, res) => {
  const { paymentData } = req.body;
  
  const verification = await facilitator.processPayment(paymentData);
  
  if (verification.isValid) {
    // Check if transaction is confirmed
    const isConfirmed = await facilitator.isTransactionConfirmed(
      verification.transactionHash!
    );
    
    if (isConfirmed) {
      res.json({ success: true, transactionHash: verification.transactionHash });
    } else {
      res.status(402).json({ error: 'Transaction not yet confirmed' });
    }
  } else {
    res.status(402).json({ error: verification.error });
  }
});
```

## Development

### Building the SDK

```bash
npm run build
```

### Running Tests

```bash
npm run dev
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For support, please open an issue on GitHub or contact the x402 Protocol team.
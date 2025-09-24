/**
 * Example Express server using x402 payment middleware
 */

import express from 'express';
import cors from 'cors';
import { paymentMiddleware, PaymentRoutes } from './index';

// Environment variables
const facilitatorUrl = process.env.FACILITATOR_URL || 'http://localhost:3001';
const payTo = process.env.ADDRESS || '0x1234567890abcdef1234567890abcdef12345678';

if (!facilitatorUrl || !payTo) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Define payment routes
const paymentRoutes: PaymentRoutes = {
  "GET /weather": {
    // APT amount in octas (1 APT = 100,000,000 octas)
    price: "1000000", // 0.01 APT
    network: "aptos-testnet"
  },
  "/premium/*": {
    // Define atomic amounts in APT
    price: {
      amount: "10000000", // 0.1 APT
      asset: {
        address: "0x1::aptos_coin::AptosCoin",
        decimals: 8
      }
    },
    network: "aptos-testnet"
  },
  "POST /api/process": {
    price: "5000000", // 0.05 APT
    network: "aptos-testnet"
  }
};

// Apply payment middleware
app.use(
  paymentMiddleware(
    payTo,
    paymentRoutes,
    {
      url: facilitatorUrl,
    }
  )
);

// Routes
app.get("/weather", (req, res) => {
  res.send({
    report: {
      weather: "sunny",
      temperature: 70,
      location: "San Francisco"
    },
    payment: {
      transactionHash: (req as any).transactionHash,
      verified: true
    }
  });
});

app.get("/premium/content", (req, res) => {
  res.send({
    content: "This is premium content that requires payment",
    features: ["exclusive", "high-quality", "ad-free"],
    payment: {
      transactionHash: (req as any).transactionHash,
      verified: true
    }
  });
});

app.get("/premium/data", (req, res) => {
  res.send({
    data: "Premium data analysis results",
    insights: ["trending up", "high confidence"],
    payment: {
      transactionHash: (req as any).transactionHash,
      verified: true
    }
  });
});

app.post("/api/process", (req, res) => {
  res.send({
    result: "Data processed successfully",
    input: req.body,
    payment: {
      transactionHash: (req as any).transactionHash,
      verified: true
    }
  });
});

// Free route (no payment required)
app.get("/free", (req, res) => {
  res.send({
    message: "This is a free endpoint - no payment required!",
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get("/health", (req, res) => {
  res.send({
    status: "healthy",
    service: "x402-aptos-server",
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

const PORT = process.env.PORT || 4021;

app.listen(PORT, () => {
  console.log(`🚀 x402 Aptos Server running on http://localhost:${PORT}`);
  console.log(`💰 Payment address: ${payTo}`);
  console.log(`🔧 Facilitator URL: ${facilitatorUrl}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /weather          - Weather data (0.01 APT)`);
  console.log(`   GET  /premium/*        - Premium content (0.1 APT)`);
  console.log(`   POST /api/process      - Process data (0.05 APT)`);
  console.log(`   GET  /free             - Free content (no payment)`);
  console.log(`   GET  /health           - Health check`);
  console.log(`\n🔧 Mock mode enabled - all payments will be verified as successful`);
});

export default app;


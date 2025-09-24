/**
 * Test server for x402 protocol demonstration
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { x402Middleware, ServerConfig, PaymentRoutes } from './index';

// Configuration
const config: ServerConfig = {
  port: 4021,
  facilitatorUrl: process.env.FACILITATOR_URL || 'http://localhost:3001',
  paymentAddress: process.env.PAYMENT_ADDRESS || '0xbcfb4a60c030cb5dcab8adc7d723fcc6f2bbfa432f595ae8eb1bdc436b928cbd', // Your real Aptos address
  mockMode: false // REAL MODE - no mocking
};

// Define payment routes
const paymentRoutes: PaymentRoutes = {
  "GET /weather": {
    price: "1000000", // 0.01 APT in octas
    description: "Weather data"
  },
  "GET /premium/*": {
    price: "10000000", // 0.1 APT in octas
    description: "Premium content"
  },
  "POST /api/process": {
    price: "5000000", // 0.05 APT in octas
    description: "Data processing"
  },
  "GET /data/analytics": {
    price: {
      amount: "2000000", // 0.02 APT
      asset: {
        address: "0x1::aptos_coin::AptosCoin",
        decimals: 8
      }
    },
    description: "Analytics data"
  },
  "GET /video": {
    price: "5000000", // 0.05 APT in octas
    description: "Premium video content"
  }
};

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Apply x402 payment middleware
app.use(x402Middleware(config, paymentRoutes));

// Routes
app.get("/weather", (req, res) => {
  res.json({
    report: {
      weather: "sunny",
      temperature: 72,
      humidity: 45,
      location: "San Francisco, CA"
    },
    payment: {
      transactionHash: (req as any).transactionHash,
      verified: true,
      timestamp: new Date().toISOString()
    }
  });
});

app.get("/premium/content", (req, res) => {
  res.json({
    content: "This is premium content that requires payment",
    features: [
      "Exclusive access",
      "High-quality data",
      "Ad-free experience",
      "Real-time updates"
    ],
    payment: {
      transactionHash: (req as any).transactionHash,
      verified: true,
      timestamp: new Date().toISOString()
    }
  });
});

app.get("/premium/data", (req, res) => {
  res.json({
    data: "Premium data analysis results",
    insights: [
      "Market trending upward",
      "High confidence prediction",
      "Risk assessment: Low"
    ],
    payment: {
      transactionHash: (req as any).transactionHash,
      verified: true,
      timestamp: new Date().toISOString()
    }
  });
});

app.post("/api/process", (req, res) => {
  const { data } = req.body;
  
  res.json({
    result: "Data processed successfully",
    input: data,
    processedAt: new Date().toISOString(),
    processingTime: "150ms",
    payment: {
      transactionHash: (req as any).transactionHash,
      verified: true,
      timestamp: new Date().toISOString()
    }
  });
});

app.get("/data/analytics", (req, res) => {
  res.json({
    analytics: {
      totalUsers: 15420,
      activeUsers: 8934,
      revenue: "$45,230",
      growth: "+12.5%"
    },
    charts: [
      { name: "User Growth", value: 12.5 },
      { name: "Revenue", value: 8.3 },
      { name: "Engagement", value: 15.7 }
    ],
    payment: {
      transactionHash: (req as any).transactionHash,
      verified: true,
      timestamp: new Date().toISOString()
    }
  });
});

// Video streaming endpoint (requires payment)
app.get("/video", (req, res) => {
  try {
    // Path to the video file (you'll need to add a sample video)
    const videoPath = path.join(__dirname, "../assets/sample-video.mp4");

    // Check if video file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        error: "Video not found",
        message: "The requested video file is not available",
      });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // No range header, send entire file
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }

    console.log(
      `🎥 Video streamed for payment: ${(req as any).transactionHash}`
    );
  } catch (error) {
    console.error("Video streaming error:", error);
    res.status(500).json({
      error: "Video streaming failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Free routes (no payment required)
app.get("/free", (req, res) => {
  res.json({
    message: "This is a free endpoint - no payment required!",
    timestamp: new Date().toISOString(),
    features: [
      "Public access",
      "Basic information",
      "No authentication needed"
    ]
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "x402-aptos-server",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`🚀 x402 Aptos Test Server running on http://localhost:${config.port}`);
  console.log(`💰 Payment address: ${config.paymentAddress}`);
  console.log(`🔧 Facilitator URL: ${config.facilitatorUrl}`);
  console.log(`🔧 Mock mode: ${config.mockMode ? 'ENABLED' : 'DISABLED'}`);
  
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /weather          - Weather data (0.01 APT)`);
  console.log(`   GET  /premium/*        - Premium content (0.1 APT)`);
  console.log(`   POST /api/process      - Process data (0.05 APT)`);
  console.log(`   GET  /data/analytics   - Analytics data (0.02 APT)`);
  console.log(`   GET  /video            - Premium video content (0.05 APT)`);
  console.log(`   GET  /free             - Free content (no payment)`);
  console.log(`   GET  /health           - Health check`);
  
  console.log(`\n🧪 Test with curl:`);
  console.log(`   # First request - will get 402`);
  console.log(`   curl http://localhost:${config.port}/weather`);
  console.log(`   `);
  console.log(`   # Second request with mock payment`);
  console.log(`   curl -H "X-Payment: {\\"transaction\\":\\"...\\",\\"signature\\":\\"...\\",\\"address\\":\\"0x...\\"}" \\`);
  console.log(`        http://localhost:${config.port}/weather`);
});

export default app;

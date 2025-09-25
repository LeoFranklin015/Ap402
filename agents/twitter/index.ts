import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { TwitterAgent } from "./agent";
import { paymentMiddleware, PaymentRoutes } from "x402-aptos-facilitator";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.TWITTER_PORT || 3002;

// Configuration for X402 Aptos facilitator
const paymentAddress = process.env.PAYMENT_ADDRESS || '0xbcfb4a60c030cb5dcab8adc7d723fcc6f2bbfa432f595ae8eb1bdc436b928cbd'; // Default facilitator address

// Define payment routes
const paymentRoutes: PaymentRoutes = {
  "/job": {
    price: "1000000", // 0.01 APT in octas (same as Gmail agent pattern)
    network: "aptos-testnet"
  }
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply x402 payment middleware using the SDK
app.use(paymentMiddleware(
  paymentAddress,
  paymentRoutes,
  { url: `http://localhost:${PORT}` }
));

// Initialize Twitter Agent
let twitterAgent: TwitterAgent | null = null;

try {
  twitterAgent = new TwitterAgent();
  console.log("✅ Twitter Agent initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Twitter Agent:", error);
  console.log(
    "⚠️  Server will start but Twitter functionality will be disabled"
  );
  console.log(
    "📝 Please set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET, and OPENAI_API_KEY environment variables"
  );
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Twitter Agent API",
  });
});

// Post tweet endpoint (protected with X402 payment)
app.post("/job", async (req, res) => {
    try {
      if (!twitterAgent) {
        return res.status(503).json({
          success: false,
          error:
            "Twitter Agent not available. Please check environment variables.",
        });
      }

      const { content } = req.body;

      // Validate required fields
      if (!content) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: information",
        });
      }

      console.log(`🐦 Posting tweet about: ${content}`);
      const result = await twitterAgent.postTweet(content);

      if (result.success) {
        res.json({
          success: true,
          message: "Tweet posted successfully",
          payment: {
            transactionHash: (req as any).transactionHash,
            verified: true,
            timestamp: new Date().toISOString()
          },
          data: {
            tweetId: result.tweetId,
            tweetText: result.tweetText,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || "Failed to post tweet",
        });
      }
    } catch (error) {
      console.error("Error in post-tweet endpoint:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get Twitter agent status
app.get("/status", (req, res) => {
  res.json({
    agentAvailable: twitterAgent !== null,
    timestamp: new Date().toISOString(),
    endpoints: [
      "POST /job - Post a tweet to Twitter (Payment Required: 0.01 APT)",
      "GET /health - Health check",
      "GET /status - Agent status",
    ],
    payment: {
      amount: "0.01 APT (1,000,000 octas)",
      network: "aptos-testnet",
      description: "AI-enhanced Twitter posting service",
    },
  });
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Server error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: err.message,
    });
  }
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Twitter Agent API server running on port ${PORT}`);
  console.log(`💰 Payment address: ${paymentAddress}`);
  console.log(`🔧 Using @x402/aptos-facilitator SDK`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/status`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  
  console.log(`\n📋 Available endpoints:`);
  console.log(`   POST /job            - AI-enhanced tweet posting (0.01 APT)`);
  console.log(`   GET  /health         - Health check`);
  console.log(`   GET  /status         - Agent status and API info`);
});

export default app;

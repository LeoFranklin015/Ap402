import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { GmailAgent, EmailRequest } from "./agent";
import { paymentMiddleware, PaymentRoutes } from "x402-aptos-facilitator";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Configuration for X402 Aptos facilitator
const paymentAddress = process.env.PAYMENT_ADDRESS || '0xbcfb4a60c030cb5dcab8adc7d723fcc6f2bbfa432f595ae8eb1bdc436b928cbd'; // Default facilitator address

// Define payment routes
const paymentRoutes: PaymentRoutes = {
  "/job": {
    price: "1000000", // 0.01 APT in octas (same as test server pattern)
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

// Initialize Gmail Agent
let gmailAgent: GmailAgent | null = null;

try {
  gmailAgent = new GmailAgent();
  console.log("✅ Gmail Agent initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Gmail Agent:", error);
  console.log("⚠️  Server will start but Gmail functionality will be disabled");
  console.log(
    "📝 Please set OPENAI_API_KEY and COMPOSIO_API_KEY environment variables"
  );
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Gmail Agent API",
  });
});

// Send email endpoint
app.post("/send-email", async (req, res) => {
  try {
    if (!gmailAgent) {
      return res.status(503).json({
        success: false,
        error: "Gmail Agent not available. Please check environment variables.",
      });
    }

    const { to, subject, content, useAI = false }: EmailRequest = req.body;

    // Validate required fields
    if (!to || !subject || !content) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: to, subject, content",
      });
    }

    console.log(`📧 Sending email to: ${to}`);
    const result = await gmailAgent.sendEmail({
      to,
      subject,
      content,
      useAI,
    });

    if (result.success) {
      res.json({
        success: true,
        message: "Email sent successfully",
        data: {
          messageId: result.messageId,
          subject: result.emailSubject,
          body: result.emailBody,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || "Failed to send email",
      });
    }
  } catch (error: any) {
    console.error("❌ Error in send-email endpoint:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Send simple email endpoint (without AI)
app.post("/send-simple-email", async (req, res) => {
  try {
    if (!gmailAgent) {
      return res.status(503).json({
        success: false,
        error: "Gmail Agent not available. Please check environment variables.",
      });
    }

    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: to, subject, body",
      });
    }

    console.log(`📧 Sending simple email to: ${to}`);
    const result = await gmailAgent.sendSimpleEmail(to, subject, body);

    if (result.success) {
      res.json({
        success: true,
        message: "Email sent successfully",
        data: {
          messageId: result.messageId,
          subject: result.emailSubject,
          body: result.emailBody,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || "Failed to send email",
      });
    }
  } catch (error: any) {
    console.error("❌ Error in send-simple-email endpoint:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Send AI-enhanced email endpoint (protected with X402 payment)
app.post("/job", async (req, res) => {
    try {
      if (!gmailAgent) {
        return res.status(503).json({
          success: false,
          error:
            "Gmail Agent not available. Please check environment variables.",
        });
      }

      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: content",
        });
      }

      console.log("🤖 Sending AI-enhanced email");
      const result = await gmailAgent.sendAIEmail(content);

      if (result.success) {
        res.json({
          success: true,
          message: "AI-enhanced email sent successfully",
          payment: {
            transactionHash: (req as any).transactionHash,
            verified: true,
            timestamp: new Date().toISOString()
          },
          data: {
            messageId: result.messageId,
            subject: result.emailSubject,
            body: result.emailBody,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || "Failed to send email",
        });
      }
    } catch (error: any) {
      console.error("❌ Error in send-ai-email endpoint:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  }
);

// API documentation endpoint
app.get("/api-docs", (req, res) => {
  res.json({
    name: "Gmail Agent API",
    version: "1.0.0",
    description:
      "API for sending emails using Gmail with optional AI enhancement",
    endpoints: [
      {
        method: "GET",
        path: "/health",
        description: "Health check endpoint",
      },
      {
        method: "POST",
        path: "/send-email",
        description: "Send email with optional AI enhancement",
        body: {
          to: "string (required)",
          subject: "string (required)",
          content: "string (required)",
          useAI: "boolean (optional, default: false)",
        },
      },
      {
        method: "POST",
        path: "/send-simple-email",
        description: "Send simple email without AI enhancement",
        body: {
          to: "string (required)",
          subject: "string (required)",
          body: "string (required)",
        },
      },
      {
        method: "POST",
        path: "/job",
        description:
          "Send AI-enhanced email to default recipient (Payment Required: 0.01 APT)",
        headers: {
          "X-Payment": "string (required) - Signed Aptos payment transaction",
        },
        body: {
          content: "string (required)",
        },
        payment: {
          amount: "0.01 APT (1,000,000 octas)",
          network: "aptos-testnet",
          description: "AI-enhanced email service",
        },
      },
    ],
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    availableEndpoints: [
      "GET /health",
      "POST /send-email",
      "POST /send-simple-email",
      "POST /job (Payment Required: 0.01 APT)",
      "GET /api-docs",
    ],
  });
});

// Error handling middleware
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("❌ Unhandled error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gmail Agent API server running on port ${PORT}`);
  console.log(`💰 Payment address: ${paymentAddress}`);
  console.log(`🔧 Using @x402/aptos-facilitator SDK`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  
  console.log(`\n📋 Available endpoints:`);
  console.log(`   POST /job            - AI-enhanced email (0.01 APT)`);
  console.log(`   POST /send-email     - Send email with optional AI`);
  console.log(`   POST /send-simple-email - Send simple email`);
  console.log(`   GET  /health         - Health check`);
  console.log(`   GET  /api-docs       - API documentation`);
});

export default app;

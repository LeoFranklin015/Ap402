import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { WebsiteBuilder } from "./agent";
import path from "path";
import { promises as fs } from "fs";
import { paymentMiddleware, PaymentRoutes } from "../../facilitator/dist";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.WEBSITE_PORT || 3003;

// Configuration for X402 Aptos facilitator
const paymentAddress = process.env.PAYMENT_ADDRESS || '0xbcfb4a60c030cb5dcab8adc7d723fcc6f2bbfa432f595ae8eb1bdc436b928cbd'; // Default facilitator address

// Define payment routes
const paymentRoutes: PaymentRoutes = {
  "/job": {
    price: "5000000", // 0.05 APT in octas (higher fee for website building)
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

// Serve static files from generated websites
app.use(
  "/websites",
  express.static(path.join(__dirname, "../generated-websites"))
);

// Initialize Website Builder
let websiteBuilder: WebsiteBuilder | null = null;

try {
  websiteBuilder = new WebsiteBuilder();
  console.log("✅ Website Builder initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Website Builder:", error);
  console.log(
    "⚠️  Server will start but website building functionality will be disabled"
  );
  console.log("📝 Please set OPENAI_API_KEY environment variable");
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Website Builder API",
  });
});

// Build website endpoint (protected with X402 payment)
app.post("/job", async (req, res) => {
    try {
      if (!websiteBuilder) {
        return res.status(503).json({
          success: false,
          error:
            "Website Builder not available. Please check environment variables.",
        });
      }

      const { content } = req.body;

      // Validate required fields
      if (!content) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: inputData",
        });
      }

      const websiteDir = `website-${Date.now()}`;
      const fullOutputDir = path.join(
        __dirname,
        "../generated-websites",
        websiteDir
      );

      console.log(`🏗️  Building website: ${content}`);
      const result = await websiteBuilder.buildWebsite(content, fullOutputDir);

      // Get the generated files
      const htmlPath = path.join(fullOutputDir, "index.html");
      const cssPath = path.join(fullOutputDir, "styles.css");

      let htmlContent = "";
      let cssContent = "";

      try {
        htmlContent = await fs.readFile(htmlPath, "utf-8");
        cssContent = await fs.readFile(cssPath, "utf-8");
      } catch (fileError) {
        console.warn("Could not read generated files:", fileError);
      }

      res.json({
        success: true,
        message: "Website built successfully",
        payment: {
          transactionHash: (req as any).transactionHash,
          verified: true,
          timestamp: new Date().toISOString()
        },
        data: {
          outputDir: websiteDir,
          websiteUrl: `http://localhost:${PORT}/websites/${websiteDir}/index.html`,
          files: {
            html: htmlContent,
            css: cssContent,
          },
          result,
        },
      });
    } catch (error) {
      console.error("Error in build-website endpoint:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Generate website content only (without building files)
app.post("/generate-content", async (req, res) => {
  try {
    if (!websiteBuilder) {
      return res.status(503).json({
        success: false,
        error:
          "Website Builder not available. Please check environment variables.",
      });
    }

    const { topic, style = "professional" } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: topic",
      });
    }

    console.log(`📝 Generating content for: ${topic} (${style} style)`);
    const content = await websiteBuilder.generateWebsiteContent(topic, style);

    res.json({
      success: true,
      message: "Website content generated successfully",
      data: {
        content,
        style,
        topic,
      },
    });
  } catch (error) {
    console.error("Error in generate-content endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// List available website styles
app.get("/styles", (req, res) => {
  const styles = [
    {
      name: "professional",
      description:
        "Clean, corporate design with neutral colors and structured layout",
      characteristics: {
        color_scheme: "neutral, corporate colors",
        typography: "clean, sans-serif fonts",
        layout: "structured, grid-based",
      },
    },
    {
      name: "creative",
      description:
        "Vibrant, artistic design with bold colors and dynamic layout",
      characteristics: {
        color_scheme: "vibrant, bold colors",
        typography: "mix of modern and artistic fonts",
        layout: "dynamic, asymmetrical",
      },
    },
    {
      name: "minimal",
      description:
        "Simple, elegant design with monochrome colors and clean layout",
      characteristics: {
        color_scheme: "monochrome, subtle colors",
        typography: "simple, elegant fonts",
        layout: "clean, whitespace-focused",
      },
    },
    {
      name: "eco-friendly",
      description: "Nature-inspired design with earth tones and organic layout",
      characteristics: {
        color_scheme: "earth tones, natural colors",
        typography: "organic, natural fonts",
        layout: "flowing, nature-inspired",
      },
    },
  ];

  res.json({
    success: true,
    message: "Available website styles",
    data: { styles },
  });
});

// Get website builder status
app.get("/status", (req, res) => {
  res.json({
    builderAvailable: websiteBuilder !== null,
    timestamp: new Date().toISOString(),
    endpoints: [
      "POST /job - Build a complete website (Payment Required: 0.05 APT)",
      "POST /generate-content - Generate website content only",
      "GET /styles - List available website styles",
      "GET /health - Health check",
      "GET /status - Builder status",
    ],
    payment: {
      amount: "0.05 APT (5,000,000 octas)",
      network: "aptos-testnet",
      description: "AI-powered website building service",
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
  console.log(`🚀 Website Builder API server running on port ${PORT}`);
  console.log(`💰 Payment address: ${paymentAddress}`);
  console.log(`🔧 Using @x402/aptos-facilitator SDK`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/status`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌐 Generated websites: http://localhost:${PORT}/websites/`);
  
  console.log(`\n📋 Available endpoints:`);
  console.log(`   POST /job            - AI-powered website building (0.05 APT)`);
  console.log(`   POST /generate-content - Generate website content only`);
  console.log(`   GET  /styles         - List available website styles`);
  console.log(`   GET  /health         - Health check`);
  console.log(`   GET  /status         - Builder status and API info`);
});

export default app;

/**
 * Test server for x402 protocol demonstration
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { paymentMiddleware, PaymentRoutes, AptosFacilitator } from 'x402-aptos-facilitator';
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Configuration
const port = 4021;
const paymentAddress = process.env.PAYMENT_ADDRESS || '0xbcfb4a60c030cb5dcab8adc7d723fcc6f2bbfa432f595ae8eb1bdc436b928cbd'; // Your real Aptos address

// Initialize facilitator for orchestration
const facilitator = new AptosFacilitator({
  aptosNetwork: 'testnet',
  port: 4021,
  mockMode: false
});

// X402 Client for agent communication
class X402Client {
  private aptos: Aptos;
  private account: Account;

  constructor() {
    // Initialize Aptos client
    const aptosConfig = new AptosConfig({ network: Network.TESTNET });
    this.aptos = new Aptos(aptosConfig);

    // Load account from environment variables
    if (process.env.PrivateKey) {
      const privateKey = new Ed25519PrivateKey(process.env.PrivateKey);
      this.account = Account.fromPrivateKey({ privateKey });
      console.log('🔑 X402 Client initialized with account:', this.account.accountAddress.toString());
    } else {
      throw new Error('PrivateKey environment variable is required for X402 client');
    }
  }

  // Create payment transaction for agent
  async createPaymentTransaction(recipient: string, amount: string) {
    try {
      console.log(`�� Creating payment transaction for agent...`);
      console.log(`   To: ${recipient}`);
      console.log(`   Amount: ${amount} octas`);
  
      // Build the transaction - let the SDK handle sequence numbers automatically
      const transaction = await this.aptos.transaction.build.simple({
        sender: this.account.accountAddress.toString(),
        data: {
          function: '0x1::coin::transfer',
          typeArguments: ['0x1::aptos_coin::AptosCoin'],
          functionArguments: [recipient, BigInt(amount)]
        }
        // Remove explicit sequence number - let SDK handle it automatically
      });
  
      // Sign the transaction
      const senderAuthenticator = this.aptos.transaction.sign({
        signer: this.account,
        transaction
      });
  
      return {
        transaction: transaction,
        signature: senderAuthenticator,
        publicKey: this.account.publicKey.toString(),
        address: this.account.accountAddress.toString(),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Error creating payment transaction:', error);
      throw error;
    }
  }

  // Make X402 request to agent
  async request(endpoint: string, options: { method: string; headers?: any; data?: any }) {
    try {
      console.log(`🔄 Making X402 request to agent: ${endpoint}`);

      // First attempt - try to get the resource
      const response = await axios({
        method: options.method,
        url: endpoint,
        headers: options.headers,
        data: options.data,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      if (response.status === 200) {
        console.log('✅ Agent request successful (no payment required)');
        return response.data;
      }

      if (response.status === 402) {
        console.log('💰 Agent requires payment, processing X402 flow...');
        
        // Extract payment details from 402 response
        const paymentDetails = response.data.payment;
        if (!paymentDetails) {
          throw new Error('No payment details in 402 response');
        }

        // Create payment transaction
        const paymentTransaction = await this.createPaymentTransaction(
          paymentDetails.recipient,
          paymentDetails.amount
        );

        // Retry request with payment
        const retryResponse = await axios({
          method: options.method,
          url: endpoint,
          headers: {
            ...options.headers,
            'X-Payment': JSON.stringify(paymentTransaction)
          },
          data: options.data
        });

        if (retryResponse.status === 200) {
          console.log('✅ Agent request successful with payment');
          return retryResponse.data;
        } else {
          throw new Error(`Payment failed: ${retryResponse.status} ${retryResponse.statusText}`);
        }
      }

      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
 
   } catch (error) {
      console.error('❌ X402 request failed:', error);
      throw error;
    }
  }
}
// Initialize X402 client
let x402Client: X402Client | null = null;
try {
  x402Client = new X402Client();
} catch (error) {
  console.warn('⚠️ X402 Client not initialized:', error instanceof Error ? error.message : 'Unknown error');
  console.warn('   Agent communication will be limited without proper wallet setup');
}

// Agents configuration
const agents = [
  {
    name: "Gmail Agent",
    desc: "This is a Gmail Agent , which can send gmails for you",
    endpoint: "http://localhost:3004/job",
    fee: "1000",
  },
  {
    name: "Twitter Agent",
    desc: "This can go and shill for you on twitter about your events and achievements",
    endpoint: "http://localhost:3002/job",
    fee: "1000",
  },
  {
    name: "Website Agent",
    desc: "This is a website building agent , which can cerate a landing page or registration websites for you",
    endpoint: "http://localhost:3003/job",
    fee: "5000",
  },
];

// Define payment routes
const paymentRoutes: PaymentRoutes = {
  "/weather": {
    price: "1000000", // 0.01 APT in octas
    network: "aptos-testnet"
  },
  "/premium/*": {
    price: "10000000", // 0.1 APT in octas
    network: "aptos-testnet"
  },
  "/api/process": {
    price: "5000000", // 0.05 APT in octas
    network: "aptos-testnet"
  },
  "/data/analytics": {
    price: {
      amount: "2000000", // 0.02 APT
      asset: {
        address: "0x1::aptos_coin::AptosCoin",
        decimals: 8
      }
    },
    network: "aptos-testnet"
  },
  "/video": {
    price: "5000000", // 0.05 APT in octas
    network: "aptos-testnet"
  },
  "/orchestrate": {
    price: "10000000", // 0.1 APT in octas - dynamic pricing based on agents used
    network: "aptos-testnet"
  }
};

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create custom payment middleware with real transactions
import { createPaymentMiddleware } from 'x402-aptos-facilitator';

// Create custom payment middleware that disables mock mode
const customPaymentMiddleware = (payTo: string, routes: PaymentRoutes, options: { url: string }) => {
  const config = {
    aptosNetwork: 'testnet' as const,
    port: 4021,
    mockMode: false // Disable mock mode for real transactions
  };

  const facilitator = new AptosFacilitator(config);

  return async (req: any, res: any, next: any) => {
    try {
      // Check if this route requires payment
      const route = findMatchingRoute(req.path, routes);
      
      if (!route) {
        return next();
      }

      // Check if payment is already provided in X-Payment header
      const paymentHeader = req.headers['x-payment'] as string;
      
      if (!paymentHeader) {
        // Payment required - return 402
        return res.status(402).json({
          payment: {
            amount: route.price,
            token: '0x1::aptos_coin::AptosCoin',
            recipient: payTo,
            deadline: Date.now() + (5 * 60 * 1000)
          },
          message: 'Payment required to access this resource',
          retryAfter: 5
        });
      }

      // Parse payment request
      let paymentRequest: any;
      try {
        paymentRequest = JSON.parse(paymentHeader);
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid payment header format'
        });
      }

      // Verify payment with facilitator (now using real transactions)
      const verification = await facilitator.processPayment(paymentRequest);

      if (!verification.isValid) {
        return res.status(402).json({
          payment: {
            amount: route.price,
            token: '0x1::aptos_coin::AptosCoin',
            recipient: payTo,
            deadline: Date.now() + (5 * 60 * 1000)
          },
          message: `Payment verification failed: ${verification.error}`,
          retryAfter: 5
        });
      }

      // Payment verified - add transaction info to request
      req.paymentVerification = verification;
      req.transactionHash = verification.transactionHash;

      console.log('✅ Payment verified for:', req.path);
      console.log('Transaction Hash:', verification.transactionHash);

      next();

    } catch (error) {
      console.error('Payment middleware error:', error);
      res.status(500).json({
        error: 'Internal server error in payment processing'
      });
    }
  };
};

// Helper function to find matching route
function findMatchingRoute(path: string, routes: PaymentRoutes): any {
  // Check exact match first
  if (routes[path]) {
    return routes[path];
  }

  // Check wildcard patterns
  for (const [routePath, routeConfig] of Object.entries(routes)) {
    if (routePath.includes('*')) {
      const pattern = routePath.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(path)) {
        return routeConfig;
      }
    }
  }

  return null;
}

// Apply custom x402 payment middleware with real transactions
app.use(customPaymentMiddleware(
  paymentAddress,
  paymentRoutes,
  { url: `http://localhost:${port}` }
));

// Helper function to calculate orchestration cost using OpenAI
async function calculateOrchestrationCost(query: string) {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log("OpenAI API key not available, using fallback orchestration");
      return {
        subqueries: agents.map((agent) => ({
          agent: agent.name,
          subquery: `Process: ${query}`,
          fee: agent.fee,
          endpoint: agent.endpoint,
        })),
        totalCost: agents.reduce((sum, agent) => sum + parseInt(agent.fee), 0),
        agentsUsed: agents.map((agent) => agent.name),
      };
    }

    const openai = new (await import("openai")).default({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
Analyze the following query and determine which agents should be used and create subqueries for each agent.

Available agents:
${agents
  .map(
    (agent) => `- ${agent.name}: ${agent.desc} (Fee: ${agent.fee} )`
  )
  .join("\n")}

Query: "${query}"

Please respond with a JSON object containing:
{
  "subqueries": [
    {
      "agent": "Agent Name",
      "subquery": "Specific task for this agent",
      "fee": "agent fee"
    }
  ],
  "totalCost": "sum of all fees",
  "agentsUsed": ["list of agent names"],
}

Only include agents that are relevant to the query. Be specific about what each agent should do.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an AI orchestration expert. Analyze queries and determine the best agent allocation. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");

    console.log("result", result);
    // Validate and ensure fees match our agent list
    const validatedSubqueries =
      result.subqueries?.map((sq: any) => {
        const agent = agents.find((a) => a.name === sq.agent);
        return {
          ...sq,
          fee: agent ? agent.fee : "0",
          endpoint: agent ? agent.endpoint : "",
        };
      }) || [];

    const totalCost = validatedSubqueries.reduce(
      (sum: number, sq: any) => sum + parseInt(sq.fee),
      0
    );

    console.log(validatedSubqueries, totalCost, result.agentsUsed);

    return {
      subqueries: validatedSubqueries,
      totalCost,
      agentsUsed: result.agentsUsed || [],
    };
  } catch (error) {
    console.error("Error calculating orchestration cost:", error);
    // Fallback: use all agents with basic subqueries
    return {
      subqueries: agents.map((agent) => ({
        agent: agent.name,
        subquery: `Process: ${query}`,
        fee: agent.fee,
        endpoint: agent.endpoint,
      })),
      totalCost: agents.reduce((sum, agent) => sum + parseInt(agent.fee), 0),
      agentsUsed: agents.map((agent) => agent.name),
    };
  }
}

// Helper function to process orchestration after payment
async function processOrchestration(query: string) {
  try {
    const orchestrationPlan = await calculateOrchestrationCost(query);
    const results = [];

    console.log("orchestrationPlan", orchestrationPlan);

    // Process each subquery with the appropriate agent
    for (const subquery of orchestrationPlan.subqueries) {
      try {
        console.log(`🤖 Processing agent: ${subquery.agent}`);
        console.log(`   Task: ${subquery.subquery}`);
        console.log(`   Endpoint: ${subquery.endpoint}`);
        console.log(`   Fee: ${subquery.fee} `);

        if (!x402Client) {
          console.warn('⚠️ X402 Client not available, making direct HTTP request');
          // Fallback to direct HTTP request if X402 client is not available
          const agentResult = await axios.post(subquery.endpoint, {
            content: subquery.subquery + " " + query,
          }, {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 30000, // 30 second timeout
          });

          results.push({
            agent: subquery.agent,
            success: true,
            result: agentResult.data,
            fee: subquery.fee,
          });
        } else {
          // Use X402 client for payment-enabled requests
          const agentResult = await x402Client.request(subquery.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            data: {
              content: subquery.subquery + " " + query,
            },
          });

          results.push({
            agent: subquery.agent,
            success: true,
            result: agentResult,
            fee: subquery.fee,
          });
        }

        console.log(`✅ Agent ${subquery.agent} completed successfully`);
      } catch (error) {
        console.error(`❌ Agent ${subquery.agent} failed:`, error);
        results.push({
          agent: subquery.agent,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          fee: subquery.fee,
        });
      }
    }

    return {
      originalQuery: query,
      orchestrationPlan,
      results,
      summary: {
        totalAgents: orchestrationPlan.subqueries.length,
        successfulAgents: results.filter((r) => r.success).length,
        totalCost: orchestrationPlan.totalCost,
        completionTime: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(
      `Orchestration processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

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

// Orchestration endpoints
app.get("/get-agents", (req, res) => {
  res.json({
    agents,
  });
});

// Orchestration endpoint
app.post("/orchestrate", async (req, res) => {
  try {
    const xPaymentHeader = req.headers["x-payment"] as string;
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: query",
      });
    }

    // If payment is provided, process the orchestration
    if (xPaymentHeader) {
      // Calculate the expected cost first
      const orchestrationPlan = await calculateOrchestrationCost(query);

      // Verify payment through facilitator
      try {
        const paymentRequest = JSON.parse(xPaymentHeader);
        const paymentResult = await facilitator.processPayment(paymentRequest);

        if (!paymentResult.isValid) {
          return res.status(402).json({
            error: "Payment verification failed",
            message: paymentResult.error,
            orchestration: {
              originalQuery: query,
              subqueries: orchestrationPlan.subqueries,
              totalCost: orchestrationPlan.totalCost,
              agentsUsed: orchestrationPlan.agentsUsed,
            },
          });
        }

        // Process orchestration after payment verification
        const orchestrationResult = await processOrchestration(query);
        return res.json({
          success: true,
          message: "Orchestration completed successfully",
          data: orchestrationResult,
        });
      } catch (error) {
        return res.status(402).json({
          error: "Payment verification failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // No payment provided, calculate cost and send 402
    const orchestrationPlan = await calculateOrchestrationCost(query);

    // Create payment request for the total cost
    const paymentRequest = {
      recipient: process.env.FACILITATOR_ADDRESS || paymentAddress,
      amount: orchestrationPlan.totalCost.toString(),
      token: "APT",
      description: `Agent orchestration: ${orchestrationPlan.subqueries.length} tasks`,
      nonce: Date.now().toString(),
      timestamp: Date.now()
    };

    // Create custom steps for orchestration
    const orchestrationSteps = orchestrationPlan.subqueries.map(
      (subquery: any, index: number) => {
        const agentName =
          subquery.agent ||
          orchestrationPlan.agentsUsed[index] ||
          `Agent ${index + 1}`;
        const cost = subquery.fee || 0;
        const task = subquery.subquery || "Task";
        return `${agentName} - ${task} - ${cost}`;
      }
    );

    // Create 402 response with orchestration details
    const response = {
      error: "Payment Required",
      payment: paymentRequest,
      instructions: {
        message: "Payment required for agent orchestration",
        steps: orchestrationSteps,
        totalCost: orchestrationPlan.totalCost
      },
      orchestration: {
        originalQuery: query,
        subqueries: orchestrationPlan.subqueries,
        totalCost: orchestrationPlan.totalCost,
        agentsUsed: orchestrationPlan.agentsUsed,
      },
    };

    return res.status(402).json(response);
  } catch (error) {
    console.error("Orchestration error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
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
app.listen(port, () => {
  console.log(`🚀 x402 Aptos Test Server running on http://localhost:${port}`);
  console.log(`💰 Payment address: ${paymentAddress}`);
  console.log(`🔧 Using @x402/aptos-facilitator SDK`);
  
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /weather          - Weather data (0.01 APT)`);
  console.log(`   GET  /premium/*        - Premium content (0.1 APT)`);
  console.log(`   POST /api/process      - Process data (0.05 APT)`);
  console.log(`   GET  /data/analytics   - Analytics data (0.02 APT)`);
  console.log(`   GET  /video            - Premium video content (0.05 APT)`);
  console.log(`   GET  /get-agents       - Get available agents (free)`);
  console.log(`   POST /orchestrate      - Orchestrate agents (0.1 APT)`);
  console.log(`   GET  /free             - Free content (no payment)`);
  console.log(`   GET  /health           - Health check`);
  
  console.log(`\n🧪 Test with curl:`);
  console.log(`   # First request - will get 402`);
  console.log(`   curl http://localhost:${port}/weather`);
  console.log(`   `);
  console.log(`   # Second request with mock payment`);
  console.log(`   curl -H "X-Payment: {\\"transaction\\":\\"...\\",\\"signature\\":\\"...\\",\\"address\\":\\"0x...\\"}" \\`);
  console.log(`        http://localhost:${port}/weather`);
});

export default app;

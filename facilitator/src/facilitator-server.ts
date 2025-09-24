/**
 * Facilitator HTTP Server for x402 Protocol
 */

import express from 'express';
import cors from 'cors';
import { AptosFacilitator } from './aptos-facilitator';
import { PaymentRequest, FacilitatorConfig } from './types';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const config: FacilitatorConfig = {
  aptosNetwork: 'testnet',
  port: 3001,
  mockMode: false // REAL MODE - no mocking
};

const facilitator = new AptosFacilitator(config);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'x402-aptos-facilitator',
    version: '1.0.0',
    mockMode: config.mockMode,
    timestamp: new Date().toISOString()
  });
});

// Payment verification endpoint
app.post('/verify', async (req, res) => {
  try {
    const paymentRequest: PaymentRequest = req.body;
    
    console.log('🔍 Facilitator received payment verification request');
    console.log('Address:', paymentRequest.address);
    console.log('Transaction:', paymentRequest.transaction);
    
    const verification = await facilitator.processPayment(paymentRequest);
    
    console.log('✅ Payment verification result:', verification.isValid ? 'SUCCESS' : 'FAILED');
    if (verification.transactionHash) {
      console.log('Transaction Hash:', verification.transactionHash);
    }
    
    res.json(verification);
  } catch (error) {
    console.error('❌ Facilitator error:', error);
    res.status(500).json({
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      verifiedAt: Date.now()
    });
  }
});

// Transaction status endpoint
app.get('/transaction/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const isConfirmed = await facilitator.isTransactionConfirmed(hash);
    const details = await facilitator.getTransactionDetails(hash);
    
    res.json({
      hash,
      confirmed: isConfirmed,
      details
    });
  } catch (error) {
    console.error('❌ Transaction status error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(config.port, () => {
  console.log(`🔧 x402 Aptos Facilitator running on http://localhost:${config.port}`);
  console.log(`🔧 Mock mode: ${config.mockMode ? 'ENABLED' : 'DISABLED'}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /health                    - Health check`);
  console.log(`   POST /verify                    - Verify payment`);
  console.log(`   GET  /transaction/:hash         - Get transaction status`);
});

export default app;

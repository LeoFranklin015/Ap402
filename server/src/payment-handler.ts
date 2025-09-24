/**
 * Payment handler for x402 protocol
 */

import axios from 'axios';
import { PaymentPayload, X402Response, PaymentVerification, ServerConfig } from './types';

export class PaymentHandler {
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
  }

  /**
   * Create 402 Payment Required response
   */
  createPaymentRequired(route: string, price: string | any): X402Response {
    const amount = typeof price === 'string' ? price : price.amount;
    const token = typeof price === 'string' 
      ? '0x1::aptos_coin::AptosCoin' 
      : price.asset?.address || '0x1::aptos_coin::AptosCoin';

    return {
      payment: {
        amount,
        token,
        recipient: this.config.paymentAddress,
        deadline: Date.now() + (5 * 60 * 1000), // 5 minutes from now
        nonce: this.generateNonce()
      },
      message: `Payment required to access ${route}`,
      retryAfter: 5
    };
  }

  /**
   * Verify payment with facilitator
   */
  async verifyPayment(paymentHeader: string): Promise<PaymentVerification> {
    try {
      if (this.config.mockMode) {
        return this.createMockVerification();
      }

      // Parse payment request
      const paymentRequest = JSON.parse(paymentHeader);
      
      // Send to facilitator for verification
      const response = await axios.post(`${this.config.facilitatorUrl}/verify`, {
        transaction: paymentRequest.transaction,
        signature: paymentRequest.signature,
        publicKey: paymentRequest.publicKey,
        address: paymentRequest.address,
        timestamp: paymentRequest.timestamp
      });

      return response.data;

    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Payment verification failed',
        verifiedAt: Date.now()
      };
    }
  }

  /**
   * Create mock verification for testing
   */
  private createMockVerification(): PaymentVerification {
    const mockHash = `0x${Buffer.from(Date.now().toString()).toString('hex').slice(0, 64)}`;
    
    console.log('🔧 MOCK MODE: Payment verification successful');
    console.log('Mock transaction hash:', mockHash);
    
    return {
      isValid: true,
      transactionHash: mockHash,
      verifiedAt: Date.now()
    };
  }

  /**
   * Generate nonce for payment request
   */
  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Check if payment is required for route
   */
  isPaymentRequired(route: string, paymentRoutes: any): boolean {
    // Check exact match
    if (paymentRoutes[route]) {
      return true;
    }

    // Check wildcard patterns
    for (const [routePath] of Object.entries(paymentRoutes)) {
      if (routePath.includes('*')) {
        const pattern = routePath.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(route)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get payment configuration for route
   */
  getPaymentConfig(route: string, paymentRoutes: any): any {
    // Check exact match first
    if (paymentRoutes[route]) {
      return paymentRoutes[route];
    }

    // Check wildcard patterns
    for (const [routePath, config] of Object.entries(paymentRoutes)) {
      if (routePath.includes('*')) {
        const pattern = routePath.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(route)) {
          return config;
        }
      }
    }

    return null;
  }
}


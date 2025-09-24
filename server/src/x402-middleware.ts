/**
 * x402 middleware for Express servers
 */

import { Request, Response, NextFunction } from 'express';
import { PaymentHandler } from './payment-handler';
import { ServerConfig, PaymentRoutes } from './types';

export function createX402Middleware(
  config: ServerConfig,
  paymentRoutes: PaymentRoutes
) {
  const paymentHandler = new PaymentHandler(config);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const route = `${req.method} ${req.path}`;
      
      // Check if payment is required for this route
      if (!paymentHandler.isPaymentRequired(route, paymentRoutes)) {
        return next();
      }

      // Check if payment is already provided
      const paymentHeader = req.headers['x-payment'] as string;
      
      if (!paymentHeader) {
        // Payment required - return 402
        const paymentConfig = paymentHandler.getPaymentConfig(route, paymentRoutes);
        const x402Response = paymentHandler.createPaymentRequired(route, paymentConfig.price);
        
        return res.status(402).json(x402Response);
      }

      // Verify payment
      const verification = await paymentHandler.verifyPayment(paymentHeader);

      if (!verification.isValid) {
        // Payment verification failed - return 402
        const paymentConfig = paymentHandler.getPaymentConfig(route, paymentRoutes);
        const x402Response = paymentHandler.createPaymentRequired(route, paymentConfig.price);
        x402Response.message = `Payment verification failed: ${verification.error}`;
        
        return res.status(402).json(x402Response);
      }

      // Payment verified - add info to request
      (req as any).paymentVerification = verification;
      (req as any).transactionHash = verification.transactionHash;

      console.log(`✅ Payment verified for ${route}`);
      console.log(`Transaction Hash: ${verification.transactionHash}`);

      next();

    } catch (error) {
      console.error('x402 middleware error:', error);
      res.status(500).json({
        error: 'Internal server error in payment processing'
      });
    }
  };
}

export function x402Middleware(
  config: ServerConfig,
  paymentRoutes: PaymentRoutes
) {
  return createX402Middleware(config, paymentRoutes);
}


/**
 * Express middleware for x402 payment handling
 */

import { Request, Response, NextFunction } from 'express';
import { AptosFacilitator } from './aptos-facilitator';
import { PaymentRequest, PaymentRoutes, FacilitatorConfig } from './types';

export interface PaymentMiddlewareOptions {
  url: string;
}

export function createPaymentMiddleware(
  payTo: string,
  routes: PaymentRoutes,
  options: PaymentMiddlewareOptions
) {
  const config: FacilitatorConfig = {
    aptosNetwork: 'testnet', // Default to testnet
    port: 3000,
    mockMode: true // Enable mock mode for testing
  };

  const facilitator = new AptosFacilitator(config);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if this route requires payment
      const route = findMatchingRoute(req.path, routes);
      
      if (!route) {
        // No payment required for this route
        return next();
      }

      // Check if payment is already provided in X-Payment header
      const paymentHeader = req.headers['x-payment'] as string;
      
      if (!paymentHeader) {
        // Payment required - return 402
        return res.status(402).json({
          payment: {
            amount: route.price,
            token: '0x1::aptos_coin::AptosCoin', // Default APT token
            recipient: payTo,
            deadline: Date.now() + (5 * 60 * 1000) // 5 minutes from now
          },
          message: 'Payment required to access this resource',
          retryAfter: 5
        });
      }

      // Parse payment request
      let paymentRequest: PaymentRequest;
      try {
        paymentRequest = JSON.parse(paymentHeader);
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid payment header format'
        });
      }

      // Verify payment with facilitator
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
      (req as any).paymentVerification = verification;
      (req as any).transactionHash = verification.transactionHash;

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
}

/**
 * Find matching route for the given path
 */
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

/**
 * Express middleware factory for x402 payments
 */
export function paymentMiddleware(
  payTo: string,
  routes: PaymentRoutes,
  options: PaymentMiddlewareOptions
) {
  return createPaymentMiddleware(payTo, routes, options);
}


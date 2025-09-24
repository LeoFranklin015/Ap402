/**
 * x402 Aptos Server - Main entry point
 */

export { PaymentHandler } from './payment-handler';
export { x402Middleware, createX402Middleware } from './x402-middleware';
export * from './types';

// Re-export commonly used types
export type {
  PaymentPayload,
  X402Response,
  PaymentVerification,
  ServerConfig,
  PaymentRoute,
  PaymentRoutes
} from './types';


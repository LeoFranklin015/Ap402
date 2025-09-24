/**
 * x402 Aptos Facilitator - Main entry point
 */

export { AptosFacilitator } from './aptos-facilitator';
export { paymentMiddleware, createPaymentMiddleware } from './payment-middleware';
export * from './types';

// Re-export commonly used types
export type {
  PaymentRequest,
  PaymentVerification,
  FacilitatorConfig,
  PaymentRoute,
  PaymentRoutes,
  FacilitatorResponse
} from './types';


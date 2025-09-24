/**
 * Types for x402 Server
 */

export interface PaymentPayload {
  amount: string;
  token: string;
  recipient: string;
  deadline: number;
  nonce?: string;
}

export interface X402Response {
  payment: PaymentPayload;
  message?: string;
  retryAfter?: number;
}

export interface PaymentVerification {
  isValid: boolean;
  transactionHash?: string;
  error?: string;
  verifiedAt: number;
}

export interface ServerConfig {
  port: number;
  facilitatorUrl: string;
  paymentAddress: string;
  mockMode?: boolean;
}

export interface PaymentRoute {
  price: string | {
    amount: string;
    asset: {
      address: string;
      decimals: number;
    };
  };
  token?: string;
  description?: string;
}

export interface PaymentRoutes {
  [path: string]: PaymentRoute;
}


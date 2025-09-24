/**
 * Types for x402 Facilitator
 */

export interface PaymentRequest {
  transaction: string;
  signature: string;
  publicKey: string;
  address: string;
  timestamp: number;
}

export interface PaymentVerification {
  isValid: boolean;
  transactionHash?: string;
  error?: string;
  verifiedAt: number;
}

export interface FacilitatorConfig {
  aptosNetwork: 'mainnet' | 'testnet' | 'devnet';
  port: number;
  mockMode?: boolean; // For testing - always returns true
}

export interface PaymentRoute {
  price: string | {
    amount: string;
    asset: {
      address: string;
      decimals: number;
    };
  };
  network: 'aptos-mainnet' | 'aptos-testnet' | 'aptos-devnet';
}

export interface PaymentRoutes {
  [path: string]: PaymentRoute;
}

export interface FacilitatorResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
  verifiedAt: number;
}


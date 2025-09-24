/**
 * Types for x402 protocol implementation on Aptos
 */

export interface PaymentPayload {
  amount: string;
  token: string;
  deadline: number;
  recipient: string;
  nonce?: string;
}

export interface X402Response {
  payment: PaymentPayload;
  message?: string;
  retryAfter?: number;
}

export interface AptosAccount {
  address: string;
  publicKey: string;
  privateKey: string;
}

export interface SignedTransaction {
  rawTransaction: string;
  signature: string;
  publicKey: string;
  address: string;
}

export interface X402ClientConfig {
  aptosNetwork: 'mainnet' | 'testnet' | 'devnet';
  defaultTimeout?: number;
  maxRetries?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface PaymentVerificationResult {
  isValid: boolean;
  error?: string;
  transactionHash?: string;
}


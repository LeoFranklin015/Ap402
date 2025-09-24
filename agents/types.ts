export interface PaymentRequest {
  type: string;
  version: string;
  amount: string;
  token: string;
  asaId: number;
  recipient: string;
  network: string;
  expiresAt: string;
  nonce: string;
  timestamp: string;
}

export interface X402Response {
  error: string;
  payment: PaymentRequest;
  instructions: {
    message: string;
    steps: string[];
  };
}

export interface FacilitatorConfig {
  algodServer: string;
  algodPort?: string;
  algodToken?: string;
  indexerServer: string;
  indexerPort?: string;
  indexerToken?: string;
  facilitatorMnemonic: string;
  facilitatorAddress: string;
  paymentTimeout: number;
  confirmationTimeout: number;
}

export interface PaymentVerification {
  success: boolean;
  transactionId?: string;
  confirmedRound?: number;
  error?: string;
}

export interface X402MiddlewareOptions {
  amount: number;
  token: string;
  recipient: string;
  asaId?: number;
  description?: string;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      payment?: {
        transactionId: string;
        confirmedRound?: number;
        amount: number;
        token: string;
      };
    }
  }
}

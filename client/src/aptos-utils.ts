/**
 * Aptos blockchain utilities for x402 protocol
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey, Ed25519PublicKey } from '@aptos-labs/ts-sdk';
import { AptosAccount, SignedTransaction, PaymentPayload } from './types';

export class AptosUtils {
  private aptos: Aptos;
  private config: AptosConfig;

  constructor(network: 'mainnet' | 'testnet' | 'devnet') {
    const networkConfig = this.getNetworkConfig(network);
    this.config = new AptosConfig({ network: networkConfig });
    this.aptos = new Aptos(this.config);
  }

  private getNetworkConfig(network: 'mainnet' | 'testnet' | 'devnet'): Network {
    switch (network) {
      case 'mainnet':
        return Network.MAINNET;
      case 'testnet':
        return Network.TESTNET;
      case 'devnet':
        return Network.DEVNET;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }

  /**
   * Create a new Aptos account
   */
  createAccount(): AptosAccount {
    const account = Account.generate();
    return {
      address: account.accountAddress.toString(),
      publicKey: account.publicKey.toString(),
      privateKey: account.privateKey.toString()
    };
  }

  /**
   * Load account from private key
   */
  loadAccount(privateKeyHex: string): AptosAccount {
    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    const publicKey = privateKey.publicKey();
    const account = Account.fromPrivateKey({ privateKey });
    
    return {
      address: account.accountAddress.toString(),
      publicKey: publicKey.toString(),
      privateKey: privateKeyHex
    };
  }

  /**
   * Create and sign a payment transaction
   */
  async createPaymentTransaction(
    account: AptosAccount,
    paymentPayload: PaymentPayload
  ): Promise<SignedTransaction> {
    const privateKey = new Ed25519PrivateKey(account.privateKey);
    const publicKey = privateKey.publicKey();
    const aptosAccount = Account.fromPrivateKey({ privateKey });

    // Build the transaction
    const transaction = await this.aptos.transaction.build.simple({
      sender: account.address,
      data: {
        function: "0x1::coin::transfer",
        typeArguments: [paymentPayload.token as `${string}::${string}::${string}`],
        functionArguments: [paymentPayload.recipient, paymentPayload.amount]
      }
    });

    // Create a mock signature for demonstration
    // In a real implementation, you would sign the transaction properly
    const mockSignature = `0x${Buffer.from(account.address + Date.now()).toString('hex')}`;

    return {
      rawTransaction: JSON.stringify(transaction),
      signature: mockSignature,
      publicKey: publicKey.toString(),
      address: account.address
    };
  }

  /**
   * Verify account has sufficient balance
   */
  async checkBalance(
    address: string,
    token: string,
    requiredAmount: string
  ): Promise<boolean> {
    try {
      const balance = await this.aptos.getAccountCoinAmount({
        accountAddress: address,
        coinType: token as `${string}::${string}::${string}`
      });
      
      return BigInt(balance) >= BigInt(requiredAmount);
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  }

  /**
   * Get current account balance
   */
  async getBalance(address: string, token: string): Promise<string> {
    try {
      const balance = await this.aptos.getAccountCoinAmount({
        accountAddress: address,
        coinType: token as `${string}::${string}::${string}`
      });
      return balance.toString();
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }

  /**
   * Validate payment payload
   */
  validatePaymentPayload(payload: PaymentPayload): boolean {
    try {
      // Check required fields
      if (!payload.amount || !payload.token || !payload.recipient || !payload.deadline) {
        return false;
      }

      // Check amount is positive
      if (BigInt(payload.amount) <= 0) {
        return false;
      }

      // Check deadline is in the future
      if (payload.deadline <= Date.now()) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

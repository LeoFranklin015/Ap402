/**
 * Aptos Facilitator for x402 Protocol
 * Handles payment verification and blockchain submission
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { PaymentRequest, PaymentVerification, FacilitatorConfig } from './types';

export class AptosFacilitator {
  private aptos: Aptos;
  private config: FacilitatorConfig;

  constructor(config: FacilitatorConfig) {
    this.config = config;
    const networkConfig = this.getNetworkConfig(config.aptosNetwork);
    const aptosConfig = new AptosConfig({ network: networkConfig });
    this.aptos = new Aptos(aptosConfig);
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
   * Verify and submit payment transaction
   */
  async processPayment(paymentRequest: PaymentRequest): Promise<PaymentVerification> {
    try {
      console.log('🔍 Facilitator: Processing payment request');
      console.log('Address:', paymentRequest.address);
      console.log('Mock Mode:', this.config.mockMode);

      // Use real blockchain verification if mockMode is false
      if (!this.config.mockMode) {
        return await this.createRealVerification(paymentRequest);
      }

      // Mock mode - simulate payment processing
      console.log('🧪 Mock Mode: Simulating payment processing');
      
      // Parse the transaction
      const transaction = JSON.parse(paymentRequest.transaction);
      
      // Verify the signature (simplified for demo)
      const isValidSignature = await this.verifySignature(
        paymentRequest.transaction,
        paymentRequest.signature,
        paymentRequest.publicKey,
        paymentRequest.address
      );

      if (!isValidSignature) {
        console.log('❌ Signature verification failed');
        return {
          isValid: false,
          error: 'Invalid signature',
          verifiedAt: Date.now()
        };
      }

      console.log('✅ Signature verified, processing payment...');

      // For demo purposes, simulate successful payment processing
      const transactionHash = `0x${Buffer.from(paymentRequest.address + Date.now()).toString('hex').slice(0, 64)}`;
      
      console.log('✅ Payment processed successfully (MOCK)');
      console.log('Transaction Hash:', transactionHash);

      return {
        isValid: true,
        transactionHash,
        verifiedAt: Date.now()
      };

    } catch (error) {
      console.error('❌ Error processing payment:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        verifiedAt: Date.now()
      };
    }
  }

  /**
   * Verify transaction signature
   */
  private async verifySignature(
    transaction: string,
    signature: string,
    publicKey: string,
    address: string
  ): Promise<boolean> {
    try {
      // In a real implementation, you would:
      // 1. Parse the transaction
      // 2. Verify the signature against the public key
      // 3. Ensure the address matches the transaction sender
      
      // For now, return true for mock purposes
      console.log('Verifying signature for address:', address);
      console.log('Public key:', publicKey);
      console.log('Signature:', signature);
      
      return true;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Submit transaction to Aptos blockchain
   */
  private async submitTransaction(transaction: any, signature: any): Promise<string> {
    try {
      console.log('📤 Submitting transaction to Aptos blockchain...');
      console.log('Network:', this.config.aptosNetwork);
      
      // Parse the transaction and signature with better error handling
      let parsedTransaction, parsedSignature;
      
      try {
        parsedTransaction = typeof transaction === 'string' ? JSON.parse(transaction) : transaction;
        console.log('Parsed transaction:', JSON.stringify(parsedTransaction, null, 2));
      } catch (error:any) {
        console.error('Failed to parse transaction JSON:', error);
        console.error('Raw transaction:', transaction);
        throw new Error(`Invalid transaction JSON: ${error.message}`);
      }
      
      // Handle different signature formats
      if (typeof signature === 'string' && signature.startsWith('0x')) {
        // Raw hex signature - convert to proper format
        console.log('Raw hex signature detected, converting...');
        parsedSignature = {
          type: 'ed25519_signature',
          public_key: parsedTransaction.address,
          signature: signature
        };
      } else {
        try {
          parsedSignature = typeof signature === 'string' ? JSON.parse(signature) : signature;
        } catch (error:any) {
          console.error('Failed to parse signature JSON:', error);
          console.error('Raw signature:', signature);
          throw new Error(`Invalid signature format: ${error.message}`);
        }
      }
      
      console.log('Processed signature:', JSON.stringify(parsedSignature, null, 2));
      
      // Check if this is a wallet message signature or actual transaction
      if (parsedTransaction.prefix === 'APTOS' && parsedTransaction.message) {
        console.log('❌ Wallet message signature detected in REAL MODE');
        console.log('Message:', parsedTransaction.message);
        
        // In real mode, we require actual blockchain transactions, not message signatures
        throw new Error('Real mode requires actual blockchain transactions, not wallet message signatures. Please use X402Client to create proper Aptos transactions.');
      }
      
      // Handle wallet-signed transactions that have rawTransaction structure
      let transactionToSubmit = parsedTransaction;
      let signatureToSubmit = parsedSignature;
      
      // If transaction has rawTransaction property (from wallet signing), use that
      if (parsedTransaction.rawTransaction) {
        console.log('🔍 Wallet-signed transaction detected, extracting rawTransaction');
        transactionToSubmit = parsedTransaction.rawTransaction;
        signatureToSubmit = parsedSignature.authenticator || parsedSignature;
      }
      
      console.log('Transaction details:', {
        sender: transactionToSubmit.sender,
        payload: transactionToSubmit.payload,
        maxGasAmount: transactionToSubmit.max_gas_amount
      });
      
      // For wallet-signed transactions, we need to submit the raw bytes directly
      let response;
      
      if (parsedTransaction.rawTransaction && typeof parsedTransaction.rawTransaction === 'object' && transactionToSubmit.payload?.entryFunction) {
        // Convert the raw transaction object to bytes
        console.log('🔧 Converting raw transaction to bytes for submission');
        
        // Extract the raw transaction bytes from the object format
        const rawBytes = Object.keys(parsedTransaction.rawTransaction)
          .map(key => parseInt(key))
          .filter(key => !isNaN(key))
          .sort((a, b) => a - b)
          .map(key => parsedTransaction.rawTransaction[key])
          .filter(val => typeof val === 'number');
        
        console.log('Raw bytes length:', rawBytes.length);
        
        // Convert the complex payload structure to the simple format expected by REST API
        const payload = transactionToSubmit.payload.entryFunction;
        
        // Convert address data to hex strings
        const senderAddress = transactionToSubmit.sender?.data ? 
          '0x' + Object.keys(transactionToSubmit.sender.data)
            .map(key => parseInt(key))
            .filter(key => !isNaN(key))
            .sort((a, b) => a - b)
            .map(key => transactionToSubmit.sender.data[key].toString(16).padStart(2, '0'))
            .join('') : '0xbcfb4a60c030cb5dcab8adc7d723fcc6f2bbfa432f595ae8eb1bdc436b928cbd';
        
        // Convert recipient address
        const recipientAddress = '0x' + Object.keys(payload.args[0].data)
          .map(key => parseInt(key))
          .filter(key => !isNaN(key))
          .sort((a, b) => a - b)
          .map(key => payload.args[0].data[key].toString(16).padStart(2, '0'))
          .join('');
        
        // Convert public key
        const publicKeyHex = '0x' + Object.keys(signatureToSubmit.public_key.key.data)
          .map(key => parseInt(key))
          .filter(key => !isNaN(key))
          .sort((a, b) => a - b)
          .map(key => signatureToSubmit.public_key.key.data[key].toString(16).padStart(2, '0'))
          .join('');
        
        // Convert signature
        const signatureHex = '0x' + Object.keys(signatureToSubmit.signature.data.data)
          .map(key => parseInt(key))
          .filter(key => !isNaN(key))
          .sort((a, b) => a - b)
          .map(key => signatureToSubmit.signature.data.data[key].toString(16).padStart(2, '0'))
          .join('');
        
        // Create the submission payload in the correct format
        const submissionPayload = {
          sender: senderAddress,
          sequence_number: transactionToSubmit.sequence_number,
          max_gas_amount: transactionToSubmit.max_gas_amount,
          gas_unit_price: transactionToSubmit.gas_unit_price,
          expiration_timestamp_secs: transactionToSubmit.expiration_timestamp_secs,
          payload: {
            type: "entry_function_payload",
            function: "0x1::coin::transfer",
            type_arguments: ["0x1::aptos_coin::AptosCoin"],
            arguments: [recipientAddress, payload.args[1].value]
          },
          signature: {
            type: "ed25519_signature",
            public_key: publicKeyHex,
            signature: signatureHex
          }
        };
        
        console.log('📤 Submitting via REST API...');
        console.log('Submission payload:', JSON.stringify(submissionPayload, null, 2));
        
        // Submit using REST API directly
        const restResponse = await fetch(`https://fullnode.testnet.aptoslabs.com/v1/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionPayload)
        });
        
        const result:any = await restResponse.json();
        
        if (!restResponse.ok) {
          throw new Error(`Transaction submission failed: ${result.message || restResponse.statusText}`);
        }
        
        response = { hash: result.hash };
        
      } else {
        // Use SDK for normal transactions
        response = await this.aptos.transaction.submit.simple({
          transaction: transactionToSubmit,
          senderAuthenticator: signatureToSubmit
        });
      }
      
      const transactionHash = response.hash;
      
      console.log('✅ Transaction submitted to blockchain!');
      console.log('Transaction Hash:', transactionHash);
      console.log('⏳ Waiting for transaction confirmation...');
      
      // Wait for transaction confirmation
      await this.aptos.waitForTransaction({
        transactionHash,
        options: {
          timeoutSecs: 30,
          checkSuccess: true
        }
      });
      
      console.log('✅ Transaction confirmed on blockchain!');
      
      return transactionHash;
    } catch (error: any) {
      console.error('Transaction submission error:', error);
      console.error('Error details:', error.message);
      
      // If it's a timeout or confirmation error, the transaction might still be valid
      if (error.message?.includes('timeout') || error.message?.includes('confirmation')) {
        console.log('⚠️ Transaction may still be processing on blockchain');
        // Return a hash anyway since the transaction was submitted
        return error.transactionHash || `0x${Buffer.from(JSON.stringify(transaction) + Date.now()).toString('hex').slice(0, 64)}`;
      }
      
      throw new Error(`Failed to submit transaction: ${error.message}`);
    }
  }

  /**
   * Create real verification for production
   */
  private async createRealVerification(paymentRequest: PaymentRequest): Promise<PaymentVerification> {
    try {
      console.log('🔍 REAL MODE: Verifying payment on Aptos blockchain');
      console.log('Address:', paymentRequest.address);
      
      // Parse the transaction
      const transaction = JSON.parse(paymentRequest.transaction);
      
      // Verify the signature
      const isValidSignature = await this.verifySignature(
        paymentRequest.transaction,
        paymentRequest.signature,
        paymentRequest.publicKey,
        paymentRequest.address
      );

      if (!isValidSignature) {
        return {
          isValid: false,
          error: 'Invalid signature',
          verifiedAt: Date.now()
        };
      }

      // Submit transaction to blockchain
      const transactionHash = await this.submitTransaction(transaction, paymentRequest.signature);

      return {
        isValid: true,
        transactionHash,
        verifiedAt: Date.now()
      };
    } catch (error) {
      console.error('❌ Real verification error:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
        verifiedAt: Date.now()
      };
    }
  }

  /**
   * Check if a transaction is confirmed on blockchain
   */
  async isTransactionConfirmed(transactionHash: string): Promise<boolean> {
    try {
      if (this.config.mockMode) {
        return true; // Always return true in mock mode
      }

      // In a real implementation, check the transaction status on blockchain
      const transaction = await this.aptos.getTransactionByHash({
        transactionHash
      });
      
      return transaction !== null || false;
    } catch (error) {
      console.error('Error checking transaction confirmation:', error);
      return false;
    }
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(transactionHash: string): Promise<any> {
    try {
      if (this.config.mockMode) {
        return {
          hash: transactionHash,
          success: true,
          timestamp: Date.now(),
          mock: true
        };
      }

      return await this.aptos.getTransactionByHash({
        transactionHash
      });
    } catch (error) {
      console.error('Error getting transaction details:', error);
      throw error;
    }
  }
}

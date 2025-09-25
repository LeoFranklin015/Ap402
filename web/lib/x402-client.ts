/**
 * x402 Protocol Client for Web App
 * Handles 402 Payment Required responses and wallet integration
 */

import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

export interface PaymentDetails {
  recipient: string;
  amount: string;
  nonce: string;
  timestamp: number;
}

export interface X402Payment {
  transaction: string;
  signature: string;
  publicKey: string;
  address: string;
  timestamp: number;
}

export interface X402Response<T = any> {
  data: T;
  payment?: PaymentDetails;
}

// React hook for x402 operations
export function useX402Client() {
  const { account, connected, signTransaction, network } = useWallet();
  
  // Force testnet for testing
  const aptos = new Aptos(new AptosConfig({ 
    network: Network.TESTNET
  }));

  const x402fetch = async <T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T | ArrayBuffer> => {
    if (!connected || !account) {
      throw new Error('Wallet not connected');
    }

    // Debug: Check what methods are available


    try {
      // First attempt - try to get the resource
      const response = await fetch(url, options);
      
      if (response.status === 200) {
        // Success - no payment required
        // Check if response is JSON or binary
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          // Return binary data as ArrayBuffer
          return await response.arrayBuffer();
        }
      }
      
      if (response.status === 402) {
        // Payment required - handle x402 flow
        const responseData = await response.json();
        console.log('💰 402 Response data:', responseData);
        
        // Extract payment details - handle different response structures
        let paymentDetails: PaymentDetails;
        
        if (responseData.payment) {
          // If payment details are nested under 'payment' key
          paymentDetails = responseData.payment;
        } else if (responseData.recipient && responseData.amount) {
          // If payment details are at root level
          paymentDetails = responseData;
        } else {
          // Fallback with default values for testing
          console.warn('Invalid payment details structure, using defaults');
          paymentDetails = {
            recipient: '0x1', // Default recipient (Aptos Foundation address)
            amount: '1000000', // 0.01 APT in octas
            nonce: Date.now().toString(),
            timestamp: Date.now()
          };
        }
        
        console.log('💰 Payment details:', paymentDetails);
        console.log('Recipient:', paymentDetails.recipient);
        console.log('Amount:', paymentDetails.amount);
        
        // Validate and convert amount
        const amount = paymentDetails.amount ? String(paymentDetails.amount) : '1000000';
        const recipient = paymentDetails.recipient || '0x1';
        
        console.log('Final recipient:', recipient);
        console.log('Final amount:', amount);
        console.log('Amount as BigInt:', BigInt(amount));
        
        // Create REAL blockchain transaction instead of message signature
        console.log('📤 Creating real blockchain transaction...');
        
        const transaction = await aptos.transaction.build.simple({
          sender: account.address.toString(),
          data: {
            function: '0x1::coin::transfer',
            typeArguments: ['0x1::aptos_coin::AptosCoin'],
            functionArguments: [recipient, BigInt(amount)]
          }
        });
        
        console.log('✅ Transaction built:', transaction);
        
        // Sign the REAL transaction
        const senderAuthenticator = await signTransaction({
          transactionOrPayload: transaction
        });
        console.log('✅ Transaction signed:', senderAuthenticator);

        // Create payment proof with REAL transaction
        const payment: X402Payment = {
          transaction: JSON.stringify(transaction, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          ),
          signature: JSON.stringify(senderAuthenticator, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          ),
          publicKey: account.publicKey?.toString() || '',
          address: account.address.toString(),
          timestamp: Date.now()
        };
        
        // Retry request with payment
        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'X-Payment': JSON.stringify(payment)
          }
        });
        
        if (retryResponse.status === 200) {
          // Check if response is JSON or binary
          const contentType = retryResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await retryResponse.json();
          } else {
            // Return binary data as ArrayBuffer
            return await retryResponse.arrayBuffer();
          }
        } else {
          throw new Error(`Payment failed: ${retryResponse.status} ${retryResponse.statusText}`);
        }
      }
      
      // Other error status
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      
    } catch (error) {
      console.error('x402fetch error:', error);
      throw error;
    }
  };

  const checkBalance = async (): Promise<bigint> => {
    if (!connected || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await aptos.getAccountCoinAmount({
        accountAddress: account.address,
        coinType: '0x1::aptos_coin::AptosCoin'
      });

      // Safely convert balance to number for display, if possible
      const balanceAPT = Number(balance) / 100_000_000;
      console.log(`💰 Account Balance: ${balance.toString()} octas (${balanceAPT} APT)`);
      return BigInt(balance);
    } catch (error) {
      console.error('❌ Error checking balance:', error);
      return BigInt(0);
    }
  };

  const testEndpoint = async <T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T | ArrayBuffer> => {
    const url = `http://localhost:4021${endpoint}`;
    console.log(`🧪 Testing endpoint: ${url}`);
    
    try {
      const result = await x402fetch<T>(url, options);
      console.log('✅ Endpoint test successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Endpoint test failed:', error);
      throw error;
    }
  };

  return {
    x402fetch,
    checkBalance,
    testEndpoint,
    connected,
    account
  };
}

// Standalone function for easy use
export async function x402Request<T = any>(
  url: string,
  options: RequestInit = {},
  walletAccount: any,
  signMessageFn: any
): Promise<T> {
  try {
    // First attempt - try to get the resource
    const response = await fetch(url, options);
    
    if (response.status === 200) {
      // Success - no payment required
      return await response.json();
    }
    
    if (response.status === 402) {
      // Payment required - handle x402 flow
      const responseData = await response.json();
      console.log('💰 402 Response data:', responseData);
      
      // Extract payment details - handle different response structures
      let paymentDetails: PaymentDetails;
      
      if (responseData.payment) {
        paymentDetails = responseData.payment;
      } else if (responseData.recipient && responseData.amount) {
        paymentDetails = responseData;
      } else {
        // Fallback with default values for testing
        console.warn('Invalid payment details structure, using defaults');
        paymentDetails = {
          recipient: '0x1',
          amount: '1000000',
          nonce: Date.now().toString(),
          timestamp: Date.now()
        };
      }
      
      // Validate and convert amount
      const amount = paymentDetails.amount ? String(paymentDetails.amount) : '1000000';
      const recipient = paymentDetails.recipient || '0x1';
      
      // Create REAL blockchain transaction - force testnet
      const aptos = new Aptos(new AptosConfig({ 
        network: Network.TESTNET,
        fullnode: "https://fullnode.testnet.aptoslabs.com"
      }));
      
      const transaction = await aptos.transaction.build.simple({
        sender: walletAccount.address.toString(),
        data: {
          function: '0x1::coin::transfer',
          typeArguments: ['0x1::aptos_coin::AptosCoin'],
          functionArguments: [recipient, BigInt(amount)]
        }
      });
      
      // Sign the REAL transaction
      const senderAuthenticator = await signMessageFn({
        transactionOrPayload: transaction
      });
      
      console.log('✅ Real transaction signed:', senderAuthenticator);

      // Create payment proof with REAL transaction
      const payment: X402Payment = {
        transaction: JSON.stringify(transaction, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ),
        signature: JSON.stringify(senderAuthenticator, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ),
        publicKey: walletAccount.publicKey?.toString() || '',
        address: walletAccount.address.toString(),
        timestamp: Date.now()
      };
      
      // Retry request with payment
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-Payment': JSON.stringify(payment)
        }
      });
      
      if (retryResponse.status === 200) {
        return await retryResponse.json();
      } else {
        throw new Error(`Payment failed: ${retryResponse.status} ${retryResponse.statusText}`);
      }
    }
    
    // Other error status
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    
  } catch (error) {
    console.error('x402Request error:', error);
    throw error;
  }
}

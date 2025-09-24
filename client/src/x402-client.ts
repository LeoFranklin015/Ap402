/**
 * x402 Protocol Client Implementation for Aptos
 * Handles HTTP requests with payment requirements using Aptos blockchain
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AptosUtils } from './aptos-utils';
import { AptosAccount, X402Response, SignedTransaction, RequestOptions, X402ClientConfig, PaymentVerificationResult } from './types';

export class X402Client {
  private aptosUtils: AptosUtils;
  private account: AptosAccount;
  private config: X402ClientConfig;

  constructor(account: AptosAccount, config: X402ClientConfig) {
    this.account = account;
    this.config = config;
    this.aptosUtils = new AptosUtils(config.aptosNetwork);
  }

  /**
   * Make an HTTP request with x402 payment support
   */
  async request<T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.defaultTimeout || 30000
    } = options;

    const requestConfig: AxiosRequestConfig = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'x402-aptos-client/1.0.0',
        ...headers
      },
      timeout,
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    };

    if (body) {
      requestConfig.data = body;
    }

    try {
      const response = await axios(requestConfig);
      
      // Check if payment is required
      if (response.status === 402) {
        return await this.handlePaymentRequired(response, url, options);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 402) {
        return await this.handlePaymentRequired(error.response, url, options);
      }
      throw error;
    }
  }

  /**
   * Handle 402 Payment Required response
   */
  private async handlePaymentRequired(
    response: AxiosResponse,
    url: string,
    originalOptions: RequestOptions
  ): Promise<any> {
    try {
      const x402Response: X402Response = response.data;
      
      // Validate payment payload
      if (!this.aptosUtils.validatePaymentPayload(x402Response.payment)) {
        throw new Error('Invalid payment payload received from server');
      }

      // Check if payment deadline has passed
      if (x402Response.payment.deadline <= Date.now()) {
        throw new Error('Payment deadline has passed');
      }

      // Check account balance
      const hasBalance = await this.aptosUtils.checkBalance(
        this.account.address,
        x402Response.payment.token,
        x402Response.payment.amount
      );

      if (!hasBalance) {
        throw new Error('Insufficient balance for payment');
      }

      // Create and sign payment transaction
      const signedTransaction = await this.aptosUtils.createPaymentTransaction(
        this.account,
        x402Response.payment
      );

      // Retry request with payment proof
      return await this.retryWithPayment(url, originalOptions, signedTransaction);

    } catch (error) {
      console.error('Error handling payment required:', error);
      throw error;
    }
  }

  /**
   * Retry request with payment proof in X-Payment header
   */
  private async retryWithPayment(
    url: string,
    originalOptions: RequestOptions,
    signedTransaction: SignedTransaction
  ): Promise<any> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.defaultTimeout || 30000
    } = originalOptions;

    const paymentProof = {
      transaction: signedTransaction.rawTransaction,
      signature: signedTransaction.signature,
      publicKey: signedTransaction.publicKey,
      address: signedTransaction.address,
      timestamp: Date.now()
    };

    const requestConfig: AxiosRequestConfig = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'x402-aptos-client/1.0.0',
        'X-Payment': JSON.stringify(paymentProof),
        ...headers
      },
      timeout,
      validateStatus: (status) => status < 500
    };

    if (body) {
      requestConfig.data = body;
    }

    try {
      const response = await axios(requestConfig);
      
      if (response.status === 402) {
        throw new Error('Payment verification failed - server still requires payment');
      }

      if (response.status >= 400) {
        throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Payment retry failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get current account balance for a specific token
   */
  async getBalance(token: string): Promise<string> {
    return await this.aptosUtils.getBalance(this.account.address, token);
  }

  /**
   * Check if account has sufficient balance for payment
   */
  async hasSufficientBalance(token: string, amount: string): Promise<boolean> {
    return await this.aptosUtils.checkBalance(this.account.address, token, amount);
  }

  /**
   * Get account information
   */
  getAccountInfo(): AptosAccount {
    return { ...this.account };
  }

  /**
   * Update account (useful for switching accounts)
   */
  updateAccount(account: AptosAccount): void {
    this.account = account;
  }

  /**
   * Create a new account
   */
  createNewAccount(): AptosAccount {
    const newAccount = this.aptosUtils.createAccount();
    this.account = newAccount;
    return newAccount;
  }

  /**
   * Load account from private key
   */
  loadAccount(privateKeyHex: string): AptosAccount {
    const account = this.aptosUtils.loadAccount(privateKeyHex);
    this.account = account;
    return account;
  }
}


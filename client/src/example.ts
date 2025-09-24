/**
 * Example usage of x402 Aptos Client
 */

import { X402Client, AptosUtils, X402ClientConfig } from './index';

async function example() {
  // Initialize Aptos utilities
  const aptosUtils = new AptosUtils('testnet');
  
  // Create a new account (in production, load from secure storage)
  const account = aptosUtils.createAccount();
  console.log('Created account:', account.address);

  // Configure client
  const config: X402ClientConfig = {
    aptosNetwork: 'testnet',
    defaultTimeout: 30000,
    maxRetries: 3
  };

  // Initialize x402 client
  const client = new X402Client(account, config);

  try {
    // Example 1: Make a simple GET request
    console.log('\n=== Example 1: Simple GET Request ===');
    const response1 = await client.request('https://api.example.com/data');
    console.log('Response:', response1);

    // Example 2: Make a POST request with body
    console.log('\n=== Example 2: POST Request with Body ===');
    const response2 = await client.request('https://api.example.com/process', {
      method: 'POST',
      body: { data: 'test data' }
    });
    console.log('Response:', response2);

    // Example 3: Check account balance
    console.log('\n=== Example 3: Check Balance ===');
    const aptBalance = await client.getBalance('0x1::aptos_coin::AptosCoin');
    console.log('APT Balance:', aptBalance);

    // Example 4: Check if account has sufficient balance
    console.log('\n=== Example 4: Check Sufficient Balance ===');
    const hasBalance = await client.hasSufficientBalance(
      '0x1::aptos_coin::AptosCoin',
      '1000000' // 1 APT in octas
    );
    console.log('Has sufficient balance for 1 APT:', hasBalance);

  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Example with existing private key
async function exampleWithExistingAccount() {
  // In production, load private key from secure environment
  const privateKey = 'your-private-key-hex-here';
  
  const aptosUtils = new AptosUtils('testnet');
  const account = aptosUtils.loadAccount(privateKey);
  
  const config: X402ClientConfig = {
    aptosNetwork: 'testnet'
  };
  
  const client = new X402Client(account, config);
  
  try {
    const response = await client.request('https://api.example.com/protected-resource');
    console.log('Protected resource response:', response);
  } catch (error) {
    console.error('Error accessing protected resource:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  example().catch(console.error);
}

export { example, exampleWithExistingAccount };


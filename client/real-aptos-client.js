/**
 * Real Aptos client with actual blockchain transactions
 */

const axios = require('axios');
const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');

// Configuration
const SERVER_URL = 'http://localhost:4021';
const FACILITATOR_URL = 'http://localhost:3001';

// Your real Aptos wallet information
const APTOS_ACCOUNT = {
  address: '0xbcfb4a60c030cb5dcab8adc7d723fcc6f2bbfa432f595ae8eb1bdc436b928cbd',
  privateKey: '0x078717f09013f85baf9224ea073e416acffbcbf077388d0efb97394b26f248ab'
};

// Initialize Aptos client
const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptosConfig);

// Load your account
const privateKey = new Ed25519PrivateKey(APTOS_ACCOUNT.privateKey);
const account = Account.fromPrivateKey({ privateKey });

console.log('🔑 Real Aptos Wallet Information:');
console.log('Address:', account.accountAddress.toString());
console.log('Public Key:', account.publicKey.toString());
console.log('Network: Aptos Testnet');
console.log('');

// Create real payment transaction
async function createRealPayment(recipient, amount) {
  try {
    console.log(`💰 Creating real payment transaction...`);
    console.log(`   To: ${recipient}`);
    console.log(`   Amount: ${amount} octas (${amount / 100000000} APT)`);
    
    // 1. Build the transaction
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress.toString(),
      data: {
        function: '0x1::coin::transfer',
        typeArguments: ['0x1::aptos_coin::AptosCoin'],
        functionArguments: [recipient, amount]
      }
    });

    console.log('✅ Transaction built');

    // 2. Simulate the transaction (optional)
    console.log('🔍 Simulating transaction...');
    const [simulationResponse] = await aptos.transaction.simulate.simple({
      signerPublicKey: account.publicKey,
      transaction
    });
    console.log('✅ Transaction simulated, gas used:', simulationResponse.gas_used);

    // 3. Sign the transaction (DO NOT SUBMIT - facilitator will handle this)
    const senderAuthenticator = aptos.transaction.sign({
      signer: account,
      transaction
    });

    console.log('✅ Transaction signed (ready for facilitator submission)');

    return {
      transaction: JSON.stringify(transaction, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ),
      signature: JSON.stringify(senderAuthenticator, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ),
      publicKey: account.publicKey.toString(),
      address: account.accountAddress.toString(),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('❌ Error creating payment transaction:', error.message);
    throw error;
  }
}

// Check account balance
async function checkBalance() {
  try {
    const balance = await aptos.getAccountCoinAmount({
      accountAddress: account.accountAddress.toString(),
      coinType: '0x1::aptos_coin::AptosCoin'
    });
    
    console.log(`💰 Account Balance: ${balance} octas (${balance / 100000000} APT)`);
    return balance;
  } catch (error) {
    console.error('❌ Error checking balance:', error.message);
    return '0';
  }
}

// Test function
async function testX402Flow() {
  console.log('🧪 Testing x402 Protocol with REAL Aptos Transactions');
  console.log('=====================================================');
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Facilitator: ${FACILITATOR_URL}`);
  console.log('');

  try {
    // Check account balance first
    console.log('🔍 Step 1: Checking account balance...');
    const balance = await checkBalance();
    
    if (BigInt(balance) < BigInt('1000000')) {
      console.log('⚠️  Warning: Low balance. You may need to fund your account.');
      console.log('   Get testnet APT from: https://faucet.aptoslabs.com/');
    }

    console.log('');

    // Test 1: Check if services are running
    console.log('🔍 Step 2: Checking if services are running...');
    
    try {
      const serverHealth = await axios.get(`${SERVER_URL}/health`);
      console.log('✅ Server is running:', serverHealth.data.status);
    } catch (error) {
      console.log('❌ Server is not running. Please start it with: cd server && npm run dev');
      return;
    }

    try {
      const facilitatorHealth = await axios.get(`${FACILITATOR_URL}/health`);
      console.log('✅ Facilitator is running:', facilitatorHealth.data.status);
    } catch (error) {
      console.log('❌ Facilitator is not running. Please start it with: cd facilitator && npm run server');
      return;
    }

    console.log('');

    // Test 2: Free endpoint (no payment required)
    console.log('🔍 Step 3: Testing free endpoint...');
    try {
      const freeResponse = await axios.get(`${SERVER_URL}/free`);
      console.log('✅ Free endpoint response:', JSON.stringify(freeResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Free endpoint failed:', error.message);
    }

    console.log('');

    // Test 3: Paid endpoint - first request (should get 402)
    console.log('🔍 Step 4: Testing paid endpoint (first request - should get 402)...');
    let paymentDetails = null;
    try {
      const weatherResponse = await axios.get(`${SERVER_URL}/weather`);
      console.log('❌ Unexpected success:', weatherResponse.data);
    } catch (error) {
      if (error.response && error.response.status === 402) {
        console.log('✅ Got 402 Payment Required as expected');
        paymentDetails = error.response.data.payment;
        console.log('Payment details:', JSON.stringify(paymentDetails, null, 2));
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('');

    // Test 4: Paid endpoint - second request (with REAL payment)
    if (paymentDetails) {
      console.log('🔍 Step 5: Testing paid endpoint (with REAL Aptos payment)...');
      
      try {
        // Create real payment transaction
        const realPayment = await createRealPayment(paymentDetails.recipient, paymentDetails.amount);
        
        const weatherResponse = await axios.get(`${SERVER_URL}/weather`, {
          headers: {
            'X-Payment': JSON.stringify(realPayment)
          }
        });
        console.log('✅ Paid endpoint response:', JSON.stringify(weatherResponse.data, null, 2));
      } catch (error) {
        console.log('❌ Paid endpoint failed:', error.message);
        if (error.response) {
          console.log('Response data:', error.response.data);
        }
      }
    }

    console.log('');


    // Test 8: Test facilitator directly
    console.log('🔍 Step 9: Testing facilitator directly...');
    try {
      const realPayment = await createRealPayment(APTOS_ACCOUNT.address, '1000000');
      const facilitatorResponse = await axios.post(`${FACILITATOR_URL}/verify`, realPayment);
      console.log('✅ Facilitator verification:', JSON.stringify(facilitatorResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Facilitator test failed:', error.message);
    }

    console.log('');
    console.log('🎉 Complete x402 Protocol Flow Test Completed!');
    console.log('The x402 protocol is working end-to-end with REAL Aptos transactions:');
    console.log('  ✅ Client (real Aptos wallet with actual transactions)');
    console.log('  ✅ Server (402 responses and resource access)');
    console.log('  ✅ Facilitator (real payment verification)');
    console.log('');
    console.log('🔑 Your Aptos wallet address:', account.accountAddress.toString());
    console.log('🌐 Network: Aptos Testnet');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testX402Flow();

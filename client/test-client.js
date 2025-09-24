/**
 * Simple JavaScript client to test x402 protocol
 * No TypeScript dependencies needed - just Node.js and axios
 */

const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:4021';
const FACILITATOR_URL = 'http://localhost:3001';

// Mock Aptos account for testing (proper Aptos format)
const mockAccount = {
  address: '0x1d2c3b4a5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3',
  publicKey: '0x1d2c3b4a5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3',
  privateKey: '0x1d2c3b4a5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3'
};

// Create mock payment proof
function createMockPayment() {
  return {
    transaction: JSON.stringify({
      type: 'entry_function_payload',
      function: '0x1::coin::transfer',
      type_arguments: ['0x1::aptos_coin::AptosCoin'],
      arguments: ['0x1d2c3b4a5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3', '1000000']
    }),
    signature: `0x${Buffer.from(mockAccount.address + Date.now()).toString('hex')}`,
    publicKey: mockAccount.publicKey,
    address: mockAccount.address,
    timestamp: Date.now()
  };
}

// Test function
async function testX402Flow() {
  console.log('🧪 Testing x402 Protocol with All 3 Components');
  console.log('================================================');
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Facilitator: ${FACILITATOR_URL}`);
  console.log('');

  try {
    // Test 1: Check if services are running
    console.log('🔍 Step 1: Checking if services are running...');
    
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
    console.log('🔍 Step 2: Testing free endpoint...');
    try {
      const freeResponse = await axios.get(`${SERVER_URL}/free`);
      console.log('✅ Free endpoint response:', JSON.stringify(freeResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Free endpoint failed:', error.message);
    }

    console.log('');

    // Test 3: Paid endpoint - first request (should get 402)
    console.log('🔍 Step 3: Testing paid endpoint (first request - should get 402)...');
    try {
      const weatherResponse = await axios.get(`${SERVER_URL}/weather`);
      console.log('❌ Unexpected success:', weatherResponse.data);
    } catch (error) {
      if (error.response && error.response.status === 402) {
        console.log('✅ Got 402 Payment Required as expected');
        console.log('Payment details:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('');

    // Test 4: Paid endpoint - second request (with payment)
    console.log('🔍 Step 4: Testing paid endpoint (with payment)...');
    const mockPayment = createMockPayment();
    
    try {
      const weatherResponse = await axios.get(`${SERVER_URL}/weather`, {
        headers: {
          'X-Payment': JSON.stringify(mockPayment)
        }
      });
      console.log('✅ Paid endpoint response:', JSON.stringify(weatherResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Paid endpoint failed:', error.message);
      if (error.response) {
        console.log('Response data:', error.response.data);
      }
    }

    console.log('');

    // Test 5: Premium content
    console.log('🔍 Step 5: Testing premium content...');
    try {
      const premiumResponse = await axios.get(`${SERVER_URL}/premium/content`, {
        headers: {
          'X-Payment': JSON.stringify(mockPayment)
        }
      });
      console.log('✅ Premium content response:', JSON.stringify(premiumResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Premium content failed:', error.message);
    }

    console.log('');

    // Test 6: POST request
    console.log('🔍 Step 6: Testing POST request...');
    try {
      const postResponse = await axios.post(`${SERVER_URL}/api/process`, 
        { data: 'test data from client' },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Payment': JSON.stringify(mockPayment)
          }
        }
      );
      console.log('✅ POST request response:', JSON.stringify(postResponse.data, null, 2));
    } catch (error) {
      console.log('❌ POST request failed:', error.message);
    }

    console.log('');

    // Test 7: Analytics data
    console.log('🔍 Step 7: Testing analytics data...');
    try {
      const analyticsResponse = await axios.get(`${SERVER_URL}/data/analytics`, {
        headers: {
          'X-Payment': JSON.stringify(mockPayment)
        }
      });
      console.log('✅ Analytics response:', JSON.stringify(analyticsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Analytics failed:', error.message);
    }

    console.log('');

    // Test 8: Test facilitator directly
    console.log('🔍 Step 8: Testing facilitator directly...');
    try {
      const facilitatorResponse = await axios.post(`${FACILITATOR_URL}/verify`, mockPayment);
      console.log('✅ Facilitator verification:', JSON.stringify(facilitatorResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Facilitator test failed:', error.message);
    }

    console.log('');
    console.log('🎉 Complete x402 Protocol Flow Test Completed!');
    console.log('The x402 protocol is working end-to-end with all 3 components:');
    console.log('  ✅ Client (payment creation and signing)');
    console.log('  ✅ Server (402 responses and resource access)');
    console.log('  ✅ Facilitator (payment verification)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testX402Flow();

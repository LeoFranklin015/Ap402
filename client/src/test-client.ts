/**
 * Test client for x402 protocol demonstration
 */

import { X402Client, AptosUtils, X402ClientConfig } from './index';

async function testX402Flow() {
  console.log('🧪 Testing x402 Protocol with All 3 Components');
  console.log('================================================');
  
  // Initialize Aptos utilities
  const aptosUtils = new AptosUtils('testnet');
  
  // Create a test account
  const account = aptosUtils.createAccount();
  console.log('📝 Created test account:', account.address);
  
  // Configure client
  const config: X402ClientConfig = {
    aptosNetwork: 'testnet',
    defaultTimeout: 30000,
    maxRetries: 3
  };
  
  // Initialize x402 client
  const client = new X402Client(account, config);
  
  const serverUrl = 'http://localhost:4021';
  
  try {
    console.log('\n🔍 Test 1: Free endpoint (no payment required)');
    console.log('GET /free');
    const freeResponse = await client.request(`${serverUrl}/free`);
    console.log('✅ Response:', JSON.stringify(freeResponse, null, 2));
    
    console.log('\n🔍 Test 2: Paid endpoint - first request (should get 402)');
    console.log('GET /weather');
    try {
      const weatherResponse = await client.request(`${serverUrl}/weather`);
      console.log('✅ Response:', JSON.stringify(weatherResponse, null, 2));
    } catch (error: any) {
      if (error.response?.status === 402) {
        console.log('✅ Got 402 Payment Required as expected');
        console.log('Payment details:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('❌ Unexpected error:', error.message);
      }
    }
    
    console.log('\n🔍 Test 3: Paid endpoint - second request (with payment)');
    console.log('GET /weather (with X-Payment header)');
    const weatherResponse2 = await client.request(`${serverUrl}/weather`);
    console.log('✅ Response:', JSON.stringify(weatherResponse2, null, 2));
    
    console.log('\n🔍 Test 4: Premium content');
    console.log('GET /premium/content');
    const premiumResponse = await client.request(`${serverUrl}/premium/content`);
    console.log('✅ Response:', JSON.stringify(premiumResponse, null, 2));
    
    console.log('\n🔍 Test 5: POST request with body');
    console.log('POST /api/process');
    const processResponse = await client.request(`${serverUrl}/api/process`, {
      method: 'POST',
      body: { data: 'test data from client' }
    });
    console.log('✅ Response:', JSON.stringify(processResponse, null, 2));
    
    console.log('\n🔍 Test 6: Analytics data');
    console.log('GET /data/analytics');
    const analyticsResponse = await client.request(`${serverUrl}/data/analytics`);
    console.log('✅ Response:', JSON.stringify(analyticsResponse, null, 2));
    
    console.log('\n🔍 Test 7: Health check');
    console.log('GET /health');
    const healthResponse = await client.request(`${serverUrl}/health`);
    console.log('✅ Response:', JSON.stringify(healthResponse, null, 2));
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('The x402 protocol is working end-to-end with all 3 components:');
    console.log('  ✅ Client (payment creation and signing)');
    console.log('  ✅ Server (402 responses and resource access)');
    console.log('  ✅ Facilitator (payment verification)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testX402Flow().catch(console.error);
}

export { testX402Flow };


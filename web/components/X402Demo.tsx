"use client";

import React, { useState } from 'react';
import { useX402Client } from '../lib/x402-client';

const X402Demo: React.FC = () => {
  const { x402fetch, checkBalance, testEndpoint, connected, account } = useX402Client();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('');

  const handleCheckBalance = async () => {
    if (!connected) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const bal = await checkBalance();
      setBalance((Number(bal) / 100000000).toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check balance');
    } finally {
      setLoading(false);
    }
  };

  const handleTestFreeEndpoint = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const data = await testEndpoint('/free');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test free endpoint');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPaidEndpoint = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // First, let's test the 402 response directly
      console.log('Testing paid endpoint...');
      const response = await fetch('http://localhost:4021/weather');
      console.log('Response status:', response.status);
      
      if (response.status === 402) {
        const paymentDetails = await response.json();
        console.log('402 Payment details received:', paymentDetails);
        console.log('Recipient type:', typeof paymentDetails.recipient);
        console.log('Amount type:', typeof paymentDetails.amount);
        console.log('Recipient value:', paymentDetails.recipient);
        console.log('Amount value:', paymentDetails.amount);
      }
      
      const data = await testEndpoint('/weather');
      setResult(data);
    } catch (err) {
      console.error('Error in handleTestPaidEndpoint:', err);
      setError(err instanceof Error ? err.message : 'Failed to test paid endpoint');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomRequest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Example: Custom POST request with x402 support
      const data = await x402fetch('http://localhost:4021/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: 'test' })
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make custom request');
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6 text-center">
        <p className="text-gray-600">Please connect your wallet to use x402 features</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">x402 Protocol Demo</h2>
        
        {/* Account Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Account Information</h3>
          <p className="text-sm text-gray-600">
            Address: {account?.address.toString()}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm">Balance: {balance || 'Unknown'} APT</span>
            <button
              onClick={handleCheckBalance}
              disabled={loading}
              className="px-3 py-1 bg-black text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check Balance'}
            </button>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={handleTestFreeEndpoint}
            disabled={loading}
            className="p-4 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors disabled:opacity-50"
          >
            <h3 className="font-semibold mb-2">Test Free Endpoint</h3>
            <p className="text-sm text-gray-600">GET /free (no payment required)</p>
          </button>

          <button
            onClick={handleTestPaidEndpoint}
            disabled={loading}
            className="p-4 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors disabled:opacity-50"
          >
            <h3 className="font-semibold mb-2">Test Paid Endpoint</h3>
            <p className="text-sm text-gray-600">GET /weather (payment required)</p>
          </button>

          <button
            onClick={handleCustomRequest}
            disabled={loading}
            className="p-4 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors disabled:opacity-50"
          >
            <h3 className="font-semibold mb-2">Custom Request</h3>
            <p className="text-sm text-gray-600">POST /api/data with x402 support</p>
          </button>

          <div className="p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
            <h3 className="font-semibold mb-2">x402 Features</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Automatic 402 handling</li>
              <li>• Wallet integration</li>
              <li>• Transaction signing</li>
              <li>• Payment retry logic</li>
            </ul>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2">Processing...</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-100 border-2 border-red-300 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="p-4 bg-green-100 border-2 border-green-300 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Success!</h3>
            <pre className="text-green-700 text-sm overflow-auto max-h-64">
              {typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}
            </pre>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6">
        <h3 className="font-bold mb-4">How x402 Protocol Works</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <strong>Initial Request:</strong> Client makes a request to a paid resource
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <strong>402 Response:</strong> Server responds with 402 Payment Required and payment details
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
            <div>
              <strong>Payment Creation:</strong> Client creates and signs a blockchain transaction
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
            <div>
              <strong>Retry with Payment:</strong> Client retries the request with payment proof
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">5</span>
            <div>
              <strong>Resource Access:</strong> Server verifies payment and provides the resource
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default X402Demo;

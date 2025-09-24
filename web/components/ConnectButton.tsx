"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletReadyState, AdapterWallet, AdapterNotDetectedWallet } from "@aptos-labs/wallet-adapter-core";
import { Network } from "@aptos-labs/ts-sdk";

type Wallet = AdapterWallet | AdapterNotDetectedWallet;

const ConnectButton: React.FC = () => {
  const { 
    connect, 
    disconnect, 
    account, 
    connected, 
    wallets, 
    notDetectedWallets,
    network,
    changeNetwork 
  } = useWallet();
  
  const [showWalletList, setShowWalletList] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Close modal when wallet connects
  useEffect(() => {
    if (connected) {
      setShowWalletList(false);
    }
  }, [connected]);

  // Set mounted state for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleConnect = async (wallet: Wallet) => {
    try {
      setIsConnecting(true);
      await connect('name' in wallet ? wallet.name : '');
      // Close modal after successful connection
      setShowWalletList(false);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      // Keep modal open on error so user can try again
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getWalletIcon = (wallet: Wallet) => {
    if ('icon' in wallet && wallet.icon) {
      return wallet.icon;
    }
    // Default wallet icon if none provided
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE3IDlWN0MxNyA0Ljc5IDE1LjIxIDMgMTMgM0gxMUM4Ljc5IDMgNyA0Ljc5IDcgN1Y5QzUuMzQgOSA0IDEwLjM0IDQgMTJWMTlDNCAyMC42NiA1LjM0IDIyIDcgMjJIMTdDMTguNjYgMjIgMjAgMjAuNjYgMjAgMTlWMTJDMTkgMTAuMzQgMTcuNjYgOSAxNyA5Wk0xMyA5SDExVjdDMTEgNi40NSAxMS40NSA2IDEyIDZIMTRDMTQuNTUgNiAxNSA2LjQ1IDE1IDdWOVoiIGZpbGw9IiM2MzY2RjEiLz4KPC9zdmc+";
  };

  const isWalletInstalled = (wallet: Wallet) => {
    return 'readyState' in wallet && wallet.readyState === WalletReadyState.Installed;
  };

  const isWalletLoadable = (wallet: Wallet) => {
    return 'readyState' in wallet && wallet.readyState === WalletReadyState.NotDetected;
  };

  const isWalletNotDetected = (wallet: Wallet) => {
    return 'readyState' in wallet && wallet.readyState === WalletReadyState.NotDetected;
  };

  // Get only the first 4 wallets for a cleaner UI
  const allWallets = [...wallets, ...notDetectedWallets].slice(0, 4);

  if (connected && account) {
    return (
      <div className="relative">
        <div className="flex items-center gap-3 bg-black text-white px-6 py-2 rounded-full border-2 border-black hover:bg-gray-800 transition-colors font-medium shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Connected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center">
              <span className="text-xs font-bold">
                {account.address.toString().slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-mono">
              {formatAddress(account.address.toString())}
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="ml-2 p-1 hover:bg-gray-700 rounded-full transition-colors"
            title="Disconnect"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowWalletList(!showWalletList)}
        disabled={isConnecting}
        className="flex items-center gap-2 bg-white border-2 border-black text-black hover:bg-black hover:text-white px-6 py-2 rounded-full font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Connect Wallet</span>
            <svg className="w-4 h-4 transition-transform duration-200" style={{ transform: showWalletList ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <path fill="currentColor" d="M7 10l5 5 5-5z" />
            </svg>
          </>
        )}
      </button>

      {showWalletList && isMounted && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-xl border-2 border-black w-96 max-w-md mx-4 relative z-[10000]" style={{ zIndex: 10000 }}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-black">
                  Choose a Wallet
                </h3>
                <button
                  onClick={() => setShowWalletList(false)}
                  className="text-gray-500 hover:text-black transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            
            {/* Installed Wallets */}
            {allWallets.filter(isWalletInstalled).length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-600 mb-3">
                  Installed Wallets
                </h4>
                <div className="space-y-2">
                  {allWallets.filter(isWalletInstalled).map((wallet) => (
                    <button
                      key={'name' in wallet ? wallet.name : 'unknown'}
                      onClick={() => handleConnect(wallet)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-gray-100 border border-gray-200 rounded-full transition-colors text-left"
                    >
                      <img
                        src={getWalletIcon(wallet)}
                        alt={wallet.name}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          e.currentTarget.src = getWalletIcon(wallet);
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-black">
                          {'name' in wallet ? wallet.name : 'Unknown Wallet'}
                        </div>
                        <div className="text-xs text-green-600">
                          Ready to connect
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loadable Wallets */}
            {allWallets.filter(isWalletLoadable).length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-600 mb-3">
                  Available Wallets
                </h4>
                <div className="space-y-2">
                  {allWallets.filter(isWalletLoadable).map((wallet) => (
                    <button
                      key={'name' in wallet ? wallet.name : 'unknown'}
                      onClick={() => handleConnect(wallet)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-gray-100 border border-gray-200 rounded-full transition-colors text-left"
                    >
                      <img
                        src={getWalletIcon(wallet)}
                        alt={wallet.name}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          e.currentTarget.src = getWalletIcon(wallet);
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-black">
                          {'name' in wallet ? wallet.name : 'Unknown Wallet'}
                        </div>
                        <div className="text-xs text-blue-600">
                          Click to install
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Not Detected Wallets */}
            {allWallets.filter(isWalletNotDetected).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-3">
                  Other Wallets
                </h4>
                <div className="space-y-2">
                  {allWallets.filter(isWalletNotDetected).map((wallet) => (
                    <a
                      key={'name' in wallet ? wallet.name : 'unknown'}
                      href={'url' in wallet ? wallet.url : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-4 p-4 hover:bg-gray-100 border border-gray-200 rounded-full transition-colors text-left"
                    >
                      <img
                        src={getWalletIcon(wallet)}
                        alt={wallet.name}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          e.currentTarget.src = getWalletIcon(wallet);
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-black">
                          {'name' in wallet ? wallet.name : 'Unknown Wallet'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Install wallet
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {allWallets.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No wallets detected</p>
                <p className="text-sm">Please install a compatible wallet</p>
              </div>
            )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ConnectButton;

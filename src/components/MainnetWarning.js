"use client";
import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

export default function MainnetWarning() {
  const [walletNetworkName, setWalletNetworkName] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { connected } = useWallet();

  // Detect if user is on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Detect Aptos wallet network
  useEffect(() => {
    const readNetwork = async () => {
      try {
        if (typeof window !== 'undefined' && window.aptos?.network) {
          const n = await window.aptos.network();
          if (n?.name) {
            const networkName = String(n.name).toLowerCase();
            setWalletNetworkName(networkName);
            // Show warning only on mobile and if connected to mainnet
            setShowWarning(isMobile && connected && networkName === 'mainnet');
          }
        }
      } catch {}
    };

    if (connected) {
      readNetwork();
    }

    const off = window?.aptos?.onNetworkChange?.((n) => {
      try { 
        const networkName = String(n?.name || '').toLowerCase();
        setWalletNetworkName(networkName);
        setShowWarning(isMobile && connected && networkName === 'mainnet');
      } catch {}
    });

    return () => {
      try { off && off(); } catch {}
    };
  }, [connected, isMobile]);

  const switchToTestnet = async () => {
    try {
      if (window?.aptos?.switchNetwork) {
        await window.aptos.switchNetwork('Testnet');
      } else if (window?.aptos?.changeNetwork) {
        await window.aptos.changeNetwork('Testnet');
      } else {
        alert('Please open your Aptos wallet and switch network to Testnet.');
        return;
      }
      setWalletNetworkName('testnet');
      setShowWarning(false);
    } catch (e) {
      console.error('Failed to switch Aptos network:', e);
      alert('Network switch failed. Please switch to Testnet in your wallet.');
    }
  };

  const dismissWarning = () => {
    setShowWarning(false);
  };

  // Only show on mobile and when connected to mainnet
  if (!isMobile || !connected || walletNetworkName !== 'mainnet' || !showWarning) {
    return null;
  }

  return (
    <div className="fixed top-20 left-0 right-0 z-50 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">You are on Mainnet</span>
          </div>
          <p className="text-sm text-orange-100 mt-1">
            Switch to Testnet for better gaming experience
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={switchToTestnet}
            className="px-4 py-2 bg-white text-orange-600 rounded-md font-medium text-sm hover:bg-orange-50 transition-colors"
          >
            Switch to Testnet
          </button>
          <button
            onClick={dismissWarning}
            className="p-2 text-orange-100 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

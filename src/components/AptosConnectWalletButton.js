"use client";
import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletReadyState } from '@aptos-labs/wallet-adapter-base';
import { getAccountBalance, formatAptAmount } from '@/lib/aptos';

export default function AptosConnectWalletButton() {
  const { wallet, connected, disconnect, select, wallets } = useWallet();
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Update balance when wallet connects
  useEffect(() => {
    if (connected && wallet?.account?.address) {
      updateBalance();
    }
  }, [connected, wallet?.account?.address]);

  const updateBalance = async () => {
    if (!wallet?.account?.address) return;
    
    try {
      setLoading(true);
      const balance = await getAccountBalance(wallet.account.address);
      setBalance(formatAptAmount(balance));
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (selectedWallet) => {
    try {
      setLoading(true);
      await select(selectedWallet.name);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setLoading(false);
      setShowDropdown(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setBalance('0');
  };

  const getInstalledWallets = () => {
    return wallets.filter(wallet => wallet.readyState === WalletReadyState.Installed);
  };

  const getAvailableWallets = () => {
    return wallets.filter(wallet => wallet.readyState !== WalletReadyState.Unsupported);
  };

  if (connected) {
    return (
      <div className="relative">
        <div className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 rounded-xl p-0.5 cursor-pointer">
          <div className="bg-[#070005] rounded-xl py-3 px-6 h-full flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-white font-medium text-sm">
                {wallet?.account?.address?.slice(0, 6)}...{wallet?.account?.address?.slice(-4)}
              </span>
              <span className="text-green-400 text-xs">
                {loading ? 'Loading...' : `${balance} APT`}
              </span>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 rounded-xl p-0.5 cursor-pointer">
        <div 
          className="bg-[#070005] rounded-xl py-3 px-6 h-full flex items-center"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <button className="text-white font-medium">
            {loading ? 'Connecting...' : 'Connect Aptos Wallet'}
          </button>
          <svg className="w-4 h-4 ml-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Wallet Dropdown */}
      {showDropdown && (
        <div className="absolute top-full mt-2 right-0 bg-[#1A0015] border border-purple-500/20 rounded-xl shadow-xl z-50 min-w-[200px]">
          <div className="p-2">
            <div className="text-white/70 text-xs px-3 py-2 border-b border-purple-500/20">
              Available Wallets
            </div>
            {getInstalledWallets().map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleConnect(wallet)}
                className="w-full text-left px-3 py-2 text-white hover:bg-purple-500/10 rounded-lg transition-colors flex items-center gap-2"
              >
                <div className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center">
                  <span className="text-xs">🔗</span>
                </div>
                <span className="text-sm">{wallet.name}</span>
              </button>
            ))}
            
            {getInstalledWallets().length === 0 && (
              <div className="px-3 py-4 text-center">
                <div className="text-white/50 text-sm mb-2">No wallets installed</div>
                <div className="text-white/30 text-xs">
                  Install a wallet like Petra or Martian to continue
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
"use client";
import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Tooltip, Fade } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

const BalanceContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '8px 16px',
  background: 'rgba(198, 157, 242, 0.1)',
  borderRadius: '12px',
  border: '1px solid rgba(198, 157, 242, 0.2)',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'rgba(198, 157, 242, 0.15)',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 20px rgba(198, 157, 242, 0.15)',
  },
}));

const TokenContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  position: 'relative',
});

const DevModeBadge = styled(Box)({
  position: 'absolute',
  top: '-12px',
  right: '-12px',
  background: 'rgba(245, 158, 11, 0.8)',
  color: 'white',
  fontSize: '0.6rem',
  padding: '2px 4px',
  borderRadius: '4px',
  fontWeight: 'bold',
});

const TokenBalance = () => {
  const { connected, account } = useWallet();
  const [balances, setBalances] = useState({
    APT: '0',
    APTC: '0',
  });
  const [selectedToken, setSelectedToken] = useState('APT');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    setMounted(true);

    // Don't try to use Aptos wallet in development
    if (isDev) {
      setLoading(false);
      setBalances({
        APT: (Math.random() * 100 + 10).toFixed(4),
        APTC: (Math.random() * 1000 + 100).toFixed(2),
      });
      
      // Set up dev wallet toggle event listener
      const handleDevWalletToggle = () => {
        // Toggle connection state
        setBalances({
          APT: (Math.random() * 100 + 10).toFixed(4),
          APTC: (Math.random() * 1000 + 100).toFixed(2),
        });
      };
      
      window.addEventListener('dev-wallet-toggle', handleDevWalletToggle);
      return () => {
        window.removeEventListener('dev-wallet-toggle', handleDevWalletToggle);
      };
    }

    // Load Aptos wallet data
    const loadWalletData = async () => {
      try {
        if (connected && account) {
          // In a real implementation, you would fetch balances from Aptos blockchain
          // For now, we'll show mock data
          setBalances({
            APT: '25.1234',
            APTC: '500.00',
          });
        } else {
          setBalances({
            APT: '0',
            APTC: '0',
          });
        }
        
        setLoading(false);
      } catch (err) {
        console.warn("Failed to load wallet data:", err);
        setError(true);
        setLoading(false);
        
        // In case of error, show mock balance in development
        if (process.env.NODE_ENV === 'development') {
          setBalances({
            APT: (Math.random() * 100 + 10).toFixed(4),
            APTC: (Math.random() * 1000 + 100).toFixed(2),
          });
        }
      }
    };

    // Try to load the wallet data
    loadWalletData();
  }, [connected, account, isDev]);

  // Toggle between tokens
  const toggleToken = () => {
    setSelectedToken(prev => prev === 'APT' ? 'APTC' : 'APT');
  };

  if (!mounted) {
    return null;
  }
  
  // Not connected, but still show component with message
  if (!connected && !isDev) {
    return (
      <BalanceContainer sx={{ opacity: 0.7 }}>
        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
            color: '#E0E0E0',
            fontWeight: 500,
          }}
        >
          Connect Aptos Wallet
        </Typography>
      </BalanceContainer>
    );
  }

  // Handle error state
  if (error) {
    return (
      <BalanceContainer>
        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
            color: '#E0E0E0',
            fontWeight: 500,
          }}
        >
          {isDev ? `Dev Balance: ${balances.APT} APT` : "Connect Aptos Wallet"}
        </Typography>
      </BalanceContainer>
    );
  }

  return (
    <Tooltip 
      title={`Click to toggle between tokens`} 
      arrow 
      placement="bottom"
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 600 }}
    >
      <BalanceContainer onClick={toggleToken}>
        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
            color: '#E0E0E0',
            mr: 1,
            fontWeight: 500,
          }}
        >
          Balance:
        </Typography>
        {loading ? (
          <CircularProgress size={16} sx={{ color: '#c69df2' }} />
        ) : (
          <TokenContainer>
            {isDev && <DevModeBadge>DEV</DevModeBadge>}
            <Typography
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '1rem',
                fontWeight: 600,
                background: 'linear-gradient(90deg, #c69df2 0%, #a67de0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.01em',
              }}
            >
              {balances[selectedToken]} {selectedToken}
            </Typography>
          </TokenContainer>
        )}
      </BalanceContainer>
    </Tooltip>
  );
};

export default TokenBalance; 
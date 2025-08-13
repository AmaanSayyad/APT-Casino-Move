"use client";

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletStatusProvider } from '@/hooks/useWalletStatus';
import { NotificationProvider } from '@/components/NotificationSystem';
import { ThemeProvider } from 'next-themes';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import '@aptos-labs/wallet-adapter-ant-design/dist/index.css';


const queryClient = new QueryClient();

export default function Providers({ children }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AptosWalletAdapterProvider
      autoConnect={false}
      onError={(error) => {
        console.error("Aptos wallet error:", error);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <WalletStatusProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
              {children}
            </ThemeProvider>
          </WalletStatusProvider>
        </NotificationProvider>
      </QueryClientProvider>
    </AptosWalletAdapterProvider>
  );
}

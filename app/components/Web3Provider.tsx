'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, lightTheme, Locale } from '@rainbow-me/rainbowkit';
import { useLocale } from 'next-intl';

import { config } from '../../lib/wagmi';

const queryClient = new QueryClient();

// 自定义 RainbowKit 主题
const customTheme = lightTheme({
  accentColor: '#007ACC',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

interface Web3ProviderProps {
  children: React.ReactNode;
}

export default function Web3Provider({ children }: Web3ProviderProps) {
  const locale = useLocale();
  
  // 将next-intl的locale映射到RainbowKit支持的locale
  const getRainbowKitLocale = (locale: string): Locale => {
    switch (locale) {
      case 'zh':
        return 'zh-CN';
      case 'ko':
        return 'ko';
      case 'en':
      default:
        return 'en-US';
    }
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={customTheme}
          initialChain={8217} // 默认使用 Kaia 网络
          showRecentTransactions={true}
          locale={getRainbowKitLocale(locale)}
          appInfo={{
            appName: 'Kaiaverse Portal',
            learnMoreUrl: 'https://kaiaverse.com',
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 
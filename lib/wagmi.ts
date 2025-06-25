import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { Chain } from "viem";
import {
  kaiaWallet,
  walletConnectWallet,
  metaMaskWallet,
} from "@rainbow-me/rainbowkit/wallets";

// Kaia 网络配置
export const kaia: Chain = {
  id: 8217,
  name: "Kaia",
  nativeCurrency: {
    decimals: 18,
    name: "KAIA",
    symbol: "KAIA",
  },
  rpcUrls: {
    default: {
      http: ["https://kaia.blockpi.network/v1/rpc/public"],
    },
  },
  blockExplorers: {
    default: {
      name: "Kaiascope",
      url: "https://kaiascope.com",
    },
  },
  testnet: false,
};

// Wagmi 配置
export const config = getDefaultConfig({
  appName: "KaiaLink",
  multiInjectedProviderDiscovery: false,
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "default-project-id",
  chains: [kaia],
  // 只显示支持 Kaia 网络的钱包
  wallets: [
    // 可以根据需要添加特定钱包
    {
      groupName: "Recommended",
      wallets: [kaiaWallet],
    },
    {
      groupName: "Others",
      wallets: [metaMaskWallet, walletConnectWallet],
    },
  ],
});

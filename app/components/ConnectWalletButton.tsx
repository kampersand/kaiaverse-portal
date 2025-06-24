'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTranslations } from 'next-intl';
import { FaWallet } from 'react-icons/fa';

export default function ConnectWalletButton() {
  const t = useTranslations('wallet');

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        // 组件挂载前不渲染
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="bg-lime-400 hover:bg-lime-500 text-black font-semibold py-2.5 px-5 rounded-full transition-all duration-200 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl"
                  >
                    <FaWallet className="w-4 h-4" />
                    {t('connect')}
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-5 rounded-full transition-all duration-200 text-sm shadow-lg"
                  >
                    {t('wrongNetwork')}
                  </button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  type="button"
                  className="bg-lime-400/20 hover:bg-lime-300/30 backdrop-blur-md text-black font-semibold py-2.5 px-4 rounded-full transition-all duration-200 flex items-center gap-3 text-sm hover:shadow-sm border border-lime-300/50 hover:border-lime-300/70"
                >
                  <span className="font-mono text-sm text-gray-800">
                    {account.displayName}
                  </span>
                  <div className="w-2.5 h-2.5 bg-lime-500 rounded-full animate-pulse shadow-sm"></div>
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
} 
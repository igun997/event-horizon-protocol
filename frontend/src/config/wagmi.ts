import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { defineChain } from 'viem';

// Define localhost chain explicitly
export const localhost = defineChain({
  id: 31337,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
});

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo';

export const config = getDefaultConfig({
  appName: 'Talisman Area',
  projectId,
  chains: [localhost],
  transports: {
    [localhost.id]: http('http://127.0.0.1:8545'),
  },
});

export const supportedChains = [localhost] as const;

import { localhost } from './wagmi';

const getEnvAddress = (key: string, fallback: string): `0x${string}` => {
  const value = import.meta.env[key] || fallback;
  return value as `0x${string}`;
};

export const CONTRACT_ADDRESSES = {
  [localhost.id]: {
    TalismanToken: getEnvAddress('VITE_TOKEN_ADDRESS', '0x0000000000000000000000000000000000000000'),
    TalismanGame: getEnvAddress('VITE_GAME_ADDRESS', '0x0000000000000000000000000000000000000000'),
    TalismanAccountFactory: getEnvAddress('VITE_FACTORY_ADDRESS', '0x0000000000000000000000000000000000000000'),
    EntryPoint: getEnvAddress('VITE_ENTRYPOINT_ADDRESS', '0x0000000000000000000000000000000000000000'),
    TalismanPaymaster: getEnvAddress('VITE_PAYMASTER_ADDRESS', '0x0000000000000000000000000000000000000000'),
  },
} as const;

export type ContractName = keyof typeof CONTRACT_ADDRESSES[typeof localhost.id];

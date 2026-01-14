import { useChainId } from 'wagmi';
import { CONTRACT_ADDRESSES, type ContractName } from '../config/contracts';
import { localhost } from '../config/wagmi';

export function useContractAddresses() {
  const chainId = useChainId();

  const getAddress = (name: ContractName): `0x${string}` => {
    const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
    if (!addresses) {
      // Fallback to localhost addresses for development
      return CONTRACT_ADDRESSES[localhost.id][name];
    }
    return addresses[name];
  };

  return {
    tokenAddress: getAddress('TalismanToken'),
    gameAddress: getAddress('TalismanGame'),
    factoryAddress: getAddress('TalismanAccountFactory'),
    getAddress,
  };
}

import { useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useContractAddresses } from './useContractAddresses';
import { TalismanAccountFactoryABI } from '../constants/abis';

export function useSmartAccount() {
  const { address: ownerAddress, isConnected } = useAccount();
  const { factoryAddress } = useContractAddresses();

  // Check if account exists
  const {
    data: hasAccount,
    refetch: refetchHasAccount,
  } = useReadContract({
    address: factoryAddress,
    abi: TalismanAccountFactoryABI,
    functionName: 'hasAccount',
    args: ownerAddress ? [ownerAddress] : undefined,
    query: { enabled: !!ownerAddress },
  });

  // Get account address (works even before creation - counterfactual address)
  const {
    data: accountAddress,
    refetch: refetchAccountAddress,
  } = useReadContract({
    address: factoryAddress,
    abi: TalismanAccountFactoryABI,
    functionName: 'getAddress',
    args: ownerAddress ? [ownerAddress, 0n] : undefined,
    query: { enabled: !!ownerAddress },
  });

  // Get actual deployed account address from mapping
  const { data: deployedAccountAddress } = useReadContract({
    address: factoryAddress,
    abi: TalismanAccountFactoryABI,
    functionName: 'ownerToAccount',
    args: ownerAddress ? [ownerAddress] : undefined,
    query: { enabled: !!ownerAddress && hasAccount },
  });

  // Create account transaction
  const {
    writeContract,
    data: createHash,
    isPending: isCreatePending,
    error: createError,
    reset: resetCreate,
  } = useWriteContract();

  // Wait for create transaction
  const {
    isLoading: isCreateConfirming,
    isSuccess: isCreateSuccess,
  } = useWaitForTransactionReceipt({ hash: createHash });

  // Refetch after account creation
  useEffect(() => {
    if (isCreateSuccess) {
      refetchHasAccount();
      refetchAccountAddress();
    }
  }, [isCreateSuccess, refetchHasAccount, refetchAccountAddress]);

  // Create account function
  const createAccount = () => {
    if (!ownerAddress) return;
    writeContract({
      address: factoryAddress,
      abi: TalismanAccountFactoryABI,
      functionName: 'createAccount',
      args: [ownerAddress, 0n],
    });
  };

  const isCreating = isCreatePending || isCreateConfirming;
  const isAccountReady = !!hasAccount && !!accountAddress;

  // Use deployed address if available, otherwise use counterfactual address
  const smartAccountAddress = deployedAccountAddress || accountAddress;

  return {
    // EOA (signer) address
    ownerAddress,
    // Smart account address
    accountAddress: smartAccountAddress,
    // Whether smart account exists
    hasAccount: !!hasAccount,
    // Whether smart account is ready for use
    isAccountReady,
    // Whether wallet is connected
    isConnected,
    // Create account
    createAccount,
    isCreating,
    isCreateSuccess,
    createError,
    resetCreate,
    // Refetch functions
    refetchHasAccount,
    refetchAccountAddress,
  };
}

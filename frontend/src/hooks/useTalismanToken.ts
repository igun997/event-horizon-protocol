import { useEffect, useCallback, useState } from 'react';
import { useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { encodeFunctionData, type Hex } from 'viem';
import { TalismanTokenABI } from '../constants/abis';
import { useContractAddresses } from './useContractAddresses';
import { useSmartAccount } from './useSmartAccount';
import { useUserOperation } from './useUserOperation';

export function useTalismanToken() {
  const { accountAddress, isAccountReady } = useSmartAccount();
  const { tokenAddress, gameAddress } = useContractAddresses();
  const { executeViaAccount } = useUserOperation();

  // Track approve transaction
  const [approveHash, setApproveHash] = useState<Hex | undefined>();
  const [approveError, setApproveError] = useState<Error | null>(null);
  const [isApprovePending, setIsApprovePending] = useState(false);

  // Read: Balance of smart account
  const {
    data: balance,
    refetch: refetchBalance,
    isLoading: isBalanceLoading,
  } = useReadContract({
    address: tokenAddress,
    abi: TalismanTokenABI,
    functionName: 'balanceOf',
    args: accountAddress ? [accountAddress] : undefined,
    query: { enabled: !!accountAddress },
  });

  // Read: Allowance from smart account to Game contract
  const {
    data: allowance,
    refetch: refetchAllowance,
    isLoading: isAllowanceLoading,
  } = useReadContract({
    address: tokenAddress,
    abi: TalismanTokenABI,
    functionName: 'allowance',
    args: accountAddress ? [accountAddress, gameAddress] : undefined,
    query: { enabled: !!accountAddress },
  });

  // Wait for approve transaction
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Auto-refetch when approve succeeds
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      refetchBalance();
      setIsApprovePending(false);
    }
  }, [isApproveSuccess, refetchAllowance, refetchBalance]);

  // Approve via smart account
  const approveGame = useCallback(async (amount: bigint) => {
    if (!isAccountReady) return;

    setApproveError(null);
    setApproveHash(undefined);
    setIsApprovePending(true);

    try {
      const callData = encodeFunctionData({
        abi: TalismanTokenABI,
        functionName: 'approve',
        args: [gameAddress, amount],
      });

      const hash = await executeViaAccount(tokenAddress, 0n, callData);
      setApproveHash(hash);
    } catch (err) {
      setApproveError(err instanceof Error ? err : new Error('Approve failed'));
      setIsApprovePending(false);
    }
  }, [isAccountReady, tokenAddress, gameAddress, executeViaAccount]);

  // Reset approve state
  const resetApprove = useCallback(() => {
    setApproveError(null);
    setApproveHash(undefined);
    setIsApprovePending(false);
  }, []);

  // Check if approval is needed
  const needsApproval = useCallback((amount: bigint) => {
    if (!allowance) return true;
    return allowance < amount;
  }, [allowance]);

  // Refetch all data
  const refetchAll = useCallback(() => {
    refetchBalance();
    refetchAllowance();
  }, [refetchBalance, refetchAllowance]);

  return {
    // Smart account address (tokens are held here)
    accountAddress,
    // Token data
    balance: balance ?? 0n,
    allowance: allowance ?? 0n,
    // Actions
    approveGame,
    resetApprove,
    // States
    isApproving: isApprovePending || isApproveConfirming,
    isApproveSuccess,
    approveError,
    // Utilities
    needsApproval,
    refetchBalance,
    refetchAllowance,
    refetchAll,
    isLoading: isBalanceLoading || isAllowanceLoading,
  };
}

import { useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { TalismanTokenABI } from '../constants/abis';
import { useContractAddresses } from './useContractAddresses';

export function useTalismanToken() {
  const { address } = useAccount();
  const { tokenAddress, gameAddress } = useContractAddresses();

  // Read: Balance
  const {
    data: balance,
    refetch: refetchBalance,
    isLoading: isBalanceLoading,
  } = useReadContract({
    address: tokenAddress,
    abi: TalismanTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read: Allowance for Game contract
  const {
    data: allowance,
    refetch: refetchAllowance,
    isLoading: isAllowanceLoading,
  } = useReadContract({
    address: tokenAddress,
    abi: TalismanTokenABI,
    functionName: 'allowance',
    args: address ? [address, gameAddress] : undefined,
    query: { enabled: !!address },
  });

  // Write: Approve
  const {
    writeContract: approveWrite,
    data: approveHash,
    isPending: isApproving,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  // Auto-refetch when approve succeeds
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      refetchBalance();
    }
  }, [isApproveSuccess, refetchAllowance, refetchBalance]);

  const approveGame = async (amount: bigint) => {
    resetApprove();
    approveWrite({
      address: tokenAddress,
      abi: TalismanTokenABI,
      functionName: 'approve',
      args: [gameAddress, amount],
    });
  };

  // Check if approval is needed
  const needsApproval = (amount: bigint) => {
    if (!allowance) return true;
    return allowance < amount;
  };

  // Refetch all data
  const refetchAll = () => {
    refetchBalance();
    refetchAllowance();
  };

  return {
    balance: balance ?? 0n,
    allowance: allowance ?? 0n,
    approveGame,
    isApproving: isApproving || isApproveConfirming,
    isApproveSuccess,
    approveError,
    needsApproval,
    refetchBalance,
    refetchAllowance,
    refetchAll,
    isLoading: isBalanceLoading || isAllowanceLoading,
  };
}

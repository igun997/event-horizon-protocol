import { useEffect, useCallback, useState } from 'react';
import { useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { encodeFunctionData, type Hex } from 'viem';
import { TalismanGameABI } from '../constants/abis';
import { useContractAddresses } from './useContractAddresses';
import { useSmartAccount } from './useSmartAccount';
import { useUserOperation } from './useUserOperation';

export interface VestingSchedule {
  totalAmount: bigint;
  claimedAmount: bigint;
  startTime: bigint;
  duration: bigint;
}

export function useGameRewards() {
  const { accountAddress, isAccountReady } = useSmartAccount();
  const { gameAddress } = useContractAddresses();
  const { executeViaAccount } = useUserOperation();

  // Track claim transaction
  const [claimHash, setClaimHash] = useState<Hex | undefined>();
  const [claimError, setClaimError] = useState<Error | null>(null);
  const [isClaimPending, setIsClaimPending] = useState(false);

  // Read: Vesting info (using smart account address)
  const {
    data: vestingInfo,
    refetch: refetchVesting,
    isLoading: isVestingLoading,
  } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'getVestingInfo',
    args: accountAddress ? [accountAddress] : undefined,
    query: { enabled: !!accountAddress },
  });

  // Read: Claimable amount (poll frequently)
  const {
    data: claimableAmount,
    refetch: refetchClaimable,
    isLoading: isClaimableLoading,
  } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'getClaimableAmount',
    args: accountAddress ? [accountAddress] : undefined,
    query: {
      enabled: !!accountAddress,
      refetchInterval: 5000, // Poll every 5 seconds
    },
  });

  // Read: Vesting duration
  const { data: vestingDuration } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'vestingDuration',
  });

  // Wait for claim transaction
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({ hash: claimHash });

  // Auto-refetch when claim succeeds
  useEffect(() => {
    if (isClaimSuccess) {
      refetchVesting();
      refetchClaimable();
      setIsClaimPending(false);
    }
  }, [isClaimSuccess, refetchVesting, refetchClaimable]);

  // Claim rewards via smart account
  const claimRewards = useCallback(async () => {
    if (!isAccountReady) return;

    setClaimError(null);
    setClaimHash(undefined);
    setIsClaimPending(true);

    try {
      const callData = encodeFunctionData({
        abi: TalismanGameABI,
        functionName: 'claimRewards',
      });

      const hash = await executeViaAccount(gameAddress, 0n, callData);
      setClaimHash(hash);
    } catch (err) {
      setClaimError(err instanceof Error ? err : new Error('Claim failed'));
      setIsClaimPending(false);
    }
  }, [isAccountReady, gameAddress, executeViaAccount]);

  // Reset claim state
  const resetClaim = useCallback(() => {
    setClaimError(null);
    setClaimHash(undefined);
    setIsClaimPending(false);
  }, []);

  // Refetch all rewards data
  const refetchAll = useCallback(() => {
    refetchVesting();
    refetchClaimable();
  }, [refetchVesting, refetchClaimable]);

  // Computed values
  const hasClaimable = (claimableAmount ?? 0n) > 0n;

  // Calculate vesting progress
  const vestingProgress = (() => {
    if (!vestingInfo || vestingInfo.totalAmount === 0n) {
      return { percent: 0, vestedAmount: 0n, remainingTime: 0 };
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    const elapsed = now - vestingInfo.startTime;
    const duration = vestingInfo.duration;

    if (elapsed >= duration) {
      return {
        percent: 100,
        vestedAmount: vestingInfo.totalAmount,
        remainingTime: 0,
      };
    }

    const vestedAmount = (vestingInfo.totalAmount * elapsed) / duration;
    const percent = Number((elapsed * 100n) / duration);
    const remainingTime = Number(duration - elapsed);

    return { percent, vestedAmount, remainingTime };
  })();

  return {
    // Smart account address
    accountAddress,
    // Vesting data
    vestingInfo: vestingInfo as VestingSchedule | undefined,
    claimableAmount: claimableAmount ?? 0n,
    vestingDuration: vestingDuration ?? 0n,
    // Actions
    claimRewards,
    resetClaim,
    // States
    isClaiming: isClaimPending || isClaimConfirming,
    isClaimSuccess,
    claimError,
    // Computed
    hasClaimable,
    vestingProgress,
    // Utilities
    refetchVesting,
    refetchClaimable,
    refetchAll,
    isLoading: isVestingLoading || isClaimableLoading,
  };
}

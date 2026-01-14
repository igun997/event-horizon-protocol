import { useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { TalismanGameABI } from '../constants/abis';
import { useContractAddresses } from './useContractAddresses';

export interface VestingSchedule {
  totalAmount: bigint;
  claimedAmount: bigint;
  startTime: bigint;
  duration: bigint;
}

export function useGameRewards() {
  const { address } = useAccount();
  const { gameAddress } = useContractAddresses();

  // Read: Vesting info
  const {
    data: vestingInfo,
    refetch: refetchVesting,
    isLoading: isVestingLoading,
  } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'getVestingInfo',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
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
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000, // Poll every 5 seconds
    },
  });

  // Read: Vesting duration
  const { data: vestingDuration } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'vestingDuration',
  });

  // Write: Claim rewards
  const {
    writeContract: claimWrite,
    data: claimHash,
    isPending: isClaimPending,
    error: claimError,
    reset: resetClaim,
  } = useWriteContract();

  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({
      hash: claimHash,
    });

  // Auto-refetch when claim succeeds
  useEffect(() => {
    if (isClaimSuccess) {
      refetchVesting();
      refetchClaimable();
    }
  }, [isClaimSuccess, refetchVesting, refetchClaimable]);

  const claimRewards = useCallback(async () => {
    resetClaim();
    claimWrite({
      address: gameAddress,
      abi: TalismanGameABI,
      functionName: 'claimRewards',
    });
  }, [gameAddress, claimWrite, resetClaim]);

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
    vestingInfo: vestingInfo as VestingSchedule | undefined,
    claimableAmount: claimableAmount ?? 0n,
    vestingDuration: vestingDuration ?? 0n,
    claimRewards,
    isClaiming: isClaimPending || isClaimConfirming,
    isClaimSuccess,
    claimError,
    hasClaimable,
    vestingProgress,
    refetchVesting,
    refetchClaimable,
    refetchAll,
    isLoading: isVestingLoading || isClaimableLoading,
  };
}

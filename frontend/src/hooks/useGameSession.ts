import { useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { TalismanGameABI } from '../constants/abis';
import { useContractAddresses } from './useContractAddresses';

export interface GameSession {
  startTime: bigint;
  endTime: bigint;
  rewardEarned: bigint;
  talismansCollected: number;
  isActive: boolean;
}

export function useGameSession() {
  const { address } = useAccount();
  const { gameAddress } = useContractAddresses();

  // Read: Current session
  const {
    data: session,
    refetch: refetchSession,
    isLoading: isSessionLoading,
  } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'getSession',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read: Session cost
  const { data: sessionCost } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'sessionCost',
  });

  // Read: Reward rate per second
  const { data: rewardRate } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'rewardRatePerSecond',
  });

  // Read: Min session duration
  const { data: minDuration } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'minSessionDuration',
  });

  // Read: Max session duration
  const { data: maxDuration } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'maxSessionDuration',
  });

  // Read: Attempt count
  const { data: attemptCount, refetch: refetchAttemptCount } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'getAttemptCount',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Write: Start session
  const {
    writeContract: startSessionWrite,
    data: startHash,
    isPending: isStartPending,
    error: startError,
    reset: resetStart,
  } = useWriteContract();

  const { isLoading: isStartConfirming, isSuccess: isStartSuccess } =
    useWaitForTransactionReceipt({
      hash: startHash,
    });

  // Write: End session
  const {
    writeContract: endSessionWrite,
    data: endHash,
    isPending: isEndPending,
    error: endError,
    reset: resetEnd,
  } = useWriteContract();

  const { isLoading: isEndConfirming, isSuccess: isEndSuccess } =
    useWaitForTransactionReceipt({
      hash: endHash,
    });

  // Write: Retry game
  const {
    writeContract: retryGameWrite,
    data: retryHash,
    isPending: isRetryPending,
    error: retryError,
    reset: resetRetry,
  } = useWriteContract();

  const { isLoading: isRetryConfirming, isSuccess: isRetrySuccess } =
    useWaitForTransactionReceipt({
      hash: retryHash,
    });

  // Auto-refetch when start session succeeds
  useEffect(() => {
    if (isStartSuccess) {
      refetchSession();
      refetchAttemptCount();
    }
  }, [isStartSuccess, refetchSession, refetchAttemptCount]);

  // Auto-refetch when end session succeeds
  useEffect(() => {
    if (isEndSuccess) {
      refetchSession();
    }
  }, [isEndSuccess, refetchSession]);

  // Auto-refetch when retry succeeds
  useEffect(() => {
    if (isRetrySuccess) {
      refetchAttemptCount();
    }
  }, [isRetrySuccess, refetchAttemptCount]);

  const startSession = useCallback(async () => {
    resetStart();
    startSessionWrite({
      address: gameAddress,
      abi: TalismanGameABI,
      functionName: 'startSession',
    });
  }, [gameAddress, startSessionWrite, resetStart]);

  const endSession = useCallback(
    async (talismansCollected: number) => {
      resetEnd();
      endSessionWrite({
        address: gameAddress,
        abi: TalismanGameABI,
        functionName: 'endSession',
        args: [BigInt(talismansCollected)],
      });
    },
    [gameAddress, endSessionWrite, resetEnd]
  );

  const retryGame = useCallback(async () => {
    resetRetry();
    retryGameWrite({
      address: gameAddress,
      abi: TalismanGameABI,
      functionName: 'retryGame',
    });
  }, [gameAddress, retryGameWrite, resetRetry]);

  // Derived state
  const isActive = session?.isActive ?? false;
  const startTime = session?.startTime ?? 0n;

  const canEndSession = (() => {
    if (!isActive || !session?.startTime || !minDuration) return false;
    const now = BigInt(Math.floor(Date.now() / 1000));
    return now - session.startTime >= minDuration;
  })();

  return {
    session: session as GameSession | undefined,
    sessionCost: sessionCost ?? 0n,
    rewardRate: rewardRate ?? 0n,
    minDuration: minDuration ?? 0n,
    maxDuration: maxDuration ?? 0n,
    attemptCount: attemptCount ? Number(attemptCount) : 0,
    isActive,
    startTime,
    canEndSession,
    startSession,
    endSession,
    retryGame,
    isStarting: isStartPending || isStartConfirming,
    isEnding: isEndPending || isEndConfirming,
    isRetrying: isRetryPending || isRetryConfirming,
    isStartSuccess,
    isEndSuccess,
    isRetrySuccess,
    startError,
    endError,
    retryError,
    refetchSession,
    isLoading: isSessionLoading,
    resetRetry,
  };
}

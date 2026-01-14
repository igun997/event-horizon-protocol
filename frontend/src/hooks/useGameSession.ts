import { useEffect, useCallback, useState } from 'react';
import { useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { encodeFunctionData, type Hex } from 'viem';
import { TalismanGameABI } from '../constants/abis';
import { useContractAddresses } from './useContractAddresses';
import { useSmartAccount } from './useSmartAccount';
import { useUserOperation } from './useUserOperation';

export interface GameSession {
  startTime: bigint;
  endTime: bigint;
  rewardEarned: bigint;
  talismansCollected: number;
  isActive: boolean;
}

export function useGameSession() {
  const { accountAddress, hasAccount, isAccountReady } = useSmartAccount();
  const { gameAddress } = useContractAddresses();
  const { executeViaAccount, isPending: isUserOpPending, reset: resetUserOp } = useUserOperation();

  // Track transaction hashes for waiting
  const [startHash, setStartHash] = useState<Hex | undefined>();
  const [endHash, setEndHash] = useState<Hex | undefined>();
  const [retryHash, setRetryHash] = useState<Hex | undefined>();

  // Track errors
  const [startError, setStartError] = useState<Error | null>(null);
  const [endError, setEndError] = useState<Error | null>(null);
  const [retryError, setRetryError] = useState<Error | null>(null);

  // Track pending states
  const [isStartPending, setIsStartPending] = useState(false);
  const [isEndPending, setIsEndPending] = useState(false);
  const [isRetryPending, setIsRetryPending] = useState(false);

  // Read: Current session (using smart account address)
  const {
    data: session,
    refetch: refetchSession,
    isLoading: isSessionLoading,
  } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'getSession',
    args: accountAddress ? [accountAddress] : undefined,
    query: { enabled: !!accountAddress },
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

  // Read: Attempt count (using smart account address)
  const { data: attemptCount, refetch: refetchAttemptCount } = useReadContract({
    address: gameAddress,
    abi: TalismanGameABI,
    functionName: 'getAttemptCount',
    args: accountAddress ? [accountAddress] : undefined,
    query: { enabled: !!accountAddress },
  });

  // Wait for transaction receipts
  const { isLoading: isStartConfirming, isSuccess: isStartSuccess } =
    useWaitForTransactionReceipt({ hash: startHash });

  const { isLoading: isEndConfirming, isSuccess: isEndSuccess } =
    useWaitForTransactionReceipt({ hash: endHash });

  const { isLoading: isRetryConfirming, isSuccess: isRetrySuccess } =
    useWaitForTransactionReceipt({ hash: retryHash });

  // Auto-refetch when start session succeeds
  useEffect(() => {
    if (isStartSuccess) {
      refetchSession();
      refetchAttemptCount();
      setIsStartPending(false);
    }
  }, [isStartSuccess, refetchSession, refetchAttemptCount]);

  // Auto-refetch when end session succeeds
  useEffect(() => {
    if (isEndSuccess) {
      refetchSession();
      setIsEndPending(false);
    }
  }, [isEndSuccess, refetchSession]);

  // Auto-refetch when retry succeeds
  useEffect(() => {
    if (isRetrySuccess) {
      refetchAttemptCount();
      setIsRetryPending(false);
    }
  }, [isRetrySuccess, refetchAttemptCount]);

  // Start session via smart account
  const startSession = useCallback(async () => {
    if (!isAccountReady) return;

    setStartError(null);
    setStartHash(undefined);
    setIsStartPending(true);

    try {
      const callData = encodeFunctionData({
        abi: TalismanGameABI,
        functionName: 'startSession',
      });

      const hash = await executeViaAccount(gameAddress, 0n, callData);
      setStartHash(hash);
    } catch (err) {
      setStartError(err instanceof Error ? err : new Error('Start session failed'));
      setIsStartPending(false);
    }
  }, [isAccountReady, gameAddress, executeViaAccount]);

  // End session via smart account
  const endSession = useCallback(async (talismansCollected: number) => {
    if (!isAccountReady) return;

    setEndError(null);
    setEndHash(undefined);
    setIsEndPending(true);

    try {
      const callData = encodeFunctionData({
        abi: TalismanGameABI,
        functionName: 'endSession',
        args: [BigInt(talismansCollected)],
      });

      const hash = await executeViaAccount(gameAddress, 0n, callData);
      setEndHash(hash);
    } catch (err) {
      setEndError(err instanceof Error ? err : new Error('End session failed'));
      setIsEndPending(false);
    }
  }, [isAccountReady, gameAddress, executeViaAccount]);

  // Retry game via smart account
  const retryGame = useCallback(async () => {
    if (!isAccountReady) return;

    setRetryError(null);
    setRetryHash(undefined);
    setIsRetryPending(true);

    try {
      const callData = encodeFunctionData({
        abi: TalismanGameABI,
        functionName: 'retryGame',
      });

      const hash = await executeViaAccount(gameAddress, 0n, callData);
      setRetryHash(hash);
    } catch (err) {
      setRetryError(err instanceof Error ? err : new Error('Retry game failed'));
      setIsRetryPending(false);
    }
  }, [isAccountReady, gameAddress, executeViaAccount]);

  // Reset functions
  const resetStart = useCallback(() => {
    setStartError(null);
    setStartHash(undefined);
    setIsStartPending(false);
  }, []);

  const resetEnd = useCallback(() => {
    setEndError(null);
    setEndHash(undefined);
    setIsEndPending(false);
  }, []);

  const resetRetry = useCallback(() => {
    setRetryError(null);
    setRetryHash(undefined);
    setIsRetryPending(false);
  }, []);

  // Derived state
  const isActive = session?.isActive ?? false;
  const startTime = session?.startTime ?? 0n;

  const canEndSession = (() => {
    if (!isActive || !session?.startTime || !minDuration) return false;
    const now = BigInt(Math.floor(Date.now() / 1000));
    return now - session.startTime >= minDuration;
  })();

  return {
    // Smart account info
    accountAddress,
    hasAccount,
    isAccountReady,
    // Session data
    session: session as GameSession | undefined,
    sessionCost: sessionCost ?? 0n,
    rewardRate: rewardRate ?? 0n,
    minDuration: minDuration ?? 0n,
    maxDuration: maxDuration ?? 0n,
    attemptCount: attemptCount ? Number(attemptCount) : 0,
    isActive,
    startTime,
    canEndSession,
    // Actions
    startSession,
    endSession,
    retryGame,
    // Loading states
    isStarting: isStartPending || isStartConfirming,
    isEnding: isEndPending || isEndConfirming,
    isRetrying: isRetryPending || isRetryConfirming,
    // Success states
    isStartSuccess,
    isEndSuccess,
    isRetrySuccess,
    // Errors
    startError,
    endError,
    retryError,
    // Utilities
    refetchSession,
    isLoading: isSessionLoading,
    resetRetry,
    resetStart,
    resetEnd,
  };
}

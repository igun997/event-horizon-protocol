import { useMemo } from 'react';

export function useRewardCalculator(
  elapsedSeconds: number,
  rewardRatePerSecond: bigint | undefined,
  maxDuration: bigint | undefined
) {
  return useMemo(() => {
    if (!rewardRatePerSecond || rewardRatePerSecond === 0n) return 0n;

    // Cap at max duration
    const maxSeconds = maxDuration ? Number(maxDuration) : Infinity;
    const effectiveElapsed = Math.min(elapsedSeconds, maxSeconds);

    return BigInt(effectiveElapsed) * rewardRatePerSecond;
  }, [elapsedSeconds, rewardRatePerSecond, maxDuration]);
}

import { useEffect } from 'react';
import { useGameRewards, useTalismanToken } from '../../hooks';
import { formatTokenAmount } from '../../utils/format';

export function ClaimButton() {
  const { claimableAmount, claimRewards, isClaiming, hasClaimable, isClaimSuccess } = useGameRewards();
  const { refetchBalance } = useTalismanToken();

  // Refetch token balance after claim succeeds
  useEffect(() => {
    if (isClaimSuccess) {
      refetchBalance();
    }
  }, [isClaimSuccess, refetchBalance]);

  if (!hasClaimable) {
    return (
      <button
        disabled
        className="w-full py-3 bg-gray-700 text-gray-400 font-medium rounded-lg cursor-not-allowed"
      >
        No rewards to claim
      </button>
    );
  }

  return (
    <button
      onClick={() => claimRewards?.()}
      disabled={isClaiming}
      className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all shadow-lg shadow-green-500/20 disabled:shadow-none"
    >
      {isClaiming ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Claiming...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Claim {formatTokenAmount(claimableAmount ?? 0n)} TLSM
        </span>
      )}
    </button>
  );
}

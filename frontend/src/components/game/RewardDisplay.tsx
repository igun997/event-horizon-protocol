import { formatTokenAmount } from '../../utils/format';

interface RewardDisplayProps {
  currentReward: bigint;
  isActive: boolean;
}

export function RewardDisplay({ currentReward, isActive }: RewardDisplayProps) {
  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-4 border border-purple-500/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-purple-300">Current Rewards</span>
        {isActive && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Accumulating
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">
          {formatTokenAmount(currentReward)}
        </span>
        <span className="text-lg text-purple-400">TLSM</span>
      </div>

      {isActive && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Rewards vest over 7 days after session ends</span>
        </div>
      )}
    </div>
  );
}

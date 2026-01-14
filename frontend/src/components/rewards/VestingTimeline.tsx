import type { VestingSchedule } from '../../hooks';
import { formatTokenAmount, formatDate } from '../../utils/format';

interface VestingTimelineProps {
  schedule: VestingSchedule | null;
  vestingDuration: number;
}

export function VestingTimeline({ schedule, vestingDuration }: VestingTimelineProps) {
  if (!schedule || schedule.totalAmount === 0n) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">Vesting Schedule</h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-400">No active vesting schedule</p>
          <p className="text-sm text-gray-500 mt-1">
            Complete a game session to earn rewards
          </p>
        </div>
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(schedule.startTime);
  const endTime = startTime + vestingDuration;
  const elapsed = now - startTime;
  const progress = Math.min((elapsed / vestingDuration) * 100, 100);
  const isComplete = now >= endTime;

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
      <h3 className="text-lg font-semibold text-white mb-4">Vesting Schedule</h3>

      {/* Total amount */}
      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Total Rewards</span>
          <div className="text-right">
            <span className="text-xl font-bold text-white">
              {formatTokenAmount(schedule.totalAmount)}
            </span>
            <span className="text-purple-400 ml-2">TLSM</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Vesting Progress</span>
          <span className={isComplete ? 'text-green-400' : 'text-purple-400'}>
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 rounded-full ${
              isComplete
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline dates */}
      <div className="flex justify-between text-xs text-gray-500">
        <div>
          <p className="text-gray-400">Started</p>
          <p>{formatDate(startTime)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400">Fully Vested</p>
          <p className={isComplete ? 'text-green-400' : ''}>{formatDate(endTime)}</p>
        </div>
      </div>

      {/* Status */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        {isComplete ? (
          <div className="flex items-center gap-2 text-green-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium">Fully vested - ready to claim</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-purple-400">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm">Vesting in progress...</span>
          </div>
        )}
      </div>
    </div>
  );
}

import { formatTime } from '../../hooks';

interface SessionTimerProps {
  elapsed: number;
  minDuration?: number;
  maxDuration?: number;
  isActive: boolean;
}

export function SessionTimer({
  elapsed,
  minDuration = 60,
  maxDuration = 3600,
  isActive,
}: SessionTimerProps) {
  const progress = Math.min((elapsed / maxDuration) * 100, 100);
  const minProgress = (minDuration / maxDuration) * 100;
  const hasReachedMin = elapsed >= minDuration;

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/20">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">Session Time</span>
        <span
          className={`text-2xl font-mono font-bold ${
            isActive ? 'text-purple-400' : 'text-gray-500'
          }`}
        >
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
        {/* Min duration marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/50 z-10"
          style={{ left: `${minProgress}%` }}
        />

        {/* Progress fill */}
        <div
          className={`h-full transition-all duration-1000 rounded-full ${
            hasReachedMin
              ? 'bg-gradient-to-r from-purple-500 to-pink-500'
              : 'bg-gradient-to-r from-gray-500 to-purple-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>0:00</span>
        <span className={hasReachedMin ? 'text-yellow-400' : ''}>
          Min: {formatTime(minDuration)}
        </span>
        <span>Max: {formatTime(maxDuration)}</span>
      </div>

      {/* Status message */}
      {isActive && (
        <div className="mt-3 text-center">
          {!hasReachedMin ? (
            <p className="text-sm text-yellow-400">
              Play for {formatTime(minDuration - elapsed)} more to end session
            </p>
          ) : (
            <p className="text-sm text-green-400">You can end the session now</p>
          )}
        </div>
      )}
    </div>
  );
}

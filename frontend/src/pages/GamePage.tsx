import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Link } from 'react-router-dom';
import { DashGameCanvas, SessionControls } from '../components';
import { ConnectButton } from '../components/wallet/ConnectButton';
import { TokenBalance } from '../components/wallet/TokenBalance';
import {
  useGameSession,
  useGameRewards,
  useSessionTimer,
  useRewardCalculator,
  formatTime,
  useTalismanToken,
} from '../hooks';
import { formatTokenAmount } from '../utils/format';

export function GamePage() {
  const { isConnected } = useAccount();
  const {
    session,
    isActive,
    minDuration,
    maxDuration,
    rewardRate,
    sessionCost,
    retryGame,
    endSession,
    isRetrying,
    isRetrySuccess,
    isEnding,
    resetRetry,
    attemptCount,
  } = useGameSession();
  const { vestingInfo } = useGameRewards();
  const { balance } = useTalismanToken();

  const elapsed = useSessionTimer(session?.startTime, isActive);
  const currentReward = useRewardCalculator(elapsed, rewardRate, maxDuration);

  // Game state
  const [totalTalismans, setTotalTalismans] = useState(0);
  const [currentRunTalismans, setCurrentRunTalismans] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [triggerRestart, setTriggerRestart] = useState(false);
  const [lastDistance, setLastDistance] = useState(0);

  // Reset game state when session ends
  useEffect(() => {
    if (!isActive) {
      setTotalTalismans(0);
      setCurrentRunTalismans(0);
      setIsGameOver(false);
      setLastDistance(0);
    }
  }, [isActive]);

  // Handle game over from canvas
  const handleGameOver = useCallback((distance: number, talismans: number) => {
    setCurrentRunTalismans(talismans);
    setLastDistance(distance);
    setIsGameOver(true);
  }, []);

  // Handle score update (just for tracking)
  const handleScoreUpdate = useCallback((distance: number, talismans: number) => {
    setLastDistance(distance);
    setCurrentRunTalismans(talismans);
  }, []);

  // When retry transaction succeeds, restart the game
  useEffect(() => {
    if (isRetrySuccess) {
      // Add current run's talismans to total before restarting
      setTotalTalismans((prev) => prev + currentRunTalismans);
      setIsGameOver(false);
      setTriggerRestart(true);
      resetRetry();
    }
  }, [isRetrySuccess, currentRunTalismans, resetRetry]);

  // Handle restart complete
  const handleRestartComplete = useCallback(() => {
    setTriggerRestart(false);
    setCurrentRunTalismans(0);
  }, []);

  // Handle retry click
  const handleRetry = useCallback(() => {
    retryGame();
  }, [retryGame]);

  // Handle cash out click
  const handleCashOut = useCallback(() => {
    // Include current run's talismans in the total
    const finalTalismans = totalTalismans + currentRunTalismans;
    endSession(finalTalismans);
  }, [endSession, totalTalismans, currentRunTalismans]);

  // Check if user has enough balance for retry
  const hasEnoughForRetry = balance >= sessionCost;

  // Can end session (min duration met)
  const canEndSession = (() => {
    if (!isActive || !session?.startTime || !minDuration) return false;
    const now = BigInt(Math.floor(Date.now() / 1000));
    return now - session.startTime >= minDuration;
  })();

  // Calculate multiplier preview
  const totalTalismansForBonus = totalTalismans + currentRunTalismans;
  const bonusPercent = Math.min(totalTalismansForBonus * 10, 200);
  const multiplier = (100 + bonusPercent) / 100;

  return (
    <div className="fixed inset-0 bg-gray-900">
      {/* Fullscreen Game Canvas */}
      <DashGameCanvas
        isActive={isActive}
        onScoreUpdate={handleScoreUpdate}
        onGameOver={handleGameOver}
        triggerRestart={triggerRestart}
        onRestartComplete={handleRestartComplete}
      />

      {/* Floating Header */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between p-4">
          {/* Logo */}
          <div className="flex items-center gap-3 bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple-500/30">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">D</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Dash Game</h1>
              <p className="text-xs text-purple-400">Run & Collect</p>
            </div>
          </div>

          {/* Right side - Balance & Connect */}
          <div className="flex items-center gap-3">
            {isConnected && (
              <>
                <Link
                  to="/vesting"
                  className="bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple-500/30 hover:border-purple-400/50 transition-colors"
                >
                  <span className="text-sm text-purple-400">Vesting</span>
                </Link>
                <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple-500/30">
                  <TokenBalance />
                </div>
              </>
            )}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg border border-purple-500/30">
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Progress - Left Side */}
      {isConnected && isActive && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 space-y-3">
          {/* Timer */}
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-3 border border-purple-500/30 min-w-[140px]">
            <p className="text-xs text-gray-400 mb-1">Session Time</p>
            <p className="text-xl font-mono font-bold text-white">{formatTime(elapsed)}</p>
            <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                style={{
                  width: `${Math.min((elapsed / Number(maxDuration ?? 3600)) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {elapsed < Number(minDuration ?? 60) ? (
                <span className="text-yellow-400">Min: {formatTime(Number(minDuration ?? 60) - elapsed)}</span>
              ) : (
                <span className="text-green-400">Can end session</span>
              )}
            </p>
          </div>

          {/* Current Reward */}
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-3 border border-purple-500/30">
            <p className="text-xs text-gray-400 mb-1">Base Reward</p>
            <p className="text-lg font-bold text-purple-400">
              {formatTokenAmount(currentReward)} TLSM
            </p>
            <p className="text-xs text-green-400 mt-1">
              × {multiplier.toFixed(1)} bonus
            </p>
          </div>

          {/* Attempt Count */}
          {attemptCount > 0 && (
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-3 border border-purple-500/30">
              <p className="text-xs text-gray-400 mb-1">Attempts</p>
              <p className="text-lg font-bold text-yellow-400">{attemptCount}</p>
            </div>
          )}

          {/* Total Talismans */}
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-3 border border-purple-500/30">
            <p className="text-xs text-gray-400 mb-1">Total Talismans</p>
            <p className="text-lg font-bold text-yellow-400">★ {totalTalismansForBonus}</p>
          </div>
        </div>
      )}

      {/* Floating Vesting Info - Right Side */}
      {isConnected && vestingInfo && vestingInfo.totalAmount > 0n && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
          <Link
            to="/vesting"
            className="block bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-3 border border-purple-500/30 hover:border-purple-400/50 transition-colors min-w-[140px]"
          >
            <p className="text-xs text-gray-400 mb-1">Vesting Rewards</p>
            <p className="text-lg font-bold text-purple-400">
              {formatTokenAmount(vestingInfo.totalAmount)} TLSM
            </p>
            <p className="text-xs text-purple-300 mt-1">Click to claim →</p>
          </Link>
        </div>
      )}

      {/* Floating Session Controls - Bottom */}
      {isConnected && !isActive && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl border border-purple-500/30">
            <SessionControls />
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {isConnected && isActive && isGameOver && (
        <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center">
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-8 max-w-md w-full mx-4 text-center">
            <h2 className="text-4xl font-bold text-white mb-2">Game Over!</h2>
            <p className="text-gray-400 mb-6">Keep running to earn more rewards</p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Distance</p>
                <p className="text-2xl font-bold text-white">{Math.floor(lastDistance)}m</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Talismans</p>
                <p className="text-2xl font-bold text-yellow-400">★ {currentRunTalismans}</p>
              </div>
            </div>

            {/* Session Summary */}
            <div className="bg-purple-500/10 rounded-lg p-4 mb-6 border border-purple-500/30">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Session Talismans:</span>
                <span className="text-yellow-400 font-bold">★ {totalTalismansForBonus}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Bonus Multiplier:</span>
                <span className="text-green-400 font-bold">{multiplier.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Est. Reward:</span>
                <span className="text-purple-400 font-bold">
                  ~{formatTokenAmount(BigInt(Math.floor(Number(currentReward) * multiplier)))} TLSM
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                disabled={isRetrying || !hasEnoughForRetry}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 rounded-xl font-bold text-lg transition-all"
              >
                {isRetrying ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Processing...
                  </span>
                ) : !hasEnoughForRetry ? (
                  'Insufficient TLSM'
                ) : (
                  `Retry (${formatTokenAmount(sessionCost)} TLSM)`
                )}
              </button>

              <button
                onClick={handleCashOut}
                disabled={isEnding || !canEndSession}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-600 rounded-xl font-bold text-lg transition-all"
              >
                {isEnding ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Processing...
                  </span>
                ) : !canEndSession ? (
                  'Wait for min duration'
                ) : (
                  'Cash Out & Claim Rewards'
                )}
              </button>
            </div>

            {!hasEnoughForRetry && (
              <p className="text-xs text-red-400 mt-4">
                You need {formatTokenAmount(sessionCost)} TLSM to retry
              </p>
            )}
          </div>
        </div>
      )}

      {/* Not Connected Overlay */}
      {!isConnected && (
        <div className="absolute inset-0 z-20 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/30">
              <span className="text-4xl font-bold">D</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">Welcome to Dash Game</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to start playing. Run, jump over obstacles,
              collect talismans and earn TLSM rewards!
            </p>
            <div className="inline-block">
              <ConnectButton />
            </div>

            <div className="grid grid-cols-3 gap-4 mt-12">
              <div className="p-4 bg-gray-800/50 rounded-xl border border-purple-500/20">
                <div className="w-10 h-10 mx-auto mb-3 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <span className="text-lg">1</span>
                </div>
                <h3 className="font-semibold text-sm mb-1">Connect</h3>
                <p className="text-xs text-gray-400">Link your wallet</p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-xl border border-purple-500/20">
                <div className="w-10 h-10 mx-auto mb-3 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <span className="text-lg">2</span>
                </div>
                <h3 className="font-semibold text-sm mb-1">Start</h3>
                <p className="text-xs text-gray-400">Pay TLSM to play</p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-xl border border-purple-500/20">
                <div className="w-10 h-10 mx-auto mb-3 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <span className="text-lg">3</span>
                </div>
                <h3 className="font-semibold text-sm mb-1">Earn</h3>
                <p className="text-xs text-gray-400">Survive & collect</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

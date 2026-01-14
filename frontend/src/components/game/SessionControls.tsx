import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTalismanToken, useGameSession } from '../../hooks';
import { formatTokenAmount } from '../../utils/format';

export function SessionControls() {
  const { isConnected } = useAccount();
  const {
    balance,
    allowance,
    approveGame,
    isApproving,
    isApproveSuccess,
    refetchBalance,
  } = useTalismanToken();
  const {
    isActive,
    sessionCost,
    startSession,
    isStarting,
    isStartSuccess,
  } = useGameSession();

  const [showApproval, setShowApproval] = useState(false);

  const needsApproval = (allowance ?? 0n) < (sessionCost ?? 0n);
  const hasEnoughBalance = (balance ?? 0n) >= (sessionCost ?? 0n);

  // Auto-close approval modal and start session when approval succeeds
  useEffect(() => {
    if (isApproveSuccess && showApproval) {
      setShowApproval(false);
      // Auto-start session after approval
      startSession?.();
    }
  }, [isApproveSuccess, showApproval, startSession]);

  // Refetch balance after starting session
  useEffect(() => {
    if (isStartSuccess) {
      refetchBalance();
    }
  }, [isStartSuccess, refetchBalance]);

  const handleStartClick = () => {
    if (needsApproval) {
      setShowApproval(true);
    } else {
      startSession?.();
    }
  };

  const handleApprove = async () => {
    if (sessionCost) {
      approveGame?.(sessionCost * 10n); // Approve for 10 sessions
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20 text-center">
        <p className="text-gray-400">Connect your wallet to play</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
      {/* Session cost info */}
      <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Session Cost</span>
          <span className="text-lg font-medium text-white">
            {formatTokenAmount(sessionCost ?? 0n)} TLSM
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-400">Your Balance</span>
          <span className="text-sm text-purple-400">
            {formatTokenAmount(balance ?? 0n)} TLSM
          </span>
        </div>
      </div>

      {/* Approval modal */}
      {showApproval && (
        <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <p className="text-sm text-purple-300 mb-3">
            Approve TLSM tokens to start playing. This is a one-time approval.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              {isApproving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Approving...
                </span>
              ) : (
                'Approve'
              )}
            </button>
            <button
              onClick={() => setShowApproval(false)}
              disabled={isApproving}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Start Session Button */}
      {!isActive && (
        <button
          onClick={handleStartClick}
          disabled={isStarting || !hasEnoughBalance || isApproving}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all shadow-lg shadow-purple-500/20 disabled:shadow-none"
        >
          {isStarting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Starting Session...
            </span>
          ) : !hasEnoughBalance ? (
            'Insufficient TLSM Balance'
          ) : needsApproval ? (
            'Approve & Start Session'
          ) : (
            'Start Session'
          )}
        </button>
      )}

      {/* Help text */}
      <p className="mt-3 text-xs text-gray-500 text-center">
        Start a session to begin running. Collect talismans for bonus rewards!
      </p>
    </div>
  );
}

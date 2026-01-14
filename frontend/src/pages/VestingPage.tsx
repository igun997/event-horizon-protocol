import { useAccount } from 'wagmi';
import { Link } from 'react-router-dom';
import {
  Header,
  VestingTimeline,
  ClaimableAmount,
  ClaimButton,
  TokenBalance,
} from '../components';
import { useGameRewards } from '../hooks';

export function VestingPage() {
  const { isConnected } = useAccount();
  const { vestingInfo, claimableAmount, vestingDuration } = useGameRewards();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Header />
        <main className="container mx-auto px-4 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
            <p className="text-gray-400">Connect your wallet to view vesting rewards</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Back to game link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 mb-8 text-purple-400 hover:text-purple-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Game
        </Link>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Vesting Rewards</h1>
            <p className="text-gray-400">Track and claim your earned TLSM tokens</p>
          </div>

          {/* Balance Card */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-sm text-gray-400 mb-2">Your Balance</h3>
            <TokenBalance />
          </div>

          {/* Vesting Timeline */}
          <VestingTimeline
            schedule={vestingInfo ?? null}
            vestingDuration={Number(vestingDuration ?? 604800n)}
          />

          {/* Claimable and Claim Button */}
          {vestingInfo && vestingInfo.totalAmount > 0n && (
            <>
              <ClaimableAmount
                claimable={claimableAmount ?? 0n}
                claimed={vestingInfo.claimedAmount}
                total={vestingInfo.totalAmount}
              />
              <ClaimButton />
            </>
          )}

          {/* No vesting info */}
          {(!vestingInfo || vestingInfo.totalAmount === 0n) && (
            <div className="bg-gray-800/50 rounded-xl p-8 border border-purple-500/20 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No Vesting Rewards Yet</h3>
              <p className="text-gray-400 mb-4">Play the game to earn TLSM rewards!</p>
              <Link
                to="/"
                className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Start Playing
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

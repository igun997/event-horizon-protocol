import { formatTokenAmount } from '../../utils/format';

interface ClaimableAmountProps {
  claimable: bigint;
  claimed: bigint;
  total: bigint;
}

export function ClaimableAmount({ claimable, claimed, total }: ClaimableAmountProps) {
  return (
    <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-6 border border-green-500/20">
      <h3 className="text-lg font-semibold text-white mb-4">Claimable Rewards</h3>

      {/* Main claimable amount */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-green-400">
            {formatTokenAmount(claimable)}
          </span>
          <span className="text-xl text-green-300">TLSM</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">Available to claim now</p>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Already Claimed</span>
          <span className="text-gray-300">{formatTokenAmount(claimed)} TLSM</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Still Vesting</span>
          <span className="text-gray-300">
            {formatTokenAmount(total - claimed - claimable)} TLSM
          </span>
        </div>
        <div className="h-px bg-gray-700" />
        <div className="flex justify-between items-center text-sm font-medium">
          <span className="text-gray-300">Total Earned</span>
          <span className="text-white">{formatTokenAmount(total)} TLSM</span>
        </div>
      </div>
    </div>
  );
}

import { useTalismanToken } from '../../hooks';
import { formatTokenAmount } from '../../utils/format';

export function TokenBalance() {
  const { balance, isLoading } = useTalismanToken();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg">
        <div className="w-6 h-6 bg-purple-500/20 rounded-full animate-pulse" />
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-purple-500/20">
      <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
        <span className="text-xs font-bold text-white">T</span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">
          {formatTokenAmount(balance ?? 0n)} TLSM
        </span>
      </div>
    </div>
  );
}

import { useAccount } from 'wagmi';
import { ConnectButton } from '../wallet/ConnectButton';
import { TokenBalance } from '../wallet/TokenBalance';

export function Header() {
  const { isConnected } = useAccount();

  return (
    <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-purple-500/20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="text-xl font-bold text-white">D</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Dash Game</h1>
              <p className="text-xs text-purple-400">Run & Collect</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {isConnected && <TokenBalance />}
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}

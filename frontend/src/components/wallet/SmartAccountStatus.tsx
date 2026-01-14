import { useState } from 'react';
import { useSmartAccount } from '../../hooks';

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function SmartAccountStatus() {
  const {
    accountAddress,
    hasAccount,
    isConnected,
    createAccount,
    isCreating,
    isCreateSuccess,
    createError,
  } = useSmartAccount();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!accountAddress) return;
    await navigator.clipboard.writeText(accountAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return null;
  }

  // Account not created yet
  if (!hasAccount) {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-yellow-500/30">
        <button
          onClick={createAccount}
          disabled={isCreating}
          className="flex items-center gap-2 text-sm"
        >
          {isCreating ? (
            <>
              <svg className="animate-spin h-4 w-4 text-yellow-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-yellow-400">Creating Account...</span>
            </>
          ) : (
            <>
              <span className="text-yellow-400">Create Smart Account</span>
              <span className="text-xs text-gray-500">(Required)</span>
            </>
          )}
        </button>
        {createError && (
          <p className="text-xs text-red-400 mt-1">{createError.message}</p>
        )}
      </div>
    );
  }

  // Account exists - show address
  return (
    <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-green-500/30">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        <div>
          <p className="text-xs text-gray-400">Smart Account</p>
          <button
            onClick={copyAddress}
            className="text-sm font-mono text-green-400 hover:text-green-300 transition-colors cursor-pointer"
            title="Click to copy address"
          >
            {copied ? 'Copied!' : accountAddress ? shortenAddress(accountAddress) : '...'}
          </button>
        </div>
      </div>
    </div>
  );
}

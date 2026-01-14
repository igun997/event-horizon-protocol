import { HardhatUserConfig, vars } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

/**
 * Hardhat Configuration Variables
 *
 * Set these using: npx hardhat vars set <VAR_NAME>
 *
 * Required for deployment:
 *   DEPLOYER_PRIVATE_KEY - Your deployer wallet private key
 *
 * Required for contract verification:
 *   ETHERSCAN_API_KEY    - For Ethereum mainnet/Sepolia verification
 *   BASESCAN_API_KEY     - For Base mainnet/Sepolia verification
 *
 * Optional:
 *   SEPOLIA_RPC_URL      - Custom Sepolia RPC (default: public endpoint)
 *   BASE_SEPOLIA_RPC_URL - Custom Base Sepolia RPC (default: public endpoint)
 *   MAINNET_RPC_URL      - Custom Ethereum mainnet RPC
 *   BASE_RPC_URL         - Custom Base mainnet RPC
 *   COINMARKETCAP_API_KEY - For USD gas reporting
 */

// Configuration variables with sensible defaults
const PRIVATE_KEY = vars.get('DEPLOYER_PRIVATE_KEY', '');
const ETHERSCAN_API_KEY = vars.get('ETHERSCAN_API_KEY', '');
const BASESCAN_API_KEY = vars.get('BASESCAN_API_KEY', '');

// RPC URLs with public defaults
const SEPOLIA_RPC_URL = vars.get('SEPOLIA_RPC_URL', 'https://rpc.sepolia.org');
const BASE_SEPOLIA_RPC_URL = vars.get('BASE_SEPOLIA_RPC_URL', 'https://sepolia.base.org');
const MAINNET_RPC_URL = vars.get('MAINNET_RPC_URL', 'https://eth.drpc.org');
const BASE_RPC_URL = vars.get('BASE_RPC_URL', 'https://mainnet.base.org');

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    // ============ Local Networks ============
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },

    // ============ Testnets ============
    sepolia: {
      url: SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },

    // ============ Production Networks ============
    mainnet: {
      url: MAINNET_RPC_URL,
      chainId: 1,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    base: {
      url: BASE_RPC_URL,
      chainId: 8453,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  sourcify: {
    enabled: true,
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY,
      base: BASESCAN_API_KEY,
      baseSepolia: BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: 'base',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org',
        },
      },
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 60000,
  },
};

export default config;

# Dash Game

A blockchain-based endless runner game where players run, jump over obstacles, and collect talismans for bonus rewards. Built with ERC-4337 Account Abstraction for gasless gameplay.

## Game Overview

Players pay TLSM tokens to start a game session. Run as far as you can, jump over obstacles, and collect talismans. Collected talismans provide a bonus multiplier to your time-based rewards. Rewards are distributed through a linear vesting schedule.

### How It Works

1. **Start Session** - Pay 10 TLSM to begin a game session
2. **Play Game** - Run, jump obstacles, collect talismans (10% bonus each, max 200%)
3. **Retry or Cash Out** - When you crash, retry for another 10 TLSM or end the session
4. **End Session** - Stop playing and lock in your rewards (min 1 minute, max 1 hour)
5. **Vesting** - Rewards vest linearly over 7 days
6. **Claim** - Withdraw vested rewards anytime

### Controls

- **Space** or **Tap** - Jump over obstacles

## Smart Contracts

| Contract | Description |
|----------|-------------|
| `TalismanToken` | ERC-20 TLSM token for payments and rewards |
| `TalismanGame` | Core game logic: sessions, rewards, vesting |
| `TalismanAccount` | ERC-4337 smart wallet for players |
| `TalismanAccountFactory` | Creates player smart accounts |
| `TalismanPaymaster` | Sponsors gas for game transactions |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ERC-4337 Layer                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ EntryPoint  │  │   Paymaster  │  │  Account Factory  │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
│         │                │                    │             │
│         ▼                ▼                    ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              TalismanAccount (Smart Wallet)          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Game Layer                            │
│  ┌─────────────────┐          ┌─────────────────────────┐  │
│  │  TalismanToken  │◄────────►│     TalismanGame        │  │
│  │     (TLSM)      │          │  - Sessions             │  │
│  └─────────────────┘          │  - Rewards              │  │
│                               │  - Vesting              │  │
│                               └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| Session Cost | 10 TLSM | Cost to start a game |
| Reward Rate | ~1 TLSM/min | Tokens earned per minute |
| Min Session | 1 minute | Minimum play time |
| Max Session | 1 hour | Maximum play time (rewards capped) |
| Vesting Period | 7 days | Linear unlock duration |

## Installation

```bash
# Install dependencies
bun install

# Compile contracts
bun run compile

# Run tests
bun run test

# Run with coverage
bun run test:coverage
```

## Quick Start (Local Development)

Follow these steps to run the game locally:

### 1. Start Local Blockchain

```bash
# Terminal 1 - Start Hardhat node
bun run node
```

### 2. Deploy Contracts

```bash
# Terminal 2 - Deploy to local network
bun run deploy:local
```

Note the deployed contract addresses from the output.

### 3. Configure Frontend

```bash
cd frontend

# Copy environment template
cp .env.example .env

# Edit .env with your deployed contract addresses
# VITE_TOKEN_ADDRESS=0x...
# VITE_GAME_ADDRESS=0x...
# VITE_FACTORY_ADDRESS=0x...
```

### 4. Mint Test Tokens

```bash
# From project root
RECIPIENT=your_wallet_address AMOUNT=10000 npx hardhat run scripts/mint-tokens.ts --network localhost
```

### 5. Start Frontend

```bash
cd frontend
bun install
bun run dev
```

Open http://localhost:5173 in your browser.

### 6. Connect Wallet

- Import a Hardhat test account to MetaMask (private keys shown when running `bun run node`)
- Connect to localhost:8545 network

## Deployment

### Setting Variables

```bash
# Required for deployment to testnet/mainnet
bunx hardhat vars set DEPLOYER_PRIVATE_KEY

# Required for contract verification
bunx hardhat vars set ETHERSCAN_API_KEY     # For Ethereum networks
bunx hardhat vars set BASESCAN_API_KEY      # For Base networks
```

### Deploy Commands

```bash
# Local development
bun run node              # Start local node
bun run deploy:local      # Deploy to local

# Testnets
bun run deploy:sepolia        # Ethereum Sepolia
bun run deploy:base-sepolia   # Base Sepolia

# Mainnet
bun run deploy:mainnet    # Ethereum Mainnet
bun run deploy:base       # Base Mainnet
```

## Usage

### For Players

```solidity
// 1. Approve tokens
tlsmToken.approve(gameAddress, amount);

// 2. Start session
talismanGame.startSession();

// 3. Play the game...

// 4. End session (after minimum duration)
talismanGame.endSession();

// 5. Wait for vesting, then claim
talismanGame.claimRewards();
```

### For Gasless Transactions (ERC-4337)

Players can use smart accounts for gasless gameplay:

```solidity
// Create smart account
factory.createAccount(playerAddress, 0);

// Execute game actions through smart account
account.execute(gameAddress, 0, abi.encodeCall(ITalismanGame.startSession));
```

## Testing

```bash
# Run all tests
bun run test

# Run with gas reporting
bun run test:gas

# Run with coverage
bun run test:coverage
```

### Test Coverage

- Token: minting, transfers, burning
- Game: sessions, rewards, vesting, admin functions
- Account: creation, execution, batch calls
- Paymaster: deposits, limits, configuration
- Integration: complete user flows

## Project Structure

```
contracts/
├── interfaces/
│   ├── IEntryPoint.sol
│   ├── ITalismanAccount.sol
│   └── ITalismanGame.sol
├── token/
│   └── TalismanToken.sol
├── account-abstraction/
│   ├── TalismanAccount.sol
│   ├── TalismanAccountFactory.sol
│   └── TalismanPaymaster.sol
├── game/
│   └── TalismanGame.sol
└── mocks/
    └── MockEntryPoint.sol

test/
├── TalismanToken.test.ts
├── TalismanGame.test.ts
├── TalismanAccount.test.ts
├── TalismanPaymaster.test.ts
└── integration/
    └── FullFlow.test.ts

frontend/
├── src/
│   ├── components/
│   │   ├── game/           # Game canvas & session controls
│   │   ├── layout/         # Header, Footer
│   │   ├── vesting/        # Vesting UI components
│   │   └── wallet/         # Connect button, token balance
│   ├── config/             # Wagmi & contract configuration
│   ├── constants/          # ABIs, game constants
│   ├── hooks/              # React hooks for contracts
│   ├── pages/              # GamePage, VestingPage
│   └── utils/              # Canvas drawing, formatting
├── .env.example            # Environment template
└── package.json
```

## Security Features

- **ReentrancyGuard** - Prevents reentrancy attacks
- **Pausable** - Emergency stop mechanism
- **SafeERC20** - Safe token transfers
- **Checks-Effects-Interactions** - Proper state management
- **Reward Pool Validation** - Ensures sufficient rewards before sessions

## Admin Functions

```solidity
// Game configuration
game.setSessionCost(newCost);
game.setRewardRate(newRate);
game.setVestingDuration(newDuration);
game.setMaxSessionDuration(newMax);

// Reward pool management
game.depositRewardPool(amount);
game.withdrawRewardPool(amount);

// Emergency controls
game.pause();
game.unpause();
```

## Networks

| Network | Chain ID | Type |
|---------|----------|------|
| Hardhat | 31337 | Development |
| Sepolia | 11155111 | Testnet |
| Base Sepolia | 84532 | Testnet |
| Ethereum | 1 | Mainnet |
| Base | 8453 | Mainnet |

## Available Scripts

### Smart Contracts (root)

| Script | Description |
|--------|-------------|
| `bun run compile` | Compile contracts |
| `bun run test` | Run tests |
| `bun run test:coverage` | Run tests with coverage |
| `bun run test:gas` | Run tests with gas reporting |
| `bun run node` | Start local Hardhat node |
| `bun run deploy:local` | Deploy to localhost |
| `bun run deploy:sepolia` | Deploy to Sepolia |
| `bun run deploy:base-sepolia` | Deploy to Base Sepolia |
| `bun run deploy:mainnet` | Deploy to Ethereum mainnet |
| `bun run deploy:base` | Deploy to Base mainnet |
| `bun run clean` | Clean build artifacts |

### Frontend (frontend/)

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run lint` | Run ESLint |
| `bun run preview` | Preview production build |

## Environment Variables

### Frontend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_TOKEN_ADDRESS` | TalismanToken contract address | `0xA51c...` |
| `VITE_GAME_ADDRESS` | TalismanGame contract address | `0x0B30...` |
| `VITE_FACTORY_ADDRESS` | TalismanAccountFactory address | `0x9A67...` |
| `VITE_ENTRYPOINT_ADDRESS` | MockEntryPoint address (ERC-4337) | `0x5FbD...` |
| `VITE_PAYMASTER_ADDRESS` | TalismanPaymaster address | `0xe7f1...` |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | (from cloud.walletconnect.com) |
| `VITE_LOCALHOST_RPC_URL` | Local RPC URL | `http://127.0.0.1:8545` |

### ERC-4337 Flow

1. User connects wallet (EOA)
2. Create smart account via TalismanAccountFactory
3. Mint tokens to smart account address
4. Game transactions go through smart account as UserOperations
5. Paymaster sponsors gas for game transactions

## Tech Stack

- **Smart Contracts**: Solidity, Hardhat, OpenZeppelin
- **Account Abstraction**: ERC-4337
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Web3**: wagmi, viem, RainbowKit
- **Canvas**: HTML5 Canvas for game rendering

## License

MIT

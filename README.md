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

### 4. Start Frontend

```bash
cd frontend
bun install
bun run dev
```

Open http://localhost:5173 in your browser.

### 5. Connect Wallet & Create Smart Account

1. Import a Hardhat test account to MetaMask (private keys shown when running `bun run node`)
2. Connect to localhost:8545 network
3. Click "Create Smart Account" in the UI (one-time setup)
4. Click the smart account address to copy it

### 6. Mint Test Tokens to Smart Account

```bash
# From project root - use your smart account address (NOT your EOA wallet address)
RECIPIENT=<smart_account_address> AMOUNT=10000 bun run hardhat run scripts/mint-tokens.ts --network localhost
```

**Important:** Tokens must be minted to your smart account address, not your EOA wallet. The smart account is what interacts with the game contracts.

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

## Roadmap

### Phase 1: Production ERC-4337

Current implementation uses MockEntryPoint for local development. Production deployment requires:

| Task | Description | Status |
|------|-------------|--------|
| Canonical EntryPoint | Use official ERC-4337 EntryPoint (v0.7: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`) | Planned |
| Bundler Integration | Integrate with bundler services (Pimlico, Alchemy, Stackup) or run self-hosted | Planned |
| Paymaster Verification | Add proper UserOp validation in TalismanPaymaster | Planned |
| Gas Estimation | Implement proper gas estimation for UserOperations | Planned |

### Phase 2: Multi-Chain Deployment

Deploy to multiple EVM chains with isolated instances:

| Chain | Type | EntryPoint Support |
|-------|------|-------------------|
| Ethereum | Mainnet | Yes |
| Base | L2 | Yes |
| Arbitrum | L2 | Yes |
| Optimism | L2 | Yes |
| Polygon | Sidechain | Yes |

### Phase 3: Cross-Chain Integration

Enable seamless cross-chain gameplay and token transfers:

```
┌─────────────┐     LayerZero/CCIP      ┌─────────────┐
│  Chain A    │◄────────────────────────►│  Chain B    │
│             │                          │             │
│ TalismanOFT │    Token Bridge          │ TalismanOFT │
│ TalismanGame│    Message Passing       │ TalismanGame│
└─────────────┘                          └─────────────┘
```

#### 3.1 Omnichain Token (LayerZero OFT)

Convert TLSM to an Omnichain Fungible Token:

```solidity
// TalismanOFT.sol - LayerZero OFT implementation
contract TalismanOFT is OFT {
    constructor(
        address _lzEndpoint,
        address _delegate
    ) OFT("Talisman", "TLSM", _lzEndpoint, _delegate) {}
}
```

**Benefits:**
- Native token transfers between chains
- No wrapped tokens or liquidity pools needed
- Unified token supply across all chains

#### 3.2 Cross-Chain Messaging

Sync game state and leaderboards across chains:

| Feature | Protocol | Description |
|---------|----------|-------------|
| Leaderboard Sync | Chainlink CCIP | Aggregate scores across chains |
| Achievement NFTs | LayerZero ONFT | Cross-chain achievement badges |
| Tournament System | Hyperlane | Multi-chain tournaments |

#### 3.3 Chain Abstraction

Ultimate goal - players don't need to know which chain they're on:

- **Unified Balance**: Show total TLSM across all chains
- **Auto-Bridge**: Automatically bridge tokens when needed
- **Best Chain Selection**: Route transactions to cheapest/fastest chain
- **Single Smart Account**: One account address across all chains (CREATE2)

### Phase 4: Advanced Features

| Feature | Description |
|---------|-------------|
| Session Keys | Temporary keys for gameplay without signing each tx |
| Social Recovery | Recover smart account via trusted contacts |
| Batch Transactions | Combine approve + start session in one tx |
| Gasless Onboarding | Sponsor first smart account creation |
| Mobile App | React Native with WalletConnect |
| Multiplayer Mode | Real-time competitive gameplay |
| NFT Rewards | Achievement-based NFT minting |

### Implementation Priority

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
   │           │           │           │
   ▼           ▼           ▼           ▼
Production  Multi-Chain  Cross-Chain  Advanced
ERC-4337    Deployment   Integration  Features
```

## License

MIT

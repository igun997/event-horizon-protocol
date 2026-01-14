import { ethers, network } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying Talisman Game contracts with account:', deployer.address);
  console.log('Network:', network.name);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH');

  // ============ 1. Deploy TalismanToken ============
  console.log('\n1. Deploying TalismanToken...');
  const initialSupply = ethers.parseEther('1000000'); // 1 million TLSM
  const TalismanToken = await ethers.getContractFactory('TalismanToken');
  const token = await TalismanToken.deploy(deployer.address, initialSupply);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log('TalismanToken deployed to:', tokenAddress);

  // ============ 2. Deploy Mock EntryPoint (for testing) ============
  console.log('\n2. Deploying MockEntryPoint...');
  const MockEntryPoint = await ethers.getContractFactory('MockEntryPoint');
  const entryPoint = await MockEntryPoint.deploy();
  await entryPoint.waitForDeployment();
  const entryPointAddress = await entryPoint.getAddress();
  console.log('MockEntryPoint deployed to:', entryPointAddress);

  // ============ 3. Deploy TalismanAccountFactory ============
  console.log('\n3. Deploying TalismanAccountFactory...');
  const TalismanAccountFactory = await ethers.getContractFactory('TalismanAccountFactory');
  const factory = await TalismanAccountFactory.deploy(entryPointAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log('TalismanAccountFactory deployed to:', factoryAddress);

  // ============ 4. Deploy TalismanGame ============
  console.log('\n4. Deploying TalismanGame...');
  const TalismanGame = await ethers.getContractFactory('TalismanGame');
  const game = await TalismanGame.deploy(tokenAddress, deployer.address);
  await game.waitForDeployment();
  const gameAddress = await game.getAddress();
  console.log('TalismanGame deployed to:', gameAddress);

  // ============ 5. Deploy TalismanPaymaster ============
  console.log('\n5. Deploying TalismanPaymaster...');
  const TalismanPaymaster = await ethers.getContractFactory('TalismanPaymaster');
  const paymaster = await TalismanPaymaster.deploy(entryPointAddress, deployer.address);
  await paymaster.waitForDeployment();
  const paymasterAddress = await paymaster.getAddress();
  console.log('TalismanPaymaster deployed to:', paymasterAddress);

  // ============ 6. Configure Contracts ============
  console.log('\n6. Configuring contracts...');

  // Set game contract in paymaster
  await paymaster.setGameContract(gameAddress);
  console.log('Paymaster: game contract set');

  // Transfer tokens to game for reward pool
  const rewardPoolAmount = ethers.parseEther('100000'); // 100k TLSM
  await token.transfer(gameAddress, rewardPoolAmount);
  console.log('Game: reward pool funded with', ethers.formatEther(rewardPoolAmount), 'TLSM');

  // Deposit ETH to paymaster for gas sponsorship
  if (network.name === 'hardhat' || network.name === 'localhost') {
    const paymasterDeposit = ethers.parseEther('1');
    await paymaster.deposit({ value: paymasterDeposit });
    console.log('Paymaster: deposited', ethers.formatEther(paymasterDeposit), 'ETH for gas');
  }

  // ============ Summary ============
  console.log('\n========================================');
  console.log('Deployment Summary');
  console.log('========================================');
  console.log('TalismanToken:', tokenAddress);
  console.log('MockEntryPoint:', entryPointAddress);
  console.log('TalismanAccountFactory:', factoryAddress);
  console.log('TalismanGame:', gameAddress);
  console.log('TalismanPaymaster:', paymasterAddress);
  console.log('========================================');

  // Wait for block confirmations on non-local networks
  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    console.log('\nWaiting for block confirmations...');
    await token.deploymentTransaction()?.wait(5);
    console.log('Confirmed!');

    console.log('\nTo verify contracts, run:');
    console.log(`npx hardhat verify --network ${network.name} ${tokenAddress} ${deployer.address} ${initialSupply}`);
    console.log(`npx hardhat verify --network ${network.name} ${gameAddress} ${tokenAddress} ${deployer.address}`);
    console.log(`npx hardhat verify --network ${network.name} ${paymasterAddress} ${entryPointAddress} ${deployer.address}`);
  }

  console.log('\nDeployment complete!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

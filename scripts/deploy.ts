import { ethers, network } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with account:', deployer.address);
  console.log('Network:', network.name);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH');

  // Deploy Lock contract with 1 year unlock time
  const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
  const unlockTime = Math.floor(Date.now() / 1000) + ONE_YEAR_IN_SECS;
  const lockedAmount = ethers.parseEther('0.001');

  console.log('\nDeploying Lock contract...');
  console.log('Unlock time:', new Date(unlockTime * 1000).toISOString());
  console.log('Locked amount:', ethers.formatEther(lockedAmount), 'ETH');

  const Lock = await ethers.getContractFactory('Lock');
  const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

  await lock.waitForDeployment();

  const address = await lock.getAddress();
  console.log('\nLock deployed to:', address);

  // Wait for block confirmations on non-local networks
  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    console.log('Waiting for block confirmations...');
    await lock.deploymentTransaction()?.wait(5);
    console.log('Confirmed!');

    console.log('\nTo verify the contract, run:');
    console.log(`npx hardhat verify --network ${network.name} ${address} ${unlockTime}`);
  }

  console.log('\nDeployment complete!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { ethers } from 'hardhat';

async function main() {
  const recipient = process.env.RECIPIENT || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Account #1 by default
  const amount = ethers.parseEther(process.env.AMOUNT || '10000'); // 10,000 TLSM by default

  const tokenAddress = '0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9';

  console.log('Minting tokens...');
  console.log('Token:', tokenAddress);
  console.log('Recipient:', recipient);
  console.log('Amount:', ethers.formatEther(amount), 'TLSM');

  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt('TalismanToken', tokenAddress);

  // Transfer from deployer (who has all initial supply)
  const tx = await token.transfer(recipient, amount);
  await tx.wait();

  const balance = await token.balanceOf(recipient);
  console.log('\nSuccess! New balance:', ethers.formatEther(balance), 'TLSM');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

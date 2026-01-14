import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { MockEntryPoint, TalismanAccount, TalismanAccountFactory } from '../typechain-types';

describe('TalismanAccount', function () {
  async function deployAccountFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock EntryPoint
    const MockEntryPoint = await ethers.getContractFactory('MockEntryPoint');
    const entryPoint = await MockEntryPoint.deploy();

    // Deploy factory
    const TalismanAccountFactory = await ethers.getContractFactory('TalismanAccountFactory');
    const factory = await TalismanAccountFactory.deploy(await entryPoint.getAddress());

    return { entryPoint, factory, owner, user1, user2 };
  }

  describe('Factory', function () {
    it('Should create account for owner', async function () {
      const { factory, user1 } = await loadFixture(deployAccountFixture);

      const tx = await factory.createAccount(user1.address, 0);
      await tx.wait();

      expect(await factory.hasAccount(user1.address)).to.be.true;
    });

    it('Should return existing account if already created', async function () {
      const { factory, user1 } = await loadFixture(deployAccountFixture);

      await factory.createAccount(user1.address, 0);
      const account1 = await factory.ownerToAccount(user1.address);

      await factory.createAccount(user1.address, 0);
      const account2 = await factory.ownerToAccount(user1.address);

      expect(account1).to.equal(account2);
    });

    it('Should create valid account at non-zero address', async function () {
      const { factory, user1 } = await loadFixture(deployAccountFixture);

      await factory.createAccount(user1.address, 0);
      const actualAddress = await factory.ownerToAccount(user1.address);

      expect(actualAddress).to.not.equal(ethers.ZeroAddress);
    });

    it('Should create different accounts for different owners', async function () {
      const { factory, user1, user2 } = await loadFixture(deployAccountFixture);

      await factory.createAccount(user1.address, 0);
      await factory.createAccount(user2.address, 0);

      const account1 = await factory.ownerToAccount(user1.address);
      const account2 = await factory.ownerToAccount(user2.address);

      expect(account1).to.not.equal(account2);
    });

    it('Should return same account for same owner regardless of salt', async function () {
      const { factory, user1 } = await loadFixture(deployAccountFixture);

      // Factory design: one account per owner
      await factory.createAccount(user1.address, 0);
      const account = await factory.ownerToAccount(user1.address);

      // Calling again with different salt should return same account
      await factory.createAccount(user1.address, 1);
      const sameAccount = await factory.ownerToAccount(user1.address);

      expect(account).to.equal(sameAccount);
    });
  });

  describe('Account', function () {
    async function deployAccountWithWalletFixture() {
      const { entryPoint, factory, owner, user1, user2 } = await loadFixture(deployAccountFixture);

      // Create account for user1
      await factory.createAccount(user1.address, 0);
      const accountAddress = await factory.ownerToAccount(user1.address);
      const account = await ethers.getContractAt('TalismanAccount', accountAddress);

      // Fund the account with ETH
      await owner.sendTransaction({
        to: accountAddress,
        value: ethers.parseEther('1'),
      });

      return { entryPoint, factory, account, owner, user1, user2 };
    }

    it('Should have correct owner', async function () {
      const { account, user1 } = await loadFixture(deployAccountWithWalletFixture);
      expect(await account.owner()).to.equal(user1.address);
    });

    it('Should receive ETH', async function () {
      const { account } = await loadFixture(deployAccountWithWalletFixture);
      const balance = await ethers.provider.getBalance(await account.getAddress());
      expect(balance).to.equal(ethers.parseEther('1'));
    });

    it('Should allow owner to execute calls', async function () {
      const { account, user1, user2 } = await loadFixture(deployAccountWithWalletFixture);

      const transferAmount = ethers.parseEther('0.1');
      const balanceBefore = await ethers.provider.getBalance(user2.address);

      await account.connect(user1).execute(user2.address, transferAmount, '0x');

      const balanceAfter = await ethers.provider.getBalance(user2.address);
      expect(balanceAfter - balanceBefore).to.equal(transferAmount);
    });

    it('Should reject execute from non-owner', async function () {
      const { account, user2 } = await loadFixture(deployAccountWithWalletFixture);

      await expect(
        account.connect(user2).execute(user2.address, ethers.parseEther('0.1'), '0x')
      ).to.be.revertedWith('TalismanAccount: not authorized');
    });

    it('Should allow batch execution', async function () {
      const { account, user1, user2, owner } = await loadFixture(deployAccountWithWalletFixture);

      const amount1 = ethers.parseEther('0.1');
      const amount2 = ethers.parseEther('0.2');

      const balance2Before = await ethers.provider.getBalance(user2.address);
      const balanceOwnerBefore = await ethers.provider.getBalance(owner.address);

      await account.connect(user1).executeBatch(
        [user2.address, owner.address],
        [amount1, amount2],
        ['0x', '0x']
      );

      const balance2After = await ethers.provider.getBalance(user2.address);
      const balanceOwnerAfter = await ethers.provider.getBalance(owner.address);

      expect(balance2After - balance2Before).to.equal(amount1);
      expect(balanceOwnerAfter - balanceOwnerBefore).to.equal(amount2);
    });

    it('Should emit Executed event', async function () {
      const { account, user1, user2 } = await loadFixture(deployAccountWithWalletFixture);

      await expect(
        account.connect(user1).execute(user2.address, ethers.parseEther('0.1'), '0x')
      ).to.emit(account, 'Executed');
    });
  });
});

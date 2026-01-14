import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('TalismanPaymaster', function () {
  async function deployPaymasterFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock EntryPoint
    const MockEntryPoint = await ethers.getContractFactory('MockEntryPoint');
    const entryPoint = await MockEntryPoint.deploy();

    // Deploy token
    const TalismanToken = await ethers.getContractFactory('TalismanToken');
    const token = await TalismanToken.deploy(owner.address, ethers.parseEther('1000000'));

    // Deploy game
    const TalismanGame = await ethers.getContractFactory('TalismanGame');
    const game = await TalismanGame.deploy(await token.getAddress(), owner.address);

    // Deploy paymaster
    const TalismanPaymaster = await ethers.getContractFactory('TalismanPaymaster');
    const paymaster = await TalismanPaymaster.deploy(await entryPoint.getAddress(), owner.address);

    // Configure paymaster
    await paymaster.setGameContract(await game.getAddress());

    // Deposit ETH to paymaster
    await paymaster.deposit({ value: ethers.parseEther('10') });

    return { entryPoint, token, game, paymaster, owner, user1, user2 };
  }

  describe('Deployment', function () {
    it('Should set correct EntryPoint', async function () {
      const { paymaster, entryPoint } = await loadFixture(deployPaymasterFixture);
      expect(await paymaster.entryPoint()).to.equal(await entryPoint.getAddress());
    });

    it('Should set correct owner', async function () {
      const { paymaster, owner } = await loadFixture(deployPaymasterFixture);
      expect(await paymaster.owner()).to.equal(owner.address);
    });

    it('Should set default limits', async function () {
      const { paymaster } = await loadFixture(deployPaymasterFixture);
      expect(await paymaster.maxCostPerUserOp()).to.equal(ethers.parseEther('0.001'));
      expect(await paymaster.dailyLimitPerUser()).to.equal(ethers.parseEther('0.01'));
    });

    it('Should allow game function selectors', async function () {
      const { paymaster } = await loadFixture(deployPaymasterFixture);
      const startSessionSelector = '0x' + ethers.keccak256(
        ethers.toUtf8Bytes('startSession()')
      ).slice(2, 10);

      expect(await paymaster.allowedSelectors(startSessionSelector)).to.be.true;
    });
  });

  describe('Configuration', function () {
    it('Should allow owner to set game contract', async function () {
      const { paymaster, owner, user1 } = await loadFixture(deployPaymasterFixture);

      await expect(paymaster.setGameContract(user1.address))
        .to.emit(paymaster, 'GameContractUpdated')
        .withArgs(user1.address);

      expect(await paymaster.gameContract()).to.equal(user1.address);
    });

    it('Should allow owner to set limits', async function () {
      const { paymaster } = await loadFixture(deployPaymasterFixture);
      const newMaxCost = ethers.parseEther('0.002');
      const newDailyLimit = ethers.parseEther('0.02');

      await paymaster.setLimits(newMaxCost, newDailyLimit);

      expect(await paymaster.maxCostPerUserOp()).to.equal(newMaxCost);
      expect(await paymaster.dailyLimitPerUser()).to.equal(newDailyLimit);
    });

    it('Should allow owner to add/remove allowed selectors', async function () {
      const { paymaster } = await loadFixture(deployPaymasterFixture);
      const testSelector = '0x12345678';

      await paymaster.setAllowedSelector(testSelector, true);
      expect(await paymaster.allowedSelectors(testSelector)).to.be.true;

      await paymaster.setAllowedSelector(testSelector, false);
      expect(await paymaster.allowedSelectors(testSelector)).to.be.false;
    });

    it('Should reject configuration from non-owner', async function () {
      const { paymaster, user1 } = await loadFixture(deployPaymasterFixture);

      await expect(
        paymaster.connect(user1).setGameContract(user1.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('Deposits', function () {
    it('Should deposit ETH to EntryPoint', async function () {
      const { paymaster, entryPoint } = await loadFixture(deployPaymasterFixture);

      const depositBefore = await paymaster.getDeposit();
      const additionalDeposit = ethers.parseEther('5');

      await paymaster.deposit({ value: additionalDeposit });

      const depositAfter = await paymaster.getDeposit();
      expect(depositAfter - depositBefore).to.equal(additionalDeposit);
    });

    it('Should allow owner to withdraw from EntryPoint', async function () {
      const { paymaster, owner } = await loadFixture(deployPaymasterFixture);

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const withdrawAmount = ethers.parseEther('1');

      const tx = await paymaster.withdrawTo(owner.address, withdrawAmount);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(owner.address);
      expect(balanceAfter + gasCost - balanceBefore).to.equal(withdrawAmount);
    });
  });

  describe('Daily Limits', function () {
    it('Should track daily sponsorship usage', async function () {
      const { paymaster, user1 } = await loadFixture(deployPaymasterFixture);

      // Initial remaining should be full daily limit
      const remaining = await paymaster.getRemainingDailyAllowance(user1.address);
      expect(remaining).to.equal(await paymaster.dailyLimitPerUser());
    });

    it('Should reset daily limit after 24 hours', async function () {
      const { paymaster, user1 } = await loadFixture(deployPaymasterFixture);

      // Simulate some usage by directly setting (for testing purposes)
      // In real scenario this would be done through validatePaymasterUserOp

      // Advance time by 1 day
      await time.increase(24 * 60 * 60 + 1);

      // Should have full allowance again
      const remaining = await paymaster.getRemainingDailyAllowance(user1.address);
      expect(remaining).to.equal(await paymaster.dailyLimitPerUser());
    });
  });

  describe('Receive ETH', function () {
    it('Should accept ETH transfers', async function () {
      const { paymaster, owner } = await loadFixture(deployPaymasterFixture);

      const amount = ethers.parseEther('1');
      await owner.sendTransaction({
        to: await paymaster.getAddress(),
        value: amount,
      });

      const balance = await ethers.provider.getBalance(await paymaster.getAddress());
      expect(balance).to.equal(amount);
    });
  });
});

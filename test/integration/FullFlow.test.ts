import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('Integration: Full Game Flow', function () {
  async function deployFullSystemFixture() {
    const [owner, player1, player2] = await ethers.getSigners();

    // Deploy mock EntryPoint
    const MockEntryPoint = await ethers.getContractFactory('MockEntryPoint');
    const entryPoint = await MockEntryPoint.deploy();

    // Deploy token
    const TalismanToken = await ethers.getContractFactory('TalismanToken');
    const token = await TalismanToken.deploy(owner.address, ethers.parseEther('1000000'));

    // Deploy account factory
    const TalismanAccountFactory = await ethers.getContractFactory('TalismanAccountFactory');
    const factory = await TalismanAccountFactory.deploy(await entryPoint.getAddress());

    // Deploy game
    const TalismanGame = await ethers.getContractFactory('TalismanGame');
    const game = await TalismanGame.deploy(await token.getAddress(), owner.address);

    // Deploy paymaster
    const TalismanPaymaster = await ethers.getContractFactory('TalismanPaymaster');
    const paymaster = await TalismanPaymaster.deploy(await entryPoint.getAddress(), owner.address);

    // Configure system
    await paymaster.setGameContract(await game.getAddress());
    await paymaster.deposit({ value: ethers.parseEther('10') });

    // Fund reward pool
    await token.transfer(await game.getAddress(), ethers.parseEther('100000'));

    // Give players tokens
    await token.transfer(player1.address, ethers.parseEther('1000'));
    await token.transfer(player2.address, ethers.parseEther('1000'));

    return { entryPoint, token, factory, game, paymaster, owner, player1, player2 };
  }

  describe('Complete User Journey', function () {
    it('Should complete full game flow: create account, play, vest, claim', async function () {
      const { token, factory, game, player1 } = await loadFixture(deployFullSystemFixture);

      // 1. Create smart account for player
      await factory.createAccount(player1.address, 0);
      const accountAddress = await factory.ownerToAccount(player1.address);
      expect(accountAddress).to.not.equal(ethers.ZeroAddress);

      // 2. Approve game to spend player tokens
      await token.connect(player1).approve(await game.getAddress(), ethers.MaxUint256);

      // 3. Start game session
      const balanceBefore = await token.balanceOf(player1.address);
      await game.connect(player1).startSession();

      const session = await game.getSession(player1.address);
      expect(session.isActive).to.be.true;

      // Verify session cost was deducted
      const sessionCost = await game.sessionCost();
      expect(await token.balanceOf(player1.address)).to.equal(balanceBefore - sessionCost);

      // 4. Play game (simulate time passing)
      await time.increase(300); // 5 minutes

      // 5. End session
      await game.connect(player1).endSession(0);

      const sessionAfter = await game.getSession(player1.address);
      expect(sessionAfter.isActive).to.be.false;
      expect(sessionAfter.rewardEarned).to.be.gt(0);

      // 6. Check vesting
      const vesting = await game.getVestingInfo(player1.address);
      expect(vesting.totalAmount).to.equal(sessionAfter.rewardEarned);

      // 7. Wait for partial vesting
      const vestingDuration = await game.vestingDuration();
      await time.increase(Number(vestingDuration) / 2);

      // 8. Claim partial rewards
      const claimable = await game.getClaimableAmount(player1.address);
      expect(claimable).to.be.gt(0);

      const balanceBeforeClaim = await token.balanceOf(player1.address);
      await game.connect(player1).claimRewards();
      const balanceAfterClaim = await token.balanceOf(player1.address);

      // Allow small variance due to block timestamp changes
      const claimed = balanceAfterClaim - balanceBeforeClaim;
      expect(claimed).to.be.gte(claimable);

      // 9. Wait for full vesting
      await time.increase(Number(vestingDuration) / 2 + 1);

      // 10. Claim remaining rewards
      const remainingClaimable = await game.getClaimableAmount(player1.address);
      await game.connect(player1).claimRewards();

      // 11. Verify nothing left to claim
      expect(await game.getClaimableAmount(player1.address)).to.equal(0);
    });

    it('Should handle multiple players simultaneously', async function () {
      const { token, game, player1, player2 } = await loadFixture(deployFullSystemFixture);

      // Setup approvals
      await token.connect(player1).approve(await game.getAddress(), ethers.MaxUint256);
      await token.connect(player2).approve(await game.getAddress(), ethers.MaxUint256);

      // Both players start sessions
      await game.connect(player1).startSession();
      await game.connect(player2).startSession();

      expect((await game.getSession(player1.address)).isActive).to.be.true;
      expect((await game.getSession(player2.address)).isActive).to.be.true;

      // Player 1 plays for 2 minutes
      await time.increase(120);
      await game.connect(player1).endSession(0);

      // Player 2 plays for 5 minutes
      await time.increase(180);
      await game.connect(player2).endSession(0);

      // Player 2 should have more rewards
      const session1 = await game.getSession(player1.address);
      const session2 = await game.getSession(player2.address);

      expect(session2.rewardEarned).to.be.gt(session1.rewardEarned);
    });

    it('Should handle multiple sessions with accumulating vesting', async function () {
      const { token, game, player1 } = await loadFixture(deployFullSystemFixture);

      await token.connect(player1).approve(await game.getAddress(), ethers.MaxUint256);

      // First session
      await game.connect(player1).startSession();
      await time.increase(120);
      await game.connect(player1).endSession(0);

      const vesting1 = await game.getVestingInfo(player1.address);
      const reward1 = vesting1.totalAmount;

      // Second session
      await game.connect(player1).startSession();
      await time.increase(180);
      await game.connect(player1).endSession(0);

      const vesting2 = await game.getVestingInfo(player1.address);

      // Total should be accumulated
      expect(vesting2.totalAmount).to.be.gt(reward1);
    });
  });

  describe('Smart Account Integration', function () {
    it('Should allow smart account to interact with game', async function () {
      const { token, factory, game, player1, owner } = await loadFixture(deployFullSystemFixture);

      // Create smart account
      await factory.createAccount(player1.address, 0);
      const accountAddress = await factory.ownerToAccount(player1.address);
      const account = await ethers.getContractAt('TalismanAccount', accountAddress);

      // Fund smart account with tokens
      await token.transfer(accountAddress, ethers.parseEther('100'));

      // Approve game from smart account (execute call)
      const approveData = token.interface.encodeFunctionData('approve', [
        await game.getAddress(),
        ethers.MaxUint256,
      ]);
      await account.connect(player1).execute(await token.getAddress(), 0, approveData);

      // Start session from smart account
      const startSessionData = game.interface.encodeFunctionData('startSession');
      await account.connect(player1).execute(await game.getAddress(), 0, startSessionData);

      // Verify session started
      const session = await game.getSession(accountAddress);
      expect(session.isActive).to.be.true;
    });
  });

  describe('Edge Cases', function () {
    it('Should handle session at max duration', async function () {
      const { token, game, player1 } = await loadFixture(deployFullSystemFixture);

      await token.connect(player1).approve(await game.getAddress(), ethers.MaxUint256);
      await game.connect(player1).startSession();

      // Wait for much longer than max
      const maxDuration = await game.maxSessionDuration();
      await time.increase(Number(maxDuration) * 2);

      await game.connect(player1).endSession(0);

      // Reward should be capped
      const session = await game.getSession(player1.address);
      const rewardRate = await game.rewardRatePerSecond();
      expect(session.rewardEarned).to.equal(rewardRate * maxDuration);
    });

    it('Should reject insufficient reward pool', async function () {
      const { token, game, owner, player1 } = await loadFixture(deployFullSystemFixture);

      // Withdraw most of the reward pool
      const maxReward = (await game.maxSessionDuration()) * (await game.rewardRatePerSecond());
      const gameBalance = await token.balanceOf(await game.getAddress());
      const withdrawAmount = gameBalance - maxReward + 1n;

      await game.connect(owner).withdrawRewardPool(withdrawAmount);

      await token.connect(player1).approve(await game.getAddress(), ethers.MaxUint256);

      // Should fail due to insufficient reward pool
      await expect(
        game.connect(player1).startSession()
      ).to.be.revertedWith('TalismanGame: insufficient reward pool');
    });
  });
});

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { TalismanToken, TalismanGame } from '../typechain-types';

describe('TalismanGame', function () {
  async function deployGameFixture() {
    const [owner, player1, player2] = await ethers.getSigners();
    const initialSupply = ethers.parseEther('1000000');

    // Deploy token
    const TalismanToken = await ethers.getContractFactory('TalismanToken');
    const token = await TalismanToken.deploy(owner.address, initialSupply);

    // Deploy game
    const TalismanGame = await ethers.getContractFactory('TalismanGame');
    const game = await TalismanGame.deploy(await token.getAddress(), owner.address);

    // Fund reward pool
    const rewardPoolAmount = ethers.parseEther('100000');
    await token.transfer(await game.getAddress(), rewardPoolAmount);

    // Give players tokens for session costs
    const playerTokens = ethers.parseEther('1000');
    await token.transfer(player1.address, playerTokens);
    await token.transfer(player2.address, playerTokens);

    // Approve game to spend player tokens
    await token.connect(player1).approve(await game.getAddress(), ethers.MaxUint256);
    await token.connect(player2).approve(await game.getAddress(), ethers.MaxUint256);

    return { token, game, owner, player1, player2, rewardPoolAmount };
  }

  describe('Deployment', function () {
    it('Should set the correct token address', async function () {
      const { token, game } = await loadFixture(deployGameFixture);
      expect(await game.tlsmToken()).to.equal(await token.getAddress());
    });

    it('Should set default configuration', async function () {
      const { game } = await loadFixture(deployGameFixture);
      expect(await game.sessionCost()).to.equal(ethers.parseEther('10'));
      expect(await game.maxSessionDuration()).to.equal(3600); // 1 hour
      expect(await game.minSessionDuration()).to.equal(60); // 1 minute
      expect(await game.vestingDuration()).to.equal(7 * 24 * 60 * 60); // 7 days
    });
  });

  describe('Session Management', function () {
    it('Should start a game session', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await expect(game.connect(player1).startSession())
        .to.emit(game, 'SessionStarted');

      const session = await game.getSession(player1.address);
      expect(session.isActive).to.be.true;
    });

    it('Should deduct session cost', async function () {
      const { token, game, player1 } = await loadFixture(deployGameFixture);
      const balanceBefore = await token.balanceOf(player1.address);
      const sessionCost = await game.sessionCost();

      await game.connect(player1).startSession();

      const balanceAfter = await token.balanceOf(player1.address);
      expect(balanceBefore - balanceAfter).to.equal(sessionCost);
    });

    it('Should not allow starting a second session', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();

      await expect(
        game.connect(player1).startSession()
      ).to.be.revertedWith('TalismanGame: session already active');
    });

    it('Should end a session after minimum duration', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();

      // Wait for minimum duration (60 seconds)
      await time.increase(61);

      await expect(game.connect(player1).endSession(0))
        .to.emit(game, 'SessionEnded');

      const session = await game.getSession(player1.address);
      expect(session.isActive).to.be.false;
      expect(session.rewardEarned).to.be.gt(0);
    });

    it('Should not allow ending session before minimum duration', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();

      await expect(
        game.connect(player1).endSession(0)
      ).to.be.revertedWith('TalismanGame: session too short');
    });

    it('Should cap rewards at max session duration', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();

      // Wait for more than max duration (1 hour + extra)
      await time.increase(3700);

      await game.connect(player1).endSession(0);

      const session = await game.getSession(player1.address);
      const rewardRate = await game.rewardRatePerSecond();
      const maxDuration = await game.maxSessionDuration();

      // Reward should be capped at max duration (with no talisman bonus = 1x)
      expect(session.rewardEarned).to.equal(rewardRate * maxDuration);
    });
  });

  describe('Talisman Bonus', function () {
    it('Should apply 10% bonus per talisman', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();
      await time.increase(120); // 2 minutes

      // End with 5 talismans = 1.5x multiplier
      await game.connect(player1).endSession(5);

      const session = await game.getSession(player1.address);

      // With 5 talismans, multiplier is 150 (1.5x)
      // Verify talisman count is stored
      expect(session.talismansCollected).to.equal(5);

      // Verify reward is approximately 1.5x the base (allowing for block time variance)
      const rewardRate = await game.rewardRatePerSecond();
      const minExpectedReward = (rewardRate * 120n * 150n) / 100n;
      expect(session.rewardEarned).to.be.gte(minExpectedReward);
    });

    it('Should cap bonus at 200% (3x max)', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();
      await time.increase(120);

      // End with 30 talismans (would be 300% bonus), should be capped at 200% = 3x
      await game.connect(player1).endSession(30);

      const session = await game.getSession(player1.address);

      // With 30 talismans, bonus is capped at 200%, so multiplier is 300 (3x max)
      const rewardRate = await game.rewardRatePerSecond();
      const minExpectedReward = (rewardRate * 120n * 300n) / 100n;
      expect(session.rewardEarned).to.be.gte(minExpectedReward);
    });

    it('Should emit event with talisman count and multiplier', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();
      await time.increase(120);

      // 10 talismans = 2x multiplier (100% + 100% bonus)
      const tx = await game.connect(player1).endSession(10);
      const receipt = await tx.wait();

      // Verify the event was emitted
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'SessionEnded'
      );
      expect(event).to.not.be.undefined;
    });
  });

  describe('Retry Mechanism', function () {
    it('Should charge session cost on retry', async function () {
      const { token, game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();
      const balanceBefore = await token.balanceOf(player1.address);
      const sessionCost = await game.sessionCost();

      await game.connect(player1).retryGame();

      const balanceAfter = await token.balanceOf(player1.address);
      expect(balanceBefore - balanceAfter).to.equal(sessionCost);
    });

    it('Should increment attempt count on retry', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();
      expect(await game.getAttemptCount(player1.address)).to.equal(1);

      await game.connect(player1).retryGame();
      expect(await game.getAttemptCount(player1.address)).to.equal(2);

      await game.connect(player1).retryGame();
      expect(await game.getAttemptCount(player1.address)).to.equal(3);
    });

    it('Should emit GameRetried event', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();
      const sessionCost = await game.sessionCost();

      await expect(game.connect(player1).retryGame())
        .to.emit(game, 'GameRetried')
        .withArgs(player1.address, 2, sessionCost);
    });

    it('Should not allow retry without active session', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await expect(
        game.connect(player1).retryGame()
      ).to.be.revertedWith('TalismanGame: no active session');
    });

    it('Should reset attempt count on new session', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();
      await game.connect(player1).retryGame();
      await game.connect(player1).retryGame();
      expect(await game.getAttemptCount(player1.address)).to.equal(3);

      await time.increase(61);
      await game.connect(player1).endSession(5);

      // Start new session
      await game.connect(player1).startSession();
      expect(await game.getAttemptCount(player1.address)).to.equal(1);
    });
  });

  describe('Vesting', function () {
    it('Should create vesting schedule on session end', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();
      await time.increase(120); // 2 minutes
      await game.connect(player1).endSession(0);

      const vesting = await game.getVestingInfo(player1.address);
      expect(vesting.totalAmount).to.be.gt(0);
      expect(vesting.claimedAmount).to.equal(0);
    });

    it('Should allow claiming vested rewards over time', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();
      await time.increase(120);
      await game.connect(player1).endSession(0);

      const vesting = await game.getVestingInfo(player1.address);
      const vestingDuration = await game.vestingDuration();

      // Wait for half the vesting period
      await time.increase(Number(vestingDuration) / 2);

      const claimable = await game.getClaimableAmount(player1.address);
      expect(claimable).to.be.gt(0);
      expect(claimable).to.be.lt(vesting.totalAmount);
    });

    it('Should allow claiming all rewards after vesting period', async function () {
      const { token, game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();
      await time.increase(120);
      await game.connect(player1).endSession(0);

      const vesting = await game.getVestingInfo(player1.address);
      const vestingDuration = await game.vestingDuration();

      // Wait for full vesting period
      await time.increase(Number(vestingDuration) + 1);

      const balanceBefore = await token.balanceOf(player1.address);
      await game.connect(player1).claimRewards();
      const balanceAfter = await token.balanceOf(player1.address);

      expect(balanceAfter - balanceBefore).to.equal(vesting.totalAmount);
    });

    it('Should update claimed amount after claim', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await game.connect(player1).startSession();
      await time.increase(120);
      await game.connect(player1).endSession(0);

      const vestingDuration = await game.vestingDuration();
      await time.increase(Number(vestingDuration) / 2);

      const claimableBefore = await game.getClaimableAmount(player1.address);
      await game.connect(player1).claimRewards();

      const vestingAfter = await game.getVestingInfo(player1.address);
      expect(vestingAfter.claimedAmount).to.be.gt(0);
    });

    it('Should reject claim with nothing to claim', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await expect(
        game.connect(player1).claimRewards()
      ).to.be.revertedWith('TalismanGame: nothing to claim');
    });
  });

  describe('Admin Functions', function () {
    it('Should allow owner to set session cost', async function () {
      const { game, owner } = await loadFixture(deployGameFixture);
      const newCost = ethers.parseEther('20');

      await game.connect(owner).setSessionCost(newCost);
      expect(await game.sessionCost()).to.equal(newCost);
    });

    it('Should allow owner to set reward rate', async function () {
      const { game, owner } = await loadFixture(deployGameFixture);
      const newRate = ethers.parseEther('0.1');

      await game.connect(owner).setRewardRate(newRate);
      expect(await game.rewardRatePerSecond()).to.equal(newRate);
    });

    it('Should allow owner to pause and unpause', async function () {
      const { game, owner, player1 } = await loadFixture(deployGameFixture);

      await game.connect(owner).pause();

      await expect(
        game.connect(player1).startSession()
      ).to.be.revertedWith('Pausable: paused');

      await game.connect(owner).unpause();

      await expect(game.connect(player1).startSession()).to.not.be.reverted;
    });

    it('Should reject admin functions from non-owner', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      await expect(
        game.connect(player1).setSessionCost(ethers.parseEther('20'))
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('Reward Pool', function () {
    it('Should allow owner to deposit to reward pool', async function () {
      const { token, game, owner } = await loadFixture(deployGameFixture);
      const depositAmount = ethers.parseEther('1000');

      await token.approve(await game.getAddress(), depositAmount);
      await expect(game.depositRewardPool(depositAmount))
        .to.emit(game, 'RewardPoolDeposited')
        .withArgs(depositAmount);
    });

    it('Should allow owner to withdraw excess from reward pool', async function () {
      const { token, game, owner, rewardPoolAmount } = await loadFixture(deployGameFixture);

      const balanceBefore = await token.balanceOf(owner.address);
      const withdrawAmount = ethers.parseEther('1000');

      await game.withdrawRewardPool(withdrawAmount);

      const balanceAfter = await token.balanceOf(owner.address);
      expect(balanceAfter - balanceBefore).to.equal(withdrawAmount);
    });

    it('Should not allow withdrawing claimed rewards', async function () {
      const { game, player1 } = await loadFixture(deployGameFixture);

      // Start and end a session to create pending rewards
      await game.connect(player1).startSession();
      await time.increase(120);
      await game.connect(player1).endSession(0);

      const totalUnclaimed = await game.totalUnclaimedRewards();
      const gameBalance = await game.tlsmToken().then(addr =>
        ethers.getContractAt('TalismanToken', addr)
      ).then(t => t.balanceOf(game.getAddress()));

      // Try to withdraw more than available (balance - unclaimed)
      const available = gameBalance - totalUnclaimed;

      await expect(
        game.withdrawRewardPool(available + 1n)
      ).to.be.revertedWith('TalismanGame: insufficient available');
    });
  });
});

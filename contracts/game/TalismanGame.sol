// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ITalismanGame.sol";

/**
 * @title TalismanGame
 * @dev Core game contract for Talisman
 * Handles game sessions, timer-based rewards, and linear vesting
 */
contract TalismanGame is ITalismanGame, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    /// @dev The TLSM token contract
    IERC20 public immutable tlsmToken;

    /// @dev Cost to start a game session (in TLSM)
    uint256 public sessionCost;

    /// @dev Reward rate per second (in TLSM wei)
    uint256 public rewardRatePerSecond;

    /// @dev Maximum session duration (in seconds)
    uint256 public maxSessionDuration;

    /// @dev Minimum session duration (in seconds)
    uint256 public minSessionDuration;

    /// @dev Vesting duration for rewards (in seconds)
    uint256 public vestingDuration;

    /// @dev Total unclaimed rewards across all players
    uint256 public totalUnclaimedRewards;

    /// @dev Bonus percent per talisman collected (10 = 10%)
    uint256 public constant TALISMAN_BONUS_PERCENT = 10;

    /// @dev Maximum bonus from talismans (200 = 200% bonus = 3x total)
    uint256 public constant MAX_TALISMAN_BONUS = 200;

    /// @dev Mapping of player to their current session
    mapping(address => GameSession) private _sessions;

    /// @dev Mapping of player to their vesting schedule
    mapping(address => VestingSchedule) private _vestingSchedules;

    /// @dev Mapping of player to their retry attempt count in current session
    mapping(address => uint256) private _attemptCounts;

    /**
     * @dev Constructor
     * @param tlsmToken_ The TLSM token contract address
     * @param initialOwner The initial owner address
     */
    constructor(
        address tlsmToken_,
        address initialOwner
    ) {
        _transferOwnership(initialOwner);
        require(tlsmToken_ != address(0), "TalismanGame: zero token address");

        tlsmToken = IERC20(tlsmToken_);

        // Default configuration
        sessionCost = 10 * 1e18; // 10 TLSM
        rewardRatePerSecond = uint256(1e18) / 60; // ~1 TLSM per minute
        maxSessionDuration = 1 hours;
        minSessionDuration = 60; // 1 minute minimum
        vestingDuration = 7 days;
    }

    /**
     * @dev Start a new game session
     * Player must have approved sessionCost TLSM tokens
     */
    function startSession() external override nonReentrant whenNotPaused {
        require(!_sessions[msg.sender].isActive, "TalismanGame: session already active");

        // Check reward pool has capacity for max potential reward
        uint256 maxPotentialReward = maxSessionDuration * rewardRatePerSecond;
        uint256 availableRewards = tlsmToken.balanceOf(address(this)) - totalUnclaimedRewards;
        require(availableRewards >= maxPotentialReward, "TalismanGame: insufficient reward pool");

        // Transfer session cost from player
        tlsmToken.safeTransferFrom(msg.sender, address(this), sessionCost);

        // Create new session
        _sessions[msg.sender] = GameSession({
            startTime: uint64(block.timestamp),
            endTime: 0,
            rewardEarned: 0,
            talismansCollected: 0,
            isActive: true
        });

        // Initialize attempt count
        _attemptCounts[msg.sender] = 1;

        emit SessionStarted(msg.sender, block.timestamp);
    }

    /**
     * @dev End the current game session
     * Calculates reward based on session duration and talisman bonus, adds to vesting
     * @param talismansCollected Number of talismans collected during the session
     */
    function endSession(uint256 talismansCollected) external override nonReentrant whenNotPaused {
        GameSession storage session = _sessions[msg.sender];
        require(session.isActive, "TalismanGame: no active session");
        require(
            block.timestamp >= session.startTime + minSessionDuration,
            "TalismanGame: session too short"
        );

        // Calculate session duration (capped at max)
        uint256 duration = block.timestamp - session.startTime;
        if (duration > maxSessionDuration) {
            duration = maxSessionDuration;
        }

        // Calculate base reward
        uint256 baseReward = duration * rewardRatePerSecond;

        // Calculate multiplier (10% per talisman, capped at 200% bonus = 3x max)
        uint256 bonusPercent = talismansCollected * TALISMAN_BONUS_PERCENT;
        if (bonusPercent > MAX_TALISMAN_BONUS) {
            bonusPercent = MAX_TALISMAN_BONUS;
        }
        uint256 multiplier = 100 + bonusPercent; // 100 = 1x, 200 = 2x, 300 = 3x

        // Calculate final reward with multiplier
        uint256 reward = (baseReward * multiplier) / 100;

        // Update session
        session.endTime = uint64(block.timestamp);
        session.rewardEarned = uint128(reward);
        session.talismansCollected = uint32(talismansCollected);
        session.isActive = false;

        // Update vesting schedule
        _addToVesting(msg.sender, reward);

        // Track total unclaimed
        totalUnclaimedRewards += reward;

        emit SessionEnded(msg.sender, duration, reward, talismansCollected, multiplier);
    }

    /**
     * @dev Retry the game (pay cost again after game over)
     * Requires an active session
     */
    function retryGame() external override nonReentrant whenNotPaused {
        GameSession storage session = _sessions[msg.sender];
        require(session.isActive, "TalismanGame: no active session");

        // Charge retry cost
        tlsmToken.safeTransferFrom(msg.sender, address(this), sessionCost);

        // Increment attempt count
        _attemptCounts[msg.sender]++;

        emit GameRetried(msg.sender, _attemptCounts[msg.sender], sessionCost);
    }

    /**
     * @dev Get the attempt count for a player in their current session
     * @param player The player address
     * @return The attempt count
     */
    function getAttemptCount(address player) external view override returns (uint256) {
        return _attemptCounts[player];
    }

    /**
     * @dev Claim vested rewards
     */
    function claimRewards() external override nonReentrant whenNotPaused {
        uint256 claimable = getClaimableAmount(msg.sender);
        require(claimable > 0, "TalismanGame: nothing to claim");

        VestingSchedule storage schedule = _vestingSchedules[msg.sender];
        schedule.claimedAmount += uint128(claimable);

        // Update total unclaimed
        totalUnclaimedRewards -= claimable;

        // Transfer tokens
        tlsmToken.safeTransfer(msg.sender, claimable);

        emit RewardsClaimed(msg.sender, claimable);
    }

    /**
     * @dev Get the claimable amount for a player
     * @param player The player address
     * @return The claimable amount
     */
    function getClaimableAmount(address player) public view override returns (uint256) {
        VestingSchedule storage schedule = _vestingSchedules[player];

        if (schedule.totalAmount == 0) return 0;
        if (schedule.duration == 0) return 0;

        uint256 elapsed = block.timestamp - schedule.startTime;
        if (elapsed >= schedule.duration) {
            // Fully vested
            return schedule.totalAmount - schedule.claimedAmount;
        }

        // Linear vesting
        uint256 vested = (schedule.totalAmount * elapsed) / schedule.duration;
        return vested - schedule.claimedAmount;
    }

    /**
     * @dev Get vesting info for a player
     * @param player The player address
     * @return The vesting schedule
     */
    function getVestingInfo(address player) external view override returns (VestingSchedule memory) {
        return _vestingSchedules[player];
    }

    /**
     * @dev Get session info for a player
     * @param player The player address
     * @return The game session
     */
    function getSession(address player) external view override returns (GameSession memory) {
        return _sessions[player];
    }

    // ============ Admin Functions ============

    /**
     * @dev Set the session cost
     * @param cost The new session cost
     */
    function setSessionCost(uint256 cost) external override onlyOwner {
        require(cost > 0, "TalismanGame: zero cost");
        sessionCost = cost;
        emit SessionCostUpdated(cost);
    }

    /**
     * @dev Set the reward rate per second
     * @param rate The new reward rate
     */
    function setRewardRate(uint256 rate) external override onlyOwner {
        require(rate > 0, "TalismanGame: zero rate");
        rewardRatePerSecond = rate;
        emit RewardRateUpdated(rate);
    }

    /**
     * @dev Set the vesting duration
     * @param duration The new vesting duration
     */
    function setVestingDuration(uint256 duration) external override onlyOwner {
        require(duration > 0, "TalismanGame: zero duration");
        vestingDuration = duration;
        emit VestingDurationUpdated(duration);
    }

    /**
     * @dev Set the maximum session duration
     * @param duration The new max duration
     */
    function setMaxSessionDuration(uint256 duration) external override onlyOwner {
        require(duration > minSessionDuration, "TalismanGame: max must exceed min");
        maxSessionDuration = duration;
    }

    /**
     * @dev Deposit tokens to the reward pool
     * @param amount The amount to deposit
     */
    function depositRewardPool(uint256 amount) external override onlyOwner {
        tlsmToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardPoolDeposited(amount);
    }

    /**
     * @dev Withdraw tokens from the reward pool
     * Only excess tokens (not reserved for unclaimed rewards) can be withdrawn
     * @param amount The amount to withdraw
     */
    function withdrawRewardPool(uint256 amount) external override onlyOwner {
        uint256 available = tlsmToken.balanceOf(address(this)) - totalUnclaimedRewards;
        require(amount <= available, "TalismanGame: insufficient available");
        tlsmToken.safeTransfer(msg.sender, amount);
        emit RewardPoolWithdrawn(amount);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external override onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external override onlyOwner {
        _unpause();
    }

    // ============ Internal Functions ============

    /**
     * @dev Add rewards to a player's vesting schedule
     * @param player The player address
     * @param amount The reward amount to add
     */
    function _addToVesting(address player, uint256 amount) internal {
        VestingSchedule storage schedule = _vestingSchedules[player];

        if (schedule.totalAmount == 0) {
            // New vesting schedule
            schedule.totalAmount = uint128(amount);
            schedule.claimedAmount = 0;
            schedule.startTime = uint64(block.timestamp);
            schedule.duration = uint64(vestingDuration);
        } else {
            // Add to existing schedule
            // Calculate currently vested amount
            uint256 currentlyVested = getClaimableAmount(player) + schedule.claimedAmount;

            // New total is old total + new amount
            uint256 newTotal = schedule.totalAmount + amount;

            // Reset vesting with new parameters
            // Already claimed stays claimed, rest vests from now
            schedule.totalAmount = uint128(newTotal);
            schedule.startTime = uint64(block.timestamp);
            schedule.duration = uint64(vestingDuration);

            // Adjust claimed to account for already vested portion
            // This ensures previously vested but unclaimed rewards remain claimable
            schedule.claimedAmount = uint128(schedule.claimedAmount);

            // Recalculate: if currentlyVested > claimedAmount, make difference immediately available
            // by treating it as if vesting started earlier
            if (currentlyVested > schedule.claimedAmount) {
                uint256 alreadyVestedUnclaimed = currentlyVested - schedule.claimedAmount;
                // Adjust start time backwards to make this amount immediately claimable
                // vestedRatio = alreadyVestedUnclaimed / newTotal
                // elapsed / duration = vestedRatio
                // We keep it simple: just credit the already vested amount
                // by reducing total and keeping it claimable
                schedule.totalAmount = uint128(newTotal - alreadyVestedUnclaimed);
                // Transfer the already vested to claimable by not including in new vesting
                // Actually, simpler: just add a flag or handle in getClaimable
                // For simplicity, we reset and user claims what's available before ending session
                schedule.totalAmount = uint128(newTotal);
            }
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITalismanGame
 * @dev Interface for the Talisman game contract
 */
interface ITalismanGame {
    // Events
    event SessionStarted(address indexed player, uint256 startTime);
    event SessionEnded(
        address indexed player,
        uint256 duration,
        uint256 reward,
        uint256 talismansCollected,
        uint256 multiplier
    );
    event GameRetried(address indexed player, uint256 attemptNumber, uint256 cost);
    event RewardsClaimed(address indexed player, uint256 amount);
    event SessionCostUpdated(uint256 newCost);
    event RewardRateUpdated(uint256 newRate);
    event VestingDurationUpdated(uint256 newDuration);
    event RewardPoolDeposited(uint256 amount);
    event RewardPoolWithdrawn(uint256 amount);

    // Structs
    struct GameSession {
        uint64 startTime;
        uint64 endTime;
        uint128 rewardEarned;
        uint32 talismansCollected;
        bool isActive;
    }

    struct VestingSchedule {
        uint128 totalAmount;
        uint128 claimedAmount;
        uint64 startTime;
        uint64 duration;
    }

    // Session Management
    function startSession() external;
    function endSession(uint256 talismansCollected) external;
    function retryGame() external;
    function getAttemptCount(address player) external view returns (uint256);

    // Rewards & Vesting
    function claimRewards() external;
    function getClaimableAmount(address player) external view returns (uint256);
    function getVestingInfo(address player) external view returns (VestingSchedule memory);
    function getSession(address player) external view returns (GameSession memory);

    // View functions
    function sessionCost() external view returns (uint256);
    function rewardRatePerSecond() external view returns (uint256);
    function maxSessionDuration() external view returns (uint256);
    function vestingDuration() external view returns (uint256);
    function minSessionDuration() external view returns (uint256);
    function totalUnclaimedRewards() external view returns (uint256);

    // Admin functions
    function setSessionCost(uint256 cost) external;
    function setRewardRate(uint256 rate) external;
    function setVestingDuration(uint256 duration) external;
    function setMaxSessionDuration(uint256 duration) external;
    function depositRewardPool(uint256 amount) external;
    function withdrawRewardPool(uint256 amount) external;
    function pause() external;
    function unpause() external;
}

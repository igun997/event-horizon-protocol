// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IEntryPoint.sol";
import "../interfaces/ITalismanGame.sol";

/**
 * @title TalismanPaymaster
 * @dev Paymaster that sponsors gas for Talisman game transactions
 * Implements ERC-4337 paymaster interface
 */
contract TalismanPaymaster is Ownable, ReentrancyGuard {
    /// @dev The EntryPoint contract
    IEntryPoint public immutable entryPoint;

    /// @dev The game contract address
    address public gameContract;

    /// @dev Maximum gas cost per user operation
    uint256 public maxCostPerUserOp;

    /// @dev Daily sponsorship limit per user (in wei)
    uint256 public dailyLimitPerUser;

    /// @dev Mapping of user to daily sponsorship used
    mapping(address => uint256) public dailySponsorshipUsed;

    /// @dev Mapping of user to last reset timestamp
    mapping(address => uint256) public lastSponsorshipReset;

    /// @dev Allowed function selectors for sponsorship
    mapping(bytes4 => bool) public allowedSelectors;

    /// @dev Emitted when gas is sponsored
    event GasSponsored(address indexed user, uint256 amount);

    /// @dev Emitted when game contract is updated
    event GameContractUpdated(address indexed newGameContract);

    /// @dev Emitted when limits are updated
    event LimitsUpdated(uint256 maxCostPerUserOp, uint256 dailyLimitPerUser);

    /**
     * @dev Constructor
     * @param entryPoint_ The EntryPoint contract address
     * @param initialOwner The initial owner address
     */
    constructor(
        IEntryPoint entryPoint_,
        address initialOwner
    ) {
        _transferOwnership(initialOwner);
        entryPoint = entryPoint_;
        maxCostPerUserOp = 0.001 ether; // 0.001 ETH max per operation
        dailyLimitPerUser = 0.01 ether; // 0.01 ETH daily limit

        // Allow game function selectors
        allowedSelectors[ITalismanGame.startSession.selector] = true;
        allowedSelectors[ITalismanGame.endSession.selector] = true;
        allowedSelectors[ITalismanGame.claimRewards.selector] = true;
    }

    /**
     * @dev Validate a paymaster user operation
     * @param userOp The user operation
     * @param userOpHash The hash of the user operation
     * @param maxCost The maximum cost of the operation
     * @return context Context to pass to postOp
     * @return validationData Validation result
     */
    function validatePaymasterUserOp(
        IEntryPoint.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external returns (bytes memory context, uint256 validationData) {
        require(msg.sender == address(entryPoint), "TalismanPaymaster: not EntryPoint");

        // Suppress unused variable warning
        userOpHash;

        // Check max cost
        require(maxCost <= maxCostPerUserOp, "TalismanPaymaster: cost too high");

        // Check daily limit
        address sender = userOp.sender;
        _resetDailyLimitIfNeeded(sender);
        require(
            dailySponsorshipUsed[sender] + maxCost <= dailyLimitPerUser,
            "TalismanPaymaster: daily limit exceeded"
        );

        // Validate the call is to the game contract
        require(_validateGameCall(userOp.callData), "TalismanPaymaster: invalid call");

        // Update sponsorship used
        dailySponsorshipUsed[sender] += maxCost;

        // Return context with sender for postOp
        context = abi.encode(sender, maxCost);
        validationData = 0; // Valid
    }

    /**
     * @dev Post-operation handler
     * @param mode The post-op mode
     * @param context Context from validatePaymasterUserOp
     * @param actualGasCost The actual gas cost
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external {
        require(msg.sender == address(entryPoint), "TalismanPaymaster: not EntryPoint");

        // Suppress unused variable warning
        mode;

        (address sender, uint256 maxCost) = abi.decode(context, (address, uint256));

        // Refund unused gas allocation
        if (actualGasCost < maxCost) {
            uint256 refund = maxCost - actualGasCost;
            dailySponsorshipUsed[sender] -= refund;
        }

        emit GasSponsored(sender, actualGasCost);
    }

    /**
     * @dev Deposit ETH to the EntryPoint for gas sponsorship
     */
    function deposit() external payable onlyOwner {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    /**
     * @dev Withdraw ETH from the EntryPoint
     * @param to Address to withdraw to
     * @param amount Amount to withdraw
     */
    function withdrawTo(address payable to, uint256 amount) external onlyOwner {
        entryPoint.withdrawTo(to, amount);
    }

    /**
     * @dev Set the game contract address
     * @param gameContract_ The new game contract address
     */
    function setGameContract(address gameContract_) external onlyOwner {
        require(gameContract_ != address(0), "TalismanPaymaster: zero address");
        gameContract = gameContract_;
        emit GameContractUpdated(gameContract_);
    }

    /**
     * @dev Set sponsorship limits
     * @param maxCostPerUserOp_ Maximum cost per operation
     * @param dailyLimitPerUser_ Daily limit per user
     */
    function setLimits(
        uint256 maxCostPerUserOp_,
        uint256 dailyLimitPerUser_
    ) external onlyOwner {
        maxCostPerUserOp = maxCostPerUserOp_;
        dailyLimitPerUser = dailyLimitPerUser_;
        emit LimitsUpdated(maxCostPerUserOp_, dailyLimitPerUser_);
    }

    /**
     * @dev Add or remove an allowed function selector
     * @param selector The function selector
     * @param allowed Whether to allow or disallow
     */
    function setAllowedSelector(bytes4 selector, bool allowed) external onlyOwner {
        allowedSelectors[selector] = allowed;
    }

    /**
     * @dev Get the deposit balance in EntryPoint
     * @return The balance
     */
    function getDeposit() external view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    /**
     * @dev Get remaining daily allowance for a user
     * @param user The user address
     * @return The remaining allowance
     */
    function getRemainingDailyAllowance(address user) external view returns (uint256) {
        if (_shouldResetDailyLimit(user)) {
            return dailyLimitPerUser;
        }
        return dailyLimitPerUser - dailySponsorshipUsed[user];
    }

    /**
     * @dev Validate that the call is a valid game call
     */
    function _validateGameCall(bytes calldata callData) internal view returns (bool) {
        if (callData.length < 4) return false;

        // Decode the execute call to get the actual target and function
        // Format: execute(address dest, uint256 value, bytes calldata func)
        if (bytes4(callData[:4]) == bytes4(keccak256("execute(address,uint256,bytes)"))) {
            (address dest, , bytes memory func) = abi.decode(callData[4:], (address, uint256, bytes));

            // Check destination is game contract
            if (dest != gameContract) return false;

            // Check function selector is allowed
            if (func.length < 4) return false;
            bytes4 selector;
            assembly {
                selector := mload(add(func, 32))
            }
            return allowedSelectors[selector];
        }

        return false;
    }

    /**
     * @dev Reset daily limit if needed
     */
    function _resetDailyLimitIfNeeded(address user) internal {
        if (_shouldResetDailyLimit(user)) {
            dailySponsorshipUsed[user] = 0;
            lastSponsorshipReset[user] = block.timestamp;
        }
    }

    /**
     * @dev Check if daily limit should be reset
     */
    function _shouldResetDailyLimit(address user) internal view returns (bool) {
        return block.timestamp >= lastSponsorshipReset[user] + 1 days;
    }

    /// @dev Post-op modes
    enum PostOpMode {
        opSucceeded,
        opReverted,
        postOpReverted
    }

    /// @dev Receive ETH
    receive() external payable {}
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IEntryPoint.sol";

/**
 * @title ITalismanAccount
 * @dev Interface for ERC-4337 compliant smart account
 */
interface ITalismanAccount {
    /**
     * @dev Validate a user operation
     * @param userOp The user operation to validate
     * @param userOpHash The hash of the user operation
     * @param missingAccountFunds The amount of funds missing for gas
     * @return validationData 0 for valid signature, 1 for invalid
     */
    function validateUserOp(
        IEntryPoint.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);

    /**
     * @dev Execute a call from the account
     * @param dest The destination address
     * @param value The ETH value to send
     * @param func The function calldata
     */
    function execute(address dest, uint256 value, bytes calldata func) external;

    /**
     * @dev Execute a batch of calls from the account
     * @param dest Array of destination addresses
     * @param value Array of ETH values
     * @param func Array of function calldatas
     */
    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external;

    /**
     * @dev Initialize the account with an owner
     * @param owner The owner address
     */
    function initialize(address owner) external;

    /**
     * @dev Get the account owner
     * @return The owner address
     */
    function owner() external view returns (address);

    /**
     * @dev Get the EntryPoint address
     * @return The EntryPoint address
     */
    function entryPoint() external view returns (IEntryPoint);
}

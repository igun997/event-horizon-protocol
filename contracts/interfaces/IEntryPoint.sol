// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEntryPoint
 * @dev Minimal interface for ERC-4337 EntryPoint
 * Based on the canonical EntryPoint v0.6.0 specification
 */
interface IEntryPoint {
    /**
     * @dev User Operation struct as defined in ERC-4337
     */
    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        uint256 callGasLimit;
        uint256 verificationGasLimit;
        uint256 preVerificationGas;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        bytes paymasterAndData;
        bytes signature;
    }

    /**
     * @dev Execute a batch of UserOperations
     * @param ops Array of UserOperations to execute
     * @param beneficiary Address to receive gas refunds
     */
    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external;

    /**
     * @dev Get the nonce for a sender
     * @param sender The account address
     * @param key The nonce key (for 2D nonce)
     * @return nonce The current nonce
     */
    function getNonce(address sender, uint192 key) external view returns (uint256 nonce);

    /**
     * @dev Deposit ETH to the EntryPoint for an account
     * @param account The account to deposit for
     */
    function depositTo(address account) external payable;

    /**
     * @dev Get deposit info for an account
     * @param account The account address
     * @return deposit The deposited amount
     * @return staked Whether the account is staked
     * @return stake The staked amount
     * @return unstakeDelaySec The unstake delay in seconds
     * @return withdrawTime The withdrawal time
     */
    function getDepositInfo(address account)
        external
        view
        returns (
            uint112 deposit,
            bool staked,
            uint112 stake,
            uint32 unstakeDelaySec,
            uint48 withdrawTime
        );

    /**
     * @dev Withdraw deposited ETH
     * @param withdrawAddress Address to withdraw to
     * @param withdrawAmount Amount to withdraw
     */
    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external;

    /**
     * @dev Get the deposit balance for an account
     * @param account The account address
     * @return The balance
     */
    function balanceOf(address account) external view returns (uint256);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IEntryPoint.sol";

/**
 * @title MockEntryPoint
 * @dev Mock EntryPoint for testing ERC-4337 contracts
 */
contract MockEntryPoint is IEntryPoint {
    mapping(address => uint256) private _deposits;
    mapping(address => uint256) private _nonces;

    event UserOperationEvent(
        bytes32 indexed userOpHash,
        address indexed sender,
        address indexed paymaster,
        uint256 nonce,
        bool success,
        uint256 actualGasCost,
        uint256 actualGasUsed
    );

    /**
     * @dev Handle a batch of user operations
     */
    function handleOps(
        UserOperation[] calldata ops,
        address payable beneficiary
    ) external override {
        for (uint256 i = 0; i < ops.length; i++) {
            UserOperation calldata op = ops[i];
            bytes32 userOpHash = getUserOpHash(op);

            // Increment nonce
            _nonces[op.sender]++;

            // Execute the call - revert if it fails
            (bool success, bytes memory result) = op.sender.call(op.callData);
            if (!success) {
                // Bubble up the revert reason
                if (result.length > 0) {
                    assembly {
                        revert(add(result, 32), mload(result))
                    }
                } else {
                    revert("MockEntryPoint: inner call failed");
                }
            }

            emit UserOperationEvent(
                userOpHash,
                op.sender,
                address(0),
                op.nonce,
                success,
                0,
                0
            );
        }

        // Transfer any remaining balance to beneficiary
        if (address(this).balance > 0) {
            beneficiary.transfer(address(this).balance);
        }
    }

    /**
     * @dev Get nonce for sender
     */
    function getNonce(
        address sender,
        uint192 key
    ) external view override returns (uint256) {
        return _nonces[sender] | (uint256(key) << 64);
    }

    /**
     * @dev Deposit ETH for an account
     */
    function depositTo(address account) external payable override {
        _deposits[account] += msg.value;
    }

    /**
     * @dev Get deposit info for an account
     */
    function getDepositInfo(
        address account
    )
        external
        view
        override
        returns (
            uint112 deposit,
            bool staked,
            uint112 stake,
            uint32 unstakeDelaySec,
            uint48 withdrawTime
        )
    {
        return (uint112(_deposits[account]), false, 0, 0, 0);
    }

    /**
     * @dev Withdraw deposited ETH
     */
    function withdrawTo(
        address payable withdrawAddress,
        uint256 withdrawAmount
    ) external override {
        require(_deposits[msg.sender] >= withdrawAmount, "Insufficient deposit");
        _deposits[msg.sender] -= withdrawAmount;
        withdrawAddress.transfer(withdrawAmount);
    }

    /**
     * @dev Get balance of an account
     */
    function balanceOf(address account) external view override returns (uint256) {
        return _deposits[account];
    }

    /**
     * @dev Compute the hash of a user operation
     */
    function getUserOpHash(
        UserOperation calldata userOp
    ) public view returns (bytes32) {
        return keccak256(abi.encode(userOp, block.chainid, address(this)));
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}

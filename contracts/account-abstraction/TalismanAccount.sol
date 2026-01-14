// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "../interfaces/IEntryPoint.sol";
import "../interfaces/ITalismanAccount.sol";

/**
 * @title TalismanAccount
 * @dev ERC-4337 compliant smart account for Talisman game players
 * Allows gasless transactions through account abstraction
 */
contract TalismanAccount is ITalismanAccount, Initializable {
    using ECDSA for bytes32;

    /// @dev The account owner
    address private _owner;

    /// @dev The EntryPoint contract
    IEntryPoint private immutable _entryPoint;

    /// @dev Nonce for replay protection
    uint256 private _nonce;

    /// @dev Emitted when the account executes a call
    event Executed(address indexed target, uint256 value, bytes data);

    /// @dev Only owner or EntryPoint can call
    modifier onlyOwnerOrEntryPoint() {
        require(
            msg.sender == _owner || msg.sender == address(_entryPoint),
            "TalismanAccount: not authorized"
        );
        _;
    }

    /// @dev Only EntryPoint can call
    modifier onlyEntryPoint() {
        require(msg.sender == address(_entryPoint), "TalismanAccount: not EntryPoint");
        _;
    }

    /**
     * @dev Constructor sets the EntryPoint
     * @param entryPoint_ The EntryPoint contract address
     */
    constructor(IEntryPoint entryPoint_) {
        _entryPoint = entryPoint_;
        _disableInitializers();
    }

    /**
     * @dev Initialize the account with an owner
     * @param owner_ The owner address
     */
    function initialize(address owner_) external override initializer {
        require(owner_ != address(0), "TalismanAccount: zero owner");
        _owner = owner_;
    }

    /**
     * @dev Validate a user operation signature
     * @param userOp The user operation
     * @param userOpHash The hash of the user operation
     * @param missingAccountFunds Funds to pay for gas
     * @return validationData 0 for success, 1 for failure
     */
    function validateUserOp(
        IEntryPoint.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override onlyEntryPoint returns (uint256 validationData) {
        validationData = _validateSignature(userOp, userOpHash);
        _payPrefund(missingAccountFunds);
    }

    /**
     * @dev Execute a call from this account
     * @param dest Destination address
     * @param value ETH value to send
     * @param func Function calldata
     */
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external override onlyOwnerOrEntryPoint {
        _call(dest, value, func);
    }

    /**
     * @dev Execute multiple calls from this account
     * @param dest Array of destinations
     * @param value Array of values
     * @param func Array of calldatas
     */
    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external override onlyOwnerOrEntryPoint {
        require(
            dest.length == value.length && value.length == func.length,
            "TalismanAccount: length mismatch"
        );
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], value[i], func[i]);
        }
    }

    /**
     * @dev Get the account owner
     */
    function owner() external view override returns (address) {
        return _owner;
    }

    /**
     * @dev Get the EntryPoint
     */
    function entryPoint() external view override returns (IEntryPoint) {
        return _entryPoint;
    }

    /**
     * @dev Get the current nonce
     */
    function nonce() external view returns (uint256) {
        return _nonce;
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}

    /**
     * @dev Validate the signature of a user operation
     */
    function _validateSignature(
        IEntryPoint.UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view returns (uint256 validationData) {
        bytes32 hash = ECDSA.toEthSignedMessageHash(userOpHash);
        address signer = ECDSA.recover(hash, userOp.signature);

        if (signer != _owner) {
            return 1; // SIG_VALIDATION_FAILED
        }
        return 0; // SIG_VALIDATION_SUCCESS
    }

    /**
     * @dev Pay the prefund to the EntryPoint
     */
    function _payPrefund(uint256 missingAccountFunds) internal {
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(address(_entryPoint)).call{
                value: missingAccountFunds
            }("");
            require(success, "TalismanAccount: prefund failed");
        }
    }

    /**
     * @dev Execute a call
     */
    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        emit Executed(target, value, data);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./TalismanAccount.sol";
import "../interfaces/IEntryPoint.sol";

/**
 * @title TalismanAccountFactory
 * @dev Factory for creating TalismanAccount smart wallets using minimal proxies (EIP-1167)
 */
contract TalismanAccountFactory {
    using Clones for address;

    /// @dev The account implementation contract
    address public immutable accountImplementation;

    /// @dev The EntryPoint contract
    IEntryPoint public immutable entryPoint;

    /// @dev Mapping from owner to their account address
    mapping(address => address) public ownerToAccount;

    /// @dev Emitted when a new account is created
    event AccountCreated(address indexed owner, address indexed account);

    /**
     * @dev Constructor
     * @param entryPoint_ The EntryPoint contract address
     */
    constructor(IEntryPoint entryPoint_) {
        entryPoint = entryPoint_;
        accountImplementation = address(new TalismanAccount(entryPoint_));
    }

    /**
     * @dev Create a new account for an owner
     * @param owner The owner of the new account
     * @param salt Salt for deterministic deployment
     * @return account The created account address
     */
    function createAccount(
        address owner,
        uint256 salt
    ) external returns (address account) {
        // Check if account already exists
        address existingAccount = ownerToAccount[owner];
        if (existingAccount != address(0)) {
            return existingAccount;
        }

        // Compute deterministic address
        bytes32 saltHash = keccak256(abi.encodePacked(owner, salt));
        account = accountImplementation.cloneDeterministic(saltHash);

        // Initialize the account
        TalismanAccount(payable(account)).initialize(owner);

        // Store mapping
        ownerToAccount[owner] = account;

        emit AccountCreated(owner, account);
    }

    /**
     * @dev Get the counterfactual address for an account
     * @param owner The owner of the account
     * @param salt Salt for deterministic deployment
     * @return The predicted account address
     */
    function getAddress(
        address owner,
        uint256 salt
    ) external view returns (address) {
        // Check if already deployed
        address existingAccount = ownerToAccount[owner];
        if (existingAccount != address(0)) {
            return existingAccount;
        }

        // Predict address
        bytes32 saltHash = keccak256(abi.encodePacked(owner, salt));
        return accountImplementation.predictDeterministicAddress(saltHash);
    }

    /**
     * @dev Check if an account exists for an owner
     * @param owner The owner to check
     * @return True if account exists
     */
    function hasAccount(address owner) external view returns (bool) {
        return ownerToAccount[owner] != address(0);
    }
}

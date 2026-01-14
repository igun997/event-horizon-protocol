// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TalismanToken
 * @dev TLSM token for the Talisman game
 * Used for game session payments and rewards
 */
contract TalismanToken is ERC20, ERC20Burnable, Ownable {
    /**
     * @dev Constructor that mints initial supply to the deployer
     * @param initialOwner The address that will own the contract and receive initial supply
     * @param initialSupply The initial token supply to mint
     */
    constructor(
        address initialOwner,
        uint256 initialSupply
    ) ERC20("Talisman", "TLSM") {
        _transferOwnership(initialOwner);
        _mint(initialOwner, initialSupply);
    }

    /**
     * @dev Mint new tokens (only owner)
     * Used to replenish the reward pool
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

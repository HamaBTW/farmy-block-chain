// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title FarmCoin
/// @notice Demo payment token (FRM) for Farmy Mini. Simulated money, no real value.
/// @dev The contract owner is the market authority and the only minter.
contract FarmCoin is ERC20, Ownable {
    /// @notice Deploys the token with the deployer as market authority.
    constructor() ERC20("FarmCoin", "FRM") Ownable(msg.sender) {}

    /// @notice Mints FRM for the demo.
    /// @param to Receiver of the new tokens.
    /// @param amount Amount in base units (18 decimals).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

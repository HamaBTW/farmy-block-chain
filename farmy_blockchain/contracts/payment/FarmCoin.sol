// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FarmCoin
/// @notice Payment token (FRM) for Farmy, backed 1:1000 by ETH held in this contract.
///         Anyone buys FRM with ETH and sells it back at the same fixed rate. Test chain only.
/// @dev No owner and no free mint: FRM only comes from `buy`. Invariant: reserve == totalSupply / RATE.
contract FarmCoin is ERC20Capped, ReentrancyGuard {
    /// @notice FRM base units per wei: 1 ETH = 1000 FRM.
    uint256 public constant RATE = 1000;

    event Bought(address indexed buyer, uint256 ethIn, uint256 frmOut);
    event Sold(address indexed seller, uint256 frmIn, uint256 ethOut);

    error ZeroAmount();
    error EthTransferFailed();

    /// @param maxSupply Max FRM supply in base units (the migration uses 1,000,000 FRM).
    constructor(uint256 maxSupply) ERC20("FarmCoin", "FRM") ERC20Capped(maxSupply) {}

    /// @notice Buys FRM with the sent ETH at the fixed rate.
    /// @return frmOut FRM minted to the caller, in base units.
    function buy() external payable returns (uint256 frmOut) {
        if (msg.value == 0) revert ZeroAmount();
        frmOut = msg.value * RATE;
        _mint(msg.sender, frmOut); // ERC20Capped reverts ERC20ExceededCap above the cap
        emit Bought(msg.sender, msg.value, frmOut);
    }

    /// @notice Sells FRM back for ETH from the reserve. Only whole wei are paid; the rest stays.
    /// @param amount FRM in base units the caller wants to sell.
    /// @return ethOut Wei sent to the caller.
    function sell(uint256 amount) external nonReentrant returns (uint256 ethOut) {
        ethOut = amount / RATE;
        if (ethOut == 0) revert ZeroAmount();
        uint256 frmIn = ethOut * RATE;
        _burn(msg.sender, frmIn);
        emit Sold(msg.sender, frmIn, ethOut);
        (bool ok, ) = msg.sender.call{value: ethOut}("");
        if (!ok) revert EthTransferFailed();
    }

    /// @notice ETH held to back every FRM.
    function reserve() external view returns (uint256) {
        return address(this).balance;
    }
}

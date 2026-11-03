// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IBatchRegistry} from "../interfaces/IBatchRegistry.sol";

/// @title PriceCapEscrow
/// @notice Holds buyer FRM until delivery and caps the markup over the last declared price.
/// @dev The contract owner is the market authority. Reads the registry only through IBatchRegistry.
contract PriceCapEscrow is Ownable {
    IBatchRegistry private immutable _registry;
    IERC20 private immutable _coin;
    uint16 private _maxMarkupPercent;

    event MarkupChanged(uint16 percent);

    error ZeroAddress();

    /// @notice Deploys the escrow with the deployer as market authority.
    /// @param registryAddress Deployed BatchRegistry.
    /// @param coinAddress Deployed FarmCoin.
    /// @param initialMarkupPercent Initial max markup in percent (20 = +20%).
    constructor(address registryAddress, address coinAddress, uint16 initialMarkupPercent) Ownable(msg.sender) {
        if (registryAddress == address(0) || coinAddress == address(0)) revert ZeroAddress();
        _registry = IBatchRegistry(registryAddress);
        _coin = IERC20(coinAddress);
        _setMaxMarkup(initialMarkupPercent);
    }

    /// @notice Sets the max markup a sale may add over the last declared price.
    /// @param percent Max markup in percent (20 = +20%).
    function setMaxMarkup(uint16 percent) external onlyOwner {
        _setMaxMarkup(percent);
    }

    /// @notice Current max markup in percent.
    function maxMarkupPercent() external view returns (uint16) {
        return _maxMarkupPercent;
    }

    /// @notice Registry the escrow reads custody, validation and prices from.
    function registry() external view returns (address) {
        return address(_registry);
    }

    /// @notice Payment token.
    function coin() external view returns (address) {
        return address(_coin);
    }

    function _setMaxMarkup(uint16 percent) private {
        _maxMarkupPercent = percent;
        emit MarkupChanged(percent);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IBatchRegistry (v2)
/// @notice What PriceCapEscrow (Person B) may use from BatchRegistry (Person A).
/// @dev Shared file. Changing it after agreement needs both developers.
///      Prices are uint256 in FarmCoin base units (18 decimals).
///      Every function reverts for a batch that was never minted.
interface IBatchRegistry {
    /// @notice Last declared price of a batch (initial price, then each released sale).
    /// @param batchId The batch NFT id.
    function getLastPrice(uint256 batchId) external view returns (uint256);

    /// @notice Whether an inspector has validated the batch.
    /// @param batchId The batch NFT id.
    function isValidated(uint256 batchId) external view returns (bool);

    /// @notice Address that currently holds the physical goods.
    /// @param batchId The batch NFT id.
    function custodianOf(uint256 batchId) external view returns (address);

    /// @notice Records a completed sale price as the new last price.
    /// @dev Only callable by the escrow address set by the registry owner.
    /// @param batchId The batch NFT id.
    /// @param price Sale price in FarmCoin base units, must be > 0.
    function recordSalePrice(uint256 batchId, uint256 price) external;

    /// @notice False once a lot was split into smaller lots (it can't move or be sold any more).
    /// @param batchId The token id.
    function isActive(uint256 batchId) external view returns (bool);
}

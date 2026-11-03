// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IBatchRegistry} from "../interfaces/IBatchRegistry.sol";

/// @title MockBatchRegistry
/// @notice Test-only stand-in for BatchRegistry so the escrow can be tested before A is done.
/// @dev No access control: tests set any state directly. Never deploy outside tests.
contract MockBatchRegistry is IBatchRegistry {
    struct Batch {
        uint256 lastPrice;
        bool validated;
        address custodian;
    }

    mapping(uint256 => Batch) private _batches;
    address private _escrow;

    error UnknownBatch(uint256 batchId);
    error NotEscrow();

    /// @notice Creates or overwrites a batch.
    function setBatch(uint256 batchId, uint256 lastPrice, bool validated, address custodian) external {
        _batches[batchId] = Batch(lastPrice, validated, custodian);
    }

    /// @notice Sets the validation flag.
    function setValidated(uint256 batchId, bool validated) external {
        _batches[batchId].validated = validated;
    }

    /// @notice Moves custody.
    function setCustodian(uint256 batchId, address custodian) external {
        _batches[batchId].custodian = custodian;
    }

    /// @notice Sets the only address allowed to call `recordSalePrice`.
    function setEscrow(address escrowAddress) external {
        _escrow = escrowAddress;
    }

    /// @inheritdoc IBatchRegistry
    function getLastPrice(uint256 batchId) external view returns (uint256) {
        return _existing(batchId).lastPrice;
    }

    /// @inheritdoc IBatchRegistry
    function isValidated(uint256 batchId) external view returns (bool) {
        return _existing(batchId).validated;
    }

    /// @inheritdoc IBatchRegistry
    function custodianOf(uint256 batchId) external view returns (address) {
        return _existing(batchId).custodian;
    }

    /// @inheritdoc IBatchRegistry
    function recordSalePrice(uint256 batchId, uint256 price) external {
        if (msg.sender != _escrow) revert NotEscrow();
        _existing(batchId);
        _batches[batchId].lastPrice = price;
    }

    function _existing(uint256 batchId) private view returns (Batch storage batch) {
        batch = _batches[batchId];
        if (batch.custodian == address(0)) revert UnknownBatch(batchId);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title BatchRegistry
/// @notice One NFT per physical batch of agricultural goods (simulated assets).
///         Tracks custody, validation and the last declared price. Holds no money.
/// @dev The NFT owner is the custodian. The contract owner is the regulator.
contract BatchRegistry is ERC721URIStorage, Ownable {
    /// @dev Packed into one storage slot (16 + 1 bytes).
    struct Batch {
        uint128 lastPrice;
        bool validated;
    }

    mapping(uint256 => Batch) private _batches;
    mapping(address => bool) private _inspectors;
    address private _escrow;
    uint256 private _lastBatchId;

    /// @notice Deploys the registry with the deployer as regulator.
    constructor() ERC721("Farmy Batch", "FBATCH") Ownable(msg.sender) {}
}

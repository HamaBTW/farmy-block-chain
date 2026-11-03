// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

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

    event BatchMinted(uint256 indexed batchId, address indexed farmer);
    event CustodyTransferred(uint256 indexed batchId, address indexed from, address indexed to);
    event PriceRecorded(uint256 indexed batchId, uint256 price);

    error ZeroAddress();
    error ZeroPrice();

    /// @notice Deploys the registry with the deployer as regulator.
    constructor() ERC721("Farmy Batch", "FBATCH") Ownable(msg.sender) {}

    /// @notice Mints a new batch NFT. The receiver becomes its first custodian.
    /// @param to First custodian (usually the farmer).
    /// @param metadataURI Off-chain metadata (type, origin, quantity) URI or hash.
    /// @param initialPrice Declared price in FarmCoin base units.
    /// @return batchId The new batch id (starts at 1).
    function mintBatch(address to, string calldata metadataURI, uint256 initialPrice)
        external
        returns (uint256 batchId)
    {
        if (initialPrice == 0) revert ZeroPrice();
        // Ids start at 1 and can't realistically overflow.
        unchecked {
            batchId = ++_lastBatchId;
        }
        _batches[batchId].lastPrice = SafeCast.toUint128(initialPrice);
        _mint(to, batchId);
        _setTokenURI(batchId, metadataURI);
        emit BatchMinted(batchId, to);
        emit PriceRecorded(batchId, initialPrice);
    }

    /// @notice Hands the physical goods (and the NFT) to the next custodian.
    /// @param batchId The batch NFT id.
    /// @param newCustodian Next holder (transporter, warehouse, retailer, buyer).
    function transferCustody(uint256 batchId, address newCustodian) external {
        // OZ checks: batch exists, caller is the custodian, receiver isn't zero.
        _transfer(msg.sender, newCustodian, batchId);
    }

    /// @notice Grants or revokes the inspector role.
    /// @param account Inspector address.
    /// @param allowed True to grant, false to revoke.
    function setInspector(address account, bool allowed) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        _inspectors[account] = allowed;
    }

    /// @notice Sets the only address allowed to call `recordSalePrice` (the PriceCapEscrow).
    /// @param escrowAddress Deployed escrow contract.
    function setEscrow(address escrowAddress) external onlyOwner {
        if (escrowAddress == address(0)) revert ZeroAddress();
        _escrow = escrowAddress;
    }

    /// @notice Whether `account` is an inspector.
    /// @param account Address to check.
    function isInspector(address account) external view returns (bool) {
        return _inspectors[account];
    }

    /// @notice Address that currently holds the physical goods.
    /// @param batchId The batch NFT id.
    function custodianOf(uint256 batchId) external view returns (address) {
        return _requireOwned(batchId);
    }

    /// @notice Address allowed to record sale prices.
    function escrow() external view returns (address) {
        return _escrow;
    }

    /// @dev Every transfer is a custody change, including plain ERC-721 transfers.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = super._update(to, tokenId, auth);
        if (from != address(0)) emit CustodyTransferred(tokenId, from, to);
    }
}

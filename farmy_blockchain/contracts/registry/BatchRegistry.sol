// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IBatchRegistry} from "../interfaces/IBatchRegistry.sol";

/// @title BatchRegistry (Farm registry)
/// @notice One NFT per farm asset: land parcels, big machines, and lots of produce harvested from land.
///         Tracks custody, inspection, validation and the last declared price. Holds no money. Test chain only.
/// @dev The NFT owner is the custodian. The contract owner is the regulator (also the land office).
contract BatchRegistry is ERC721URIStorage, Ownable, IBatchRegistry {
    enum Kind {
        Land,
        Machine,
        Lot
    }

    /// @dev Slot 1: lastPrice, validated, kind, closed, landId (27 bytes). Slot 2: parentId, quantity (24 bytes).
    struct Asset {
        uint128 lastPrice;
        bool validated;
        Kind kind;
        bool closed;
        uint64 landId;
        uint64 parentId;
        uint128 quantity;
    }

    mapping(uint256 => Asset) private _assets;
    mapping(address => bool) private _inspectors;
    address private _escrow;
    uint256 private _lastId;
    uint256 public constant MAX_PARTS = 10;

    event AssetRegistered(uint256 indexed batchId, Kind kind, address indexed to);
    event LotHarvested(uint256 indexed batchId, uint256 indexed landId, uint256 quantity);
    event LotSplit(uint256 indexed batchId, uint256 indexed childId, uint256 quantity);
    event CustodyTransferred(uint256 indexed batchId, address indexed from, address indexed to);
    event CheckpointAdded(uint256 indexed batchId, address indexed inspector, bytes32 dataHash);
    event BatchValidated(uint256 indexed batchId, address indexed inspector);
    event PriceRecorded(uint256 indexed batchId, uint256 price);

    error ZeroAddress();
    error ZeroPrice();
    error NotInspector();
    error AlreadyValidated();
    error NotEscrow();
    error WrongKind();
    error NotCustodian();
    error ZeroQuantity();
    error LotClosed();
    error BadSplit();

    modifier onlyInspector() {
        if (!_inspectors[msg.sender]) revert NotInspector();
        _;
    }

    /// @notice Deploys the registry with the deployer as regulator.
    constructor() ERC721("Farmy Batch", "FBATCH") Ownable(msg.sender) {}

    /// @notice Registers a land parcel or a machine (the regulator acts as the land office).
    /// @param to First holder (usually the farmer).
    /// @param kind Land or Machine (lots come from `harvest`).
    /// @param uri Off-chain details URI or hash.
    /// @param initialPrice Declared price in FarmCoin base units.
    /// @return id The new token id (ids start at 1 and are shared by all kinds).
    function registerAsset(address to, Kind kind, string calldata uri, uint256 initialPrice) external onlyOwner returns (uint256 id) {
        if (kind == Kind.Lot) revert WrongKind();
        id = _create(to, kind, uri, initialPrice);
    }

    /// @notice Creates a lot of produce from a land parcel. The lot goes to the land holder.
    /// @param landId The land token the produce comes from.
    /// @param uri Off-chain details (product, unit, harvest date) URI or hash.
    /// @param quantity Whole units (the unit lives in the details), must be > 0.
    /// @param initialPrice Declared price of the whole lot in FarmCoin base units.
    /// @return lotId The new lot id.
    function harvest(uint256 landId, string calldata uri, uint256 quantity, uint256 initialPrice) external returns (uint256 lotId) {
        if (_requireOwned(landId) != msg.sender) revert NotCustodian();
        if (_assets[landId].kind != Kind.Land) revert WrongKind();
        if (quantity == 0) revert ZeroQuantity();
        lotId = _create(msg.sender, Kind.Lot, uri, initialPrice);
        Asset storage lot = _assets[lotId];
        lot.landId = SafeCast.toUint64(landId);
        lot.quantity = SafeCast.toUint128(quantity);
        emit LotHarvested(lotId, landId, quantity);
    }

    /// @notice Splits a lot into 2–10 smaller lots so parts can go to different places.
    ///         The parent is closed (never burned, so its history stays). Each child keeps the land,
    ///         the parent link, the validation and the URI; the price is shared in proportion.
    /// @param lotId The lot to split; the caller must hold it.
    /// @param quantities Units of each child, each > 0, adding up to the lot's quantity.
    /// @return childIds The new lot ids, in the order of `quantities`.
    function splitLot(uint256 lotId, uint256[] calldata quantities) external returns (uint256[] memory childIds) {
        if (_requireOwned(lotId) != msg.sender) revert NotCustodian();
        Asset storage parent = _assets[lotId];
        if (parent.kind != Kind.Lot) revert WrongKind();
        if (parent.closed) revert LotClosed();
        uint256 parts = quantities.length;
        if (parts < 2 || parts > MAX_PARTS) revert BadSplit();
        uint256 total;
        for (uint256 i; i < parts; ++i) {
            if (quantities[i] == 0) revert BadSplit();
            total += quantities[i];
        }
        if (total != parent.quantity) revert BadSplit();

        parent.closed = true;
        uint256 parentPrice = parent.lastPrice;
        uint256 priceLeft = parentPrice;
        string memory uri = tokenURI(lotId);
        childIds = new uint256[](parts);
        for (uint256 i; i < parts; ++i) {
            uint256 price = i == parts - 1 ? priceLeft : (parentPrice * quantities[i]) / total;
            priceLeft -= price;
            uint256 childId = _create(msg.sender, Kind.Lot, uri, price);
            _initChild(childId, lotId, quantities[i]);
            childIds[i] = childId;
            emit LotSplit(lotId, childId, quantities[i]);
        }
    }

    /// @dev Writes the per-child fields of a split (kept out of `splitLot` to avoid stack-too-deep).
    function _initChild(uint256 childId, uint256 parentId, uint256 quantity) private {
        Asset storage parent = _assets[parentId];
        Asset storage child = _assets[childId];
        child.landId = parent.landId;
        child.parentId = SafeCast.toUint64(parentId);
        child.quantity = SafeCast.toUint128(quantity);
        child.validated = parent.validated;
    }

    /// @notice Hands the asset (and the NFT) to the next holder. Closed lots can't move.
    /// @param batchId The token id.
    /// @param newCustodian Next holder.
    function transferCustody(uint256 batchId, address newCustodian) external {
        // OZ checks: token exists, caller is the holder, receiver isn't zero. `_update` refuses closed lots.
        _transfer(msg.sender, newCustodian, batchId);
    }

    /// @notice Logs an inspection checkpoint along the way. Only the hash goes on-chain.
    /// @param batchId The token id.
    /// @param dataHash Hash of the off-chain record (weight, temperature, place, time).
    function addCheckpoint(uint256 batchId, bytes32 dataHash) external onlyInspector {
        _active(batchId);
        emit CheckpointAdded(batchId, msg.sender, dataHash);
    }

    /// @notice Records the inspector's check, then validates, in one transaction (checked, then validated).
    /// @param batchId The token id.
    /// @param dataHash Hash of the off-chain check record.
    function checkAndValidate(uint256 batchId, bytes32 dataHash) external onlyInspector {
        Asset storage asset = _active(batchId);
        if (asset.validated) revert AlreadyValidated();
        asset.validated = true;
        emit CheckpointAdded(batchId, msg.sender, dataHash);
        emit BatchValidated(batchId, msg.sender);
    }

    /// @notice Records a completed sale price as the new last price.
    /// @dev Only the escrow set by the regulator may call this.
    /// @param batchId The token id.
    /// @param price Sale price in FarmCoin base units.
    function recordSalePrice(uint256 batchId, uint256 price) external {
        if (msg.sender != _escrow) revert NotEscrow();
        if (price == 0) revert ZeroPrice();
        _requireOwned(batchId);
        _assets[batchId].lastPrice = SafeCast.toUint128(price);
        emit PriceRecorded(batchId, price);
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
    function isInspector(address account) external view returns (bool) {
        return _inspectors[account];
    }

    /// @notice Kind, links and quantity of a token.
    /// @param id The token id.
    /// @return kind Land, Machine or Lot.
    /// @return landId Land a lot comes from (0 for land and machines).
    /// @return parentId Lot this lot was split from (0 if none).
    /// @return quantity Units in a lot (0 for land and machines).
    /// @return closed True once a lot was split.
    function assetInfo(uint256 id)
        external
        view
        returns (Kind kind, uint256 landId, uint256 parentId, uint256 quantity, bool closed)
    {
        _requireOwned(id);
        Asset storage a = _assets[id];
        return (a.kind, a.landId, a.parentId, a.quantity, a.closed);
    }

    /// @inheritdoc IBatchRegistry
    function isActive(uint256 batchId) external view returns (bool) {
        _requireOwned(batchId);
        return !_assets[batchId].closed;
    }

    /// @inheritdoc IBatchRegistry
    function getLastPrice(uint256 batchId) external view returns (uint256) {
        _requireOwned(batchId);
        return _assets[batchId].lastPrice;
    }

    /// @inheritdoc IBatchRegistry
    function isValidated(uint256 batchId) external view returns (bool) {
        _requireOwned(batchId);
        return _assets[batchId].validated;
    }

    /// @inheritdoc IBatchRegistry
    function custodianOf(uint256 batchId) external view returns (address) {
        return _requireOwned(batchId);
    }

    /// @notice Address allowed to record sale prices.
    function escrow() external view returns (address) {
        return _escrow;
    }

    /// @dev Mints a token with its first price. Every new token emits AssetRegistered + PriceRecorded.
    function _create(address to, Kind kind, string memory uri, uint256 price) internal returns (uint256 id) {
        if (price == 0) revert ZeroPrice();
        unchecked {
            id = ++_lastId;
        }
        Asset storage a = _assets[id];
        a.lastPrice = SafeCast.toUint128(price);
        a.kind = kind;
        _mint(to, id);
        _setTokenURI(id, uri);
        emit AssetRegistered(id, kind, to);
        emit PriceRecorded(id, price);
    }

    /// @dev Existing, not-closed token.
    function _active(uint256 id) internal view returns (Asset storage a) {
        _requireOwned(id);
        a = _assets[id];
        if (a.closed) revert LotClosed();
    }

    /// @dev Every transfer is a custody change (plain ERC-721 transfers too). Closed lots never move.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        if (_assets[tokenId].closed) revert LotClosed();
        from = super._update(to, tokenId, auth);
        if (from != address(0)) emit CustodyTransferred(tokenId, from, to);
    }
}

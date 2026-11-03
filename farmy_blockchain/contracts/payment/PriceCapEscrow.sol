// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IBatchRegistry} from "../interfaces/IBatchRegistry.sol";

/// @title PriceCapEscrow
/// @notice Holds buyer FRM until delivery and caps the markup over the last declared price.
/// @dev The contract owner is the market authority. Reads the registry only through IBatchRegistry.
contract PriceCapEscrow is Ownable, ReentrancyGuard {
    using SafeCast for uint256;
    using SafeERC20 for IERC20;

    enum SaleState {
        None,
        Created,
        Deposited,
        Released,
        Refunded
    }

    /// @dev Two storage slots: (seller, state, batchId) and (buyer, price).
    struct Sale {
        address seller;
        SaleState state;
        uint64 batchId;
        address buyer;
        uint96 price;
    }

    IBatchRegistry private immutable _registry;
    IERC20 private immutable _coin;
    uint16 private _maxMarkupPercent;
    uint64 private _lastSaleId;
    mapping(uint256 => Sale) private _sales;
    /// @dev batchId => its sale that is Created or Deposited (0 = none). One open sale per batch.
    mapping(uint256 => uint256) private _openSaleOf;

    event MarkupChanged(uint16 percent);
    event SaleCreated(uint256 indexed saleId, uint256 indexed batchId, address indexed seller, uint256 price);
    event Deposited(uint256 indexed saleId, address indexed buyer, uint256 price);
    event PaymentReleased(uint256 indexed saleId, address indexed seller, uint256 price);
    /// @dev `amount` is 0 when a sale is cancelled before any deposit.
    event Refunded(uint256 indexed saleId, address indexed buyer, uint256 amount);

    error ZeroAddress();
    error ZeroPrice();
    error NotCustodian();
    error PriceAboveCap(uint256 price, uint256 cap);
    error BatchAlreadyListed(uint256 saleId);
    error WrongState(SaleState state);
    error SellerCannotBuy();
    error NotValidated();
    error CustodyNotMoved();
    error NotAllowed();
    error ReleaseConditionsMet();

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

    /// @notice Lists a batch for sale. Only the current custodian can list it, once at a time.
    /// @param batchId The batch NFT id.
    /// @param price Sale price in FRM base units, at most lastPrice * (100 + markup) / 100.
    /// @return saleId Id of the new sale (starts at 1).
    function createSale(uint256 batchId, uint256 price) external returns (uint256 saleId) {
        if (price == 0) revert ZeroPrice();
        uint256 openSaleId = _openSaleOf[batchId];
        if (openSaleId != 0) revert BatchAlreadyListed(openSaleId);
        if (_registry.custodianOf(batchId) != msg.sender) revert NotCustodian();
        uint256 cap = (_registry.getLastPrice(batchId) * (100 + uint256(_maxMarkupPercent))) / 100;
        if (price > cap) revert PriceAboveCap(price, cap);

        saleId = ++_lastSaleId;
        _sales[saleId] = Sale(msg.sender, SaleState.Created, batchId.toUint64(), address(0), price.toUint96());
        _openSaleOf[batchId] = saleId;
        emit SaleCreated(saleId, batchId, msg.sender, price);
    }

    /// @notice Locks the sale price in escrow. The caller becomes the buyer.
    /// @dev Needs a prior FRM `approve` of at least the price to this contract.
    /// @param saleId The sale id.
    function deposit(uint256 saleId) external {
        Sale storage sale = _sales[saleId];
        SaleState state = sale.state;
        if (state != SaleState.Created) revert WrongState(state);
        if (msg.sender == sale.seller) revert SellerCannotBuy();

        sale.buyer = msg.sender;
        sale.state = SaleState.Deposited;
        uint256 price = sale.price;
        emit Deposited(saleId, msg.sender, price);
        _coin.safeTransferFrom(msg.sender, address(this), price);
    }

    /// @notice Pays the seller once the batch is validated and custody is with the buyer.
    ///         Callable by anyone; records the price as the batch's new last price.
    /// @param saleId The sale id.
    function releasePayment(uint256 saleId) external nonReentrant {
        Sale memory sale = _sales[saleId];
        if (sale.state != SaleState.Deposited) revert WrongState(sale.state);
        if (!_registry.isValidated(sale.batchId)) revert NotValidated();
        if (_registry.custodianOf(sale.batchId) != sale.buyer) revert CustodyNotMoved();

        _sales[saleId].state = SaleState.Released;
        delete _openSaleOf[sale.batchId];
        emit PaymentReleased(saleId, sale.seller, sale.price);
        _coin.safeTransfer(sale.seller, sale.price);
        _registry.recordSalePrice(sale.batchId, sale.price);
    }

    /// @notice Cancels a sale and returns any deposit to the buyer.
    ///         Created: the seller, or anyone once the seller lost custody.
    ///         Deposited: the seller any time, the buyer only while release conditions are not met.
    /// @param saleId The sale id.
    function refund(uint256 saleId) external nonReentrant {
        Sale memory sale = _sales[saleId];
        if (sale.state == SaleState.Created) {
            _checkCanCancel(sale);
        } else if (sale.state == SaleState.Deposited) {
            _checkCanRefund(sale);
        } else {
            revert WrongState(sale.state);
        }

        uint256 amount = sale.state == SaleState.Deposited ? sale.price : 0;
        _sales[saleId].state = SaleState.Refunded;
        delete _openSaleOf[sale.batchId];
        emit Refunded(saleId, sale.buyer, amount);
        if (amount != 0) _coin.safeTransfer(sale.buyer, amount);
    }

    /// @notice Full state of a sale (state None for an unknown id).
    /// @param saleId The sale id.
    function getSale(uint256 saleId) external view returns (Sale memory) {
        return _sales[saleId];
    }

    /// @notice Open (Created or Deposited) sale of a batch, 0 if none.
    /// @param batchId The batch NFT id.
    function openSaleOf(uint256 batchId) external view returns (uint256) {
        return _openSaleOf[batchId];
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

    /// @dev A stale listing (seller no longer holds the goods) can be cleared by anyone.
    function _checkCanCancel(Sale memory sale) private view {
        if (msg.sender != sale.seller && _registry.custodianOf(sale.batchId) == sale.seller) revert NotAllowed();
    }

    /// @dev Stops a buyer from taking back the money once the goods are validated and delivered.
    function _checkCanRefund(Sale memory sale) private view {
        if (msg.sender == sale.seller) return;
        if (msg.sender != sale.buyer) revert NotAllowed();
        if (_registry.isValidated(sale.batchId) && _registry.custodianOf(sale.batchId) == sale.buyer) {
            revert ReleaseConditionsMet();
        }
    }

    function _setMaxMarkup(uint16 percent) private {
        _maxMarkupPercent = percent;
        emit MarkupChanged(percent);
    }
}

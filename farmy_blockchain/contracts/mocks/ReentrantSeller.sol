// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {FarmCoin} from "../payment/FarmCoin.sol";

/// @title ReentrantSeller
/// @notice Test-only: tries to call `sell` again while FarmCoin is paying it ETH.
/// @dev Never deploy outside tests.
contract ReentrantSeller {
    FarmCoin private immutable _coin;
    bool private _reentered;

    constructor(FarmCoin coin) {
        _coin = coin;
    }

    /// @notice Buys FRM with the sent ETH, then sells half of it back.
    function buyAndSell() external payable {
        _coin.buy{value: msg.value}();
        _coin.sell(_coin.balanceOf(address(this)) / 2);
    }

    /// @dev The ETH payout lands here: try to sell again (the guard must stop it).
    receive() external payable {
        if (!_reentered) {
            _reentered = true;
            _coin.sell(1000);
        }
    }
}

//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IGasPrice.sol";

abstract contract GasThrottler {
    address public immutable gasprice;

    constructor(address _gasprice) {
        gasprice = _gasprice;
    }

    modifier gasThrottle() {
        require(tx.gasprice <= IGasPrice(gasprice).maxGasPrice(), "gas is too high!");
        _;
    }
}

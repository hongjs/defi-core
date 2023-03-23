//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract GasPrice is Ownable {
    uint256 public maxGasPrice = 15000000000; // 5 gwei

    event onNewMaxGasPrice(uint256 oldPrice, uint256 newPrice);

    function setMaxGasPrice(uint256 _maxGasPrice) external onlyOwner {
        emit onNewMaxGasPrice(maxGasPrice, _maxGasPrice);
        maxGasPrice = _maxGasPrice;
    }
}

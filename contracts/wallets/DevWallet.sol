// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/DefiToken.sol";

contract DevWallet is Ownable {
    DefiToken public defi;
    uint256 public immutable TIMELOCK;

    event Withdraw(uint256 amount);

    constructor(DefiToken _defi, uint256 _timelock) {
        defi = _defi;
        TIMELOCK = _timelock;
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(block.number > TIMELOCK, "DevWallet: Withdraw is timelocked");
        uint256 defiBal = defi.balanceOf(address(this));
        require(amount <= defiBal, "DevWallet: INSUFFICIENT_AMOUNT");
        defi.transfer(owner(), amount);

        emit Withdraw(amount);
    }
}

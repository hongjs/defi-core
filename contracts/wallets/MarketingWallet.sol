// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../tokens/DefiToken.sol";

contract MarketingWallet is Ownable, ReentrancyGuard {
    DefiToken public defi;
    address public recipient;

    event Withdraw(uint256 amount);

    constructor(DefiToken _defi, address _recipient) {
        require(_recipient != address(0), "MarketingWallet: Recipient must not equals address(0)");
        defi = _defi;
        recipient = _recipient;
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        uint256 defiBal = defi.balanceOf(address(this));
        require(amount <= defiBal, "MarketingWallet: INSUFFICIENT_AMOUNT");
        defi.transfer(recipient, amount);

        emit Withdraw(amount);
    }
}

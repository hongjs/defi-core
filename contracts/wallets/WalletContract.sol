// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../tokens/DefiToken.sol";

contract WalletContract is Ownable, ReentrancyGuard {
    string public walletName;
    DefiToken public defi;
    address public recipient;

    event onWithdraw(address recipient, uint256 amount);
    event onUpdateRecipient(address newRecipient);

    constructor(
        string memory _walletName,
        DefiToken _defi,
        address _recipient
    ) {
        require(_recipient != address(0), "WalletContract: Recipient must not equals to address(0)");
        walletName = _walletName;
        defi = _defi;
        recipient = _recipient;
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        uint256 defiBal = defi.balanceOf(address(this));
        require(amount <= defiBal, "WalletContract: INSUFFICIENT_AMOUNT");
        defi.transfer(recipient, amount);

        emit onWithdraw(recipient, amount);
    }

    function updateRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "WalletContract: Recipient must not equals to address(0)");
        recipient = _recipient;

        emit onUpdateRecipient(recipient);
    }
}

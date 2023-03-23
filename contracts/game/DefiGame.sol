// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IDefiGame.sol";
import "../tokens/GodfatherStorage.sol";
import "../tokens/PuppyStorage.sol";
import "../libraries/TransferHelper.sol";
import "../interfaces/IBEP20.sol";

abstract contract DefiGame is Ownable, IDefiGame {
    GodfatherStorage internal godfatherStorage;
    PuppyStorage internal puppyStorage;
    IBEP20 internal defiToken;
    IBEP20 public busdToken;

    function getDefiToken() external view override returns (IBEP20) {
        return defiToken;
    }

    function getGodfatherStorage() external view override returns (GodfatherStorage) {
        return godfatherStorage;
    }

    function getPuppyStorage() external view override returns (PuppyStorage) {
        return puppyStorage;
    }

    function setGodfatherStorageAddress(GodfatherStorage _godfatherStorage) external override onlyOwner {
        godfatherStorage = _godfatherStorage;
    }

    function setPuppyStorageAddress(PuppyStorage _puppyStorage) external override onlyOwner {
        puppyStorage = _puppyStorage;
    }

    function collectFee(IBEP20 _token, uint256 _amount) internal {
        uint256 balance = _token.balanceOf(msg.sender);
        require(balance >= _amount, "MiniGame: INSUFFICIENT_BALANCE");
        TransferHelper.safeTransferFrom(address(_token), msg.sender, address(this), _amount);
    }

    function withdrawDefi(uint256 _amount) external onlyOwner {
        uint256 balance = defiToken.balanceOf(address(this));
        require(balance >= _amount, "MiniGame: INSUFFICIENT_BALANCE DEFI");
        TransferHelper.safeTransfer(address(defiToken), msg.sender, _amount);
    }

    function withdrawBusd(uint256 _amount) external onlyOwner {
        uint256 balance = busdToken.balanceOf(address(this));
        require(balance >= _amount, "MiniGame: INSUFFICIENT_BALANCE BUSD");
        TransferHelper.safeTransfer(address(busdToken), msg.sender, _amount);
    }
}

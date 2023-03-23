// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/TransferHelper.sol";
import "../interfaces/IBEP20.sol";
import "./DefiLottoAwardV2.sol";

abstract contract DefiLottoCheck is ReentrancyGuard, Ownable {
    IBEP20 public defiToken;
    IBEP20 public busdToken;
    uint256 public constant MAXIMUM_ROUND = 181;
    DefiLottoAwardV2 public defiLottoAwardV2;
    mapping(uint256 => mapping(uint256 => bool)) public isTokenAlreadyClaimedReward;

    event onClaimReward(
        uint256 round,
        uint24[] indexed tokenIds,
        address claimBy,
        uint256 defiAmount,
        uint256 bnbAmount
    );
    event onWithdrawDEFI(address receiver, uint256 amount);
    event onWithdrawETH(address receiver, uint256 amount);

    // Function to receive ETH. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    function _transferDEFITo(address receiver, uint256 _amount) internal {
        uint256 balance = defiToken.balanceOf(address(this));
        require(balance >= _amount, "DefiLottoCheck: INSUFFICIENT_BALANCE DEFI");
        TransferHelper.safeTransfer(address(defiToken), receiver, _amount);
    }

    function _sendETHViaCall(address payable _to, uint256 _amount) internal {
        // Call returns a boolean value indicating success or failure.
        // This is the current recommended method to use.
        (bool sent, ) = _to.call{value: _amount}("");
        require(sent, "DefiLottoCheck: Failed to send BNB");
    }

    function withdrawAllDEFI() external nonReentrant onlyOwner {
        uint256 balance = defiToken.balanceOf(address(this));
        TransferHelper.safeTransfer(address(defiToken), msg.sender, balance);

        emit onWithdrawDEFI(msg.sender, balance);
    }

    function withdrawAllETH() external nonReentrant onlyOwner {
        // Call returns a boolean value indicating success or failure.
        // This is the current recommended method to use.
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);

        emit onWithdrawETH(msg.sender, balance);
    }

    function _getERC721OwnerAddress(IERC721 erc721ContractInterface, uint256 tokenIndex)
        internal
        view
        returns (address wonAddress)
    {
        try erc721ContractInterface.ownerOf(tokenIndex) returns (address winner) {
            // you can use variable foo here
            wonAddress = winner;
        } catch {
            wonAddress = address(0x0);
        }
    }
}

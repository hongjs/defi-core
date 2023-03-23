// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./DefiLottoCheck.sol";
import "../tokens/PuppyStorage.sol";

contract MoyLottoCheckV2 is DefiLottoCheck {
    using SafeMath for uint256;
    PuppyStorage public puppyStorage;
    uint256 public defiPrize;

    event onUpdateDefiPrize(uint256 defiPrize);

    constructor(
        DefiLottoAwardV2 _defiLottoAwardV2,
        PuppyStorage _puppyStorage,
        IBEP20 _defiAddress
    ) {
        defiLottoAwardV2 = _defiLottoAwardV2;
        puppyStorage = _puppyStorage;
        defiToken = _defiAddress;
        defiPrize = 400 ether;
    }

    function claimMultipleReward(uint8 _round, uint24[] memory _tokenIDArray) external nonReentrant {
        require(_round < MAXIMUM_ROUND, "MoyLottoCheck: RoundNumber overflow");

        (, , uint24 wonNumber, , uint16 puppyValidToken, ) = defiLottoAwardV2.getAwardResultObject(_round);

        uint256 moyWonNumber = uint256(wonNumber).mod(16);
        uint256 defiAmount = 0;
        for (uint256 i = 0; i < _tokenIDArray.length; i++) {
            uint256 _tokenID = _tokenIDArray[i];
            require(_tokenID <= puppyValidToken, "MoyLottoCheck: No Owner Found when Awarding");
            require(_tokenID.mod(16) == moyWonNumber, "MoyLottoCheck: you didn't win");

            address winnerAddress = DefiLottoCheck._getERC721OwnerAddress(puppyStorage, _tokenID);
            require(msg.sender == winnerAddress, "MoyLottoCheck: You are not the owner of the token");

            if (!isTokenAlreadyClaimedReward[_round][_tokenID]) {
                isTokenAlreadyClaimedReward[_round][_tokenID] = true;
                defiAmount = defiAmount.add(defiPrize);
            } else {
                revert("MoyLottoCheck: You've got the reward before");
            }
        }

        if (defiAmount > 0) {
            _transferDEFITo(msg.sender, defiAmount);
            emit onClaimReward(_round, _tokenIDArray, msg.sender, defiAmount, 0);
        }
    }

    function updateDefiPrize(uint256 _defiPrize) external onlyOwner {
        defiPrize = _defiPrize;

        emit onUpdateDefiPrize(defiPrize);
    }
}

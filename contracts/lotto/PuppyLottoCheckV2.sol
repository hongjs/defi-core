// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./DefiLottoCheck.sol";
import "./DefiLottoAwardV2.sol";
import "../tokens/PuppyStorage.sol";

contract PuppyLottoCheckV2 is DefiLottoCheck {
    using SafeMath for uint256;
    PuppyStorage public puppyStorage;
    uint256 public constant BNB_FINAL_PRIZE = 10 ether;

    constructor(
        DefiLottoAwardV2 _defiLottoAwardV2,
        PuppyStorage _puppyStorage,
        IBEP20 _defiAddress
    ) {
        defiLottoAwardV2 = _defiLottoAwardV2;
        puppyStorage = _puppyStorage;
        defiToken = _defiAddress;
    }

    function claimMultipleReward(uint8 _round, uint24[] memory _tokenIDArray) external nonReentrant {
        require(_round < MAXIMUM_ROUND, "PuppyLottoCheck: RoundNumber overflow");

        (, , uint24 wonNumber, , uint16 puppyValidToken, uint8 winnerSharingQuantity) = defiLottoAwardV2
            .getAwardResultObject(_round);

        uint256 puppyWonNumber = uint256(wonNumber).mod(256);
        uint256 defiAmount = 0;
        uint256 bnbAmount = 0;

        for (uint256 i = 0; i < _tokenIDArray.length; i++) {
            uint256 _tokenID = _tokenIDArray[i];
            require(_tokenID <= puppyValidToken, "PuppyLottoCheck: No Owner Found when Awarding");
            require(_tokenID.mod(256) == puppyWonNumber, "PuppyLottoCheck: you didn't win");
            require(!isTokenAlreadyClaimedReward[_round][_tokenID], "PuppyLottoCheck: You've got the reward before");

            address winnerAddress = DefiLottoCheck._getERC721OwnerAddress(puppyStorage, _tokenID);
            require(msg.sender == winnerAddress, "PuppyLottoCheck: You are not the owner of the token");

            isTokenAlreadyClaimedReward[_round][_tokenID] = true;

            if (_round == MAXIMUM_ROUND - 1) {
                bnbAmount = bnbAmount.add(BNB_FINAL_PRIZE.div(winnerSharingQuantity));
            } else {
                (uint256 defiPrize, uint256 puppyPrize) = getPuppyPrizeByRound(_round);
                if (_round % 2 == 0) {
                    defiAmount = defiAmount.add(defiPrize.div(winnerSharingQuantity));
                } else {
                    bnbAmount = bnbAmount.add(puppyPrize.div(winnerSharingQuantity));
                }
            }
        }

        if (defiAmount > 0 || bnbAmount > 0) {
            if (defiAmount > 0) _transferDEFITo(msg.sender, defiAmount);
            if (bnbAmount > 0) _sendETHViaCall(payable(msg.sender), bnbAmount);
            emit onClaimReward(_round, _tokenIDArray, msg.sender, defiAmount, bnbAmount);
        }
    }

    function getPuppyPrizeByRound(uint256 _round) internal pure returns (uint256 defiPerRound, uint256 bnbPerRound) {
        uint256[6] memory DEFI_PRIZE = [
            uint256(9_906 ether),
            9_924 ether,
            9_954 ether,
            9_996 ether,
            10_050 ether,
            10_116 ether
        ];
        uint256[6] memory BNB_PRIZE = [
            uint256(720_000_000_000_000_000),
            780_000_000_000_000_000,
            880_000_000_000_000_000,
            1_020_000_000_000_000_000,
            1_200_000_000_000_000_000,
            1_420_000_000_000_000_000
        ];

        uint256 month = _round.div(30);
        return (DEFI_PRIZE[month], BNB_PRIZE[month]);
    }
}

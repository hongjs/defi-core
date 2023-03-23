// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./DefiLottoCheck.sol";
import "../tokens/GodfatherStorage.sol";

contract GodfatherLottoCheckV2 is DefiLottoCheck {
    using SafeMath for uint256;
    GodfatherStorage public godfatherStorage;

    uint256 public constant DEFI_PRIZE = 100_000 ether;
    uint256 public constant BNB_PRIZE = 10 ether;
    uint256 public constant GODFATHER_PER_PACK = 16**6;

    constructor(
        DefiLottoAwardV2 _defiLottoAwardV2,
        GodfatherStorage _godfatherStorage,
        IBEP20 _defiAddress
    ) {
        defiLottoAwardV2 = _defiLottoAwardV2;
        godfatherStorage = _godfatherStorage;
        defiToken = _defiAddress;
    }

    function claimMultipleReward(uint8 _round, uint24[] memory _tokenIDArray) external nonReentrant {
        require(_round < MAXIMUM_ROUND, "GodfatherLottoCheck: RoundNumber overflow");

        (, , uint24 wonNumber, uint24 godfatherValidToken, , ) = defiLottoAwardV2.getAwardResultObject(_round);

        uint256 godfatherWonNumber = uint256(wonNumber).mod(GODFATHER_PER_PACK);
        require(godfatherValidToken == godfatherWonNumber, "GodfatherLottoCheck: No Winner Found when Awarding");
        require(_tokenIDArray[0] == godfatherWonNumber, "GodfatherLottoCheck: You didn't win");
        uint256 baseTicketTokenURI = godfatherStorage.getBaseTicket(wonNumber);
        address winnerAddress = _getERC721OwnerAddress(godfatherStorage, baseTicketTokenURI);
        require(msg.sender == winnerAddress, "GodfatherLottoCheck: You are not the owner of the token");

        uint256 _tokenID = baseTicketTokenURI;
        if (!isTokenAlreadyClaimedReward[_round][_tokenID]) {
            isTokenAlreadyClaimedReward[_round][_tokenID] = true;
            uint256 balance = defiToken.balanceOf(address(this));
            require(balance >= DEFI_PRIZE, "GodfatherLottoCheck: Insufficient DEFI Prize");
            _transferDEFITo(msg.sender, balance);
            _sendETHViaCall(payable(msg.sender), BNB_PRIZE);

            emit onClaimReward(_round, _tokenIDArray, msg.sender, balance, BNB_PRIZE);
        } else {
            revert("GodfatherLottoCheck: You've got the reward before");
        }
    }
}

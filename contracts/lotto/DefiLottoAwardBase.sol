// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

abstract contract DefiLottoAwardBase {
    struct AwardCounter {
        uint8 latestRound;
        uint8 latestChainlinkAwardRound;
        uint8 latestCompletedRound;
        uint32 latestAwardTimestamp;
    }

    struct AwardResultObject {
        uint8 round;
        uint32 timestamp;
        uint24 wonNumber;
        uint24 godfatherValidToken;
        uint16 puppyValidToken;
        uint8 winnerSharingQuantity;
    }

    struct ChainLinkResultObject {
        uint32 timestamp;
        uint224 randomness;
    }

    struct JackpotWonObject {
        bool isJackpotWon;
        uint8 jackpotRound;
    }
}

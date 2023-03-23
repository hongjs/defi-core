// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "./DefiStorage.sol";

contract GodfatherStorage is DefiStorage {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
    uint256[] public currentTicketNumber;

    uint256 constant seasonNumber = 1;
    uint256 constant ticketType = 6;

    uint256 constant godfatherStartSequence = 6291456;

    constructor() ERC721("Godfather", "GFT") {
        currentTicketNumber = getTicketMin();
        currentTicketNumber[0] = godfatherStartSequence;
    }

    function bulkMint(
        address player,
        uint256 r,
        uint256 mintQuantity
    ) external nonReentrant returns (uint256[] memory) {
        require(canMint[msg.sender], "GodfatherStorage: UnAuthorizeds Minter");
        uint256 isRarityAllowedToBeMint = getAllowedRarityMinting()[r];
        require(isRarityAllowedToBeMint == 1, "GodfatherStorage: Unsupported Rarity");
        uint256[] memory tokenIDArray = new uint256[](mintQuantity);
        uint256 tcur = currentTicketNumber[r];
        uint256 tokenIDIndex = 0;
        if (r == 0) {
            for (uint256 i = 0; i < mintQuantity; i++) {
                uint256 randomTokenId = random(tcur + i, godfatherStartSequence);
                if (!_exists(randomTokenId)) {
                    _mint(player, randomTokenId);
                    tokenIDArray[tokenIDIndex] = randomTokenId;
                    tokenIDIndex++;
                }
            }
        }
        uint256 tmin = getTicketMin()[r];
        uint256 tmax = getTicketMax()[r];
        uint256 trv = getTicketValue()[r];
        require(tcur >= tmin, "GodfatherStorage: Cannot Below Min Value");
        require(tcur + (trv * (mintQuantity - tokenIDIndex)) - 1 <= tmax, "GodfatherStorage: Cannot Exceed Max Value");
        for (uint256 i = tokenIDIndex; i < mintQuantity; i++) {
            _mint(player, tcur);
            tokenIDArray[i] = tcur;
            tcur += trv;
        }
        currentTicketNumber[r] = tcur;
        return tokenIDArray;
    }

    function getBaseTicket(uint256 ticket) public pure returns (uint256) {
        uint256 i = 6;
        bool foundTicket = false;
        uint256[6] memory tmin = getTicketMin();
        uint256[6] memory tmax = getTicketMax();
        uint256[6] memory trv = getTicketValue();
        uint256[6] memory rarityAllowed = getAllowedRarityMinting();
        while (i >= 1) {
            i--;
            if (rarityAllowed[i] == 0) {
                continue;
            }
            if (ticket >= tmin[i] && ticket <= tmax[i]) {
                foundTicket = true;
                break;
            }
        }
        if (foundTicket) {
            return (ticket - (ticket % trv[i]));
        } else {
            return 0;
        }
    }

    function getRarity(uint256 tokenId) public view returns (uint256 _trv) {
        require(_exists(tokenId), "GodfatherStorage: ERC721URIStorage: URI query for nonexistent token");
        uint256[6] memory tminArray = getTicketMin();
        uint256[6] memory tmaxArray = getTicketMax();
        for (uint256 i = 0; i < 6; i++) {
            if (tokenId >= tminArray[i] && tokenId <= tmaxArray[i]) {
                return i;
            }
        }
    }

    function getRarityValue(uint256 tokenId) public view returns (uint256 _trv) {
        return getTicketValue()[getRarity(tokenId)];
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "GodfatherStorage: ERC721URIStorage: URI query for nonexistent token");
        uint256 rarity = getRarity(tokenId);
        uint256[6] memory trv = getTicketValue();
        return
            string(
                abi.encodePacked(
                    '{"s":',
                    uint256ToString(seasonNumber),
                    ',"t":',
                    uint256ToString(ticketType),
                    ',"r":',
                    uint256ToString(trv[rarity]),
                    ',"n":',
                    uint256ToString(tokenId),
                    "}"
                )
            );
    }

    function getTokenInformation(uint256 tokenId)
        external
        view
        returns (
            uint256 _seasonNumber,
            uint256 _ticketType,
            uint256 _rarity,
            uint256 _ticketNumber
        )
    {
        require(_exists(tokenId), "PuppyStorage: ERC721URIStorage: URI query for nonexistent token");
        uint256 rarity = getRarity(tokenId);
        uint256[6] memory trv = getTicketValue();
        return (seasonNumber, ticketType, trv[rarity], tokenId);
    }

    function getTicketMin() private pure returns (uint256[6] memory) {
        return [uint256(0), 10485760, 0, 0, 0, 0];
    }

    function getTicketMax() private pure returns (uint256[6] memory) {
        return [uint256(10485759), 16777215, 0, 0, 0, 0];
    }

    function getTicketValue() private pure returns (uint256[6] memory) {
        return [uint256(1), 2, 0, 0, 0, 0];
    }

    function getAllowedRarityMinting() private pure returns (uint256[6] memory) {
        return [uint256(1), 1, 0, 0, 0, 0];
    }

    function random(uint256 salt, uint256 divisor) private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, salt))) % divisor;
    }
}

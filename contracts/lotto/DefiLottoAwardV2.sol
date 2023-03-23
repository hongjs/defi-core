// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../tokens/GodfatherStorage.sol";
import "../tokens/PuppyStorage.sol";
import "./DefiLottoAwardBase.sol";

contract DefiLottoAwardV2 is Ownable, ReentrancyGuard, VRFConsumerBase, DefiLottoAwardBase {
    using SafeMath for uint256;
    // # Chainlink Variable
    bytes32 private s_keyHash;
    uint256 private s_fee;
    uint256 public randomResult;

    // # Defi Variable
    uint256 public constant MAXIMUM_ROUND = 181;
    uint256 public constant GODFATHER_DIVISOR = 16**6;
    uint256 public constant PUPPY_DIVISOR = 16**2;
    address public admin;
    JackpotWonObject public jackpotWonObject;
    AwardCounter public awardCounter;
    mapping(uint256 => ChainLinkResultObject) public chainLinkResultObject;
    mapping(uint256 => AwardResultObject) public awardResultObject;

    // Storage
    GodfatherStorage public godfatherStorage;
    PuppyStorage public puppyStorage;

    // # Defi Event
    event onAwardRequest(uint256 indexed round, bytes32 indexed requestId);
    event onAwardResponse(uint256 indexed round, bytes32 indexed requestId, uint256 indexed randomResult);
    event onSetAdmin(address newAdmin);
    event onSetFee(uint256 newFee);
    event onWithdrawLINK(address recipient, uint256 amount);
    event onPushValidTicket(
        uint8 latestCompletedRound,
        uint24 godfatherValidTokenIndex,
        uint16 puppyValidTokenIndex,
        uint8 puppySharingHolder
    );

    modifier onlyAdmin() {
        require(admin == msg.sender, "defiLottoAwardV2: caller is not the admin");
        _;
    }

    constructor(
        address vrfCoordinator,
        address link,
        bytes32 keyHash,
        uint256 fee,
        GodfatherStorage _godfatherStorage,
        PuppyStorage _puppyStorage
    ) VRFConsumerBase(vrfCoordinator, link) {
        s_keyHash = keyHash;
        s_fee = fee;
        godfatherStorage = _godfatherStorage;
        puppyStorage = _puppyStorage;
        admin = msg.sender;
    }

    function setAdmin(address _admin) external onlyOwner {
        admin = _admin;
        emit onSetAdmin(admin);
    }

    function setChainLinkFee(uint256 _fee) external onlyOwner {
        s_fee = _fee;
        emit onSetFee(s_fee);
    }

    function awardWinnerByChainLink() external onlyAdmin nonReentrant returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= s_fee, "DefiChainlinkVRFConsumer: Not enough LINK to pay fee");
        // Read Storage
        AwardCounter memory _awardCounter = awardCounter;

        // Update Memory
        require(
            block.timestamp >= _awardCounter.latestAwardTimestamp + 20 hours,
            "defiLottoAwardV2: block.timestamp less than timelock"
        );
        require(_awardCounter.latestRound < MAXIMUM_ROUND, "defiLottoAwardV2: No more round lefts");
        require(
            _awardCounter.latestRound == _awardCounter.latestCompletedRound,
            "defiLottoAwardV2: Awarding in Progress"
        );

        requestId = requestRandomness(s_keyHash, s_fee);
        emit onAwardRequest(_awardCounter.latestRound, requestId);

        // Write to Storage
        _awardCounter.latestAwardTimestamp = uint32(block.timestamp);
        _awardCounter.latestRound++;
        awardCounter = _awardCounter;
    }

    /**
     * Callback function used by VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        uint256 currentTime = block.timestamp;
        randomResult = randomness;

        // Read Storage
        AwardCounter memory _awardCounter = awardCounter;

        // Update Memory
        ChainLinkResultObject memory _chainLinkResultObject;
        _chainLinkResultObject.timestamp = uint32(currentTime);
        _chainLinkResultObject.randomness = uint224(randomness);

        // Write to Storage
        chainLinkResultObject[_awardCounter.latestChainlinkAwardRound] = _chainLinkResultObject;

        // Emit Event
        emit onAwardResponse(_awardCounter.latestChainlinkAwardRound, requestId, randomness);

        // Update to Memory & Write to Storage
        _awardCounter.latestChainlinkAwardRound++;
        awardCounter = _awardCounter;
    }

    function _getPuppyValidTokenAndSharingHolder(uint256 puppyWonNumber)
        internal
        view
        returns (uint256 puppyValidTokenId, uint256 sharingHolder)
    {
        uint128 currentPack;
        uint128 nextTicketNumber;
        (currentPack, nextTicketNumber) = puppyStorage.puppyCounter();
        uint256 tokenId = (currentPack * PUPPY_DIVISOR) + nextTicketNumber;
        uint256 _puppyValidTokenId;
        if (tokenId == 0) {
            _puppyValidTokenId = 0;
        } else {
            _puppyValidTokenId = tokenId - 1;
        }

        uint256 _sharingHolder;
        if (puppyWonNumber >= nextTicketNumber) {
            _sharingHolder = currentPack;
        } else {
            _sharingHolder = currentPack + 1;
        }

        return (_puppyValidTokenId, _sharingHolder);
    }

    function pushValidTicket() external onlyAdmin nonReentrant {
        // Read Storage
        AwardCounter memory _awardCounter = awardCounter;
        ChainLinkResultObject memory _chainLinkResultObject = chainLinkResultObject[_awardCounter.latestCompletedRound];
        JackpotWonObject memory _jackpotWonObject = jackpotWonObject;

        // Update Memory
        require(
            _awardCounter.latestCompletedRound < _awardCounter.latestRound,
            "defiLottoAwardV2: completedRound should less than latestRound"
        );

        // Get : Godfather Valid Token
        uint256 _godfatherValidTokenIndex;
        uint256 godfatherWonNumber = _chainLinkResultObject.randomness % GODFATHER_DIVISOR;
        uint256 godfataherBaseTicket = godfatherStorage.getBaseTicket(godfatherWonNumber);
        try godfatherStorage.ownerOf(godfataherBaseTicket) returns (address) {
            if (_jackpotWonObject.isJackpotWon == false) {
                _godfatherValidTokenIndex = godfatherWonNumber;
                _jackpotWonObject.isJackpotWon = true;
                _jackpotWonObject.jackpotRound = _awardCounter.latestCompletedRound;
                // write storage
                jackpotWonObject = _jackpotWonObject;
            } else {
                _godfatherValidTokenIndex = 0;
            }
        } catch {
            _godfatherValidTokenIndex = 0;
        }

        // Get : Puppy Valid Token
        uint256 puppyWonNumber = _chainLinkResultObject.randomness % PUPPY_DIVISOR;
        uint256 _puppyValidTokenIndex;
        uint256 _puppySharingHolder;
        (_puppyValidTokenIndex, _puppySharingHolder) = _getPuppyValidTokenAndSharingHolder(puppyWonNumber);

        AwardResultObject memory _awardResultObject = AwardResultObject({
            round: _awardCounter.latestCompletedRound,
            timestamp: _chainLinkResultObject.timestamp,
            wonNumber: uint24(_chainLinkResultObject.randomness),
            godfatherValidToken: uint24(_godfatherValidTokenIndex),
            puppyValidToken: uint16(_puppyValidTokenIndex),
            winnerSharingQuantity: uint8(_puppySharingHolder)
        });

        // Write to Storage
        awardResultObject[_awardCounter.latestCompletedRound] = _awardResultObject;

        // Emit Event
        emit onPushValidTicket(
            _awardCounter.latestCompletedRound,
            uint24(_godfatherValidTokenIndex),
            uint16(_puppyValidTokenIndex),
            uint8(_puppySharingHolder)
        );

        // Update to Memory & Write to Storage
        _awardCounter.latestCompletedRound++;
        awardCounter = _awardCounter;
    }

    function getAwardResultObject(uint256 _round)
        external
        view
        returns (
            uint8 round,
            uint32 timestamp,
            uint24 wonNumber,
            uint24 godfatherValidToken,
            uint16 puppyValidToken,
            uint8 winnerSharingQuantity
        )
    {
        return (
            awardResultObject[_round].round,
            awardResultObject[_round].timestamp,
            awardResultObject[_round].wonNumber,
            awardResultObject[_round].godfatherValidToken,
            awardResultObject[_round].puppyValidToken,
            awardResultObject[_round].winnerSharingQuantity
        );
    }

    function getAwardCounter()
        external
        view
        returns (
            uint8 latestRound,
            uint8 latestChainlinkAwardRound,
            uint8 latestCompletedRound,
            uint32 latestAwardTimestamp
        )
    {
        return (
            awardCounter.latestRound,
            awardCounter.latestChainlinkAwardRound,
            awardCounter.latestCompletedRound,
            awardCounter.latestAwardTimestamp
        );
    }

    function getChainLinkResultObject(uint256 _round) external view returns (uint32 timestamp, uint224 randomness) {
        return (chainLinkResultObject[_round].timestamp, chainLinkResultObject[_round].randomness);
    }

    function withdrawLINK() external onlyOwner nonReentrant {
        uint256 amount = LINK.balanceOf(address(this));
        require(LINK.transfer(admin, amount), "defiLottoAwardV2: Unable to transfer LINK");

        emit onWithdrawLINK(admin, amount);
    }

    function setExpireGodfather(uint8 _round) external onlyAdmin {
        require(
            block.timestamp >= awardResultObject[_round].timestamp + 30 days,
            "defiLottoAwardV2: block.timestamp less than timelock"
        );
        awardResultObject[_round].godfatherValidToken = 0;
        jackpotWonObject = JackpotWonObject(false, 0);
    }
}

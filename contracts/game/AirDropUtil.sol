// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./DefiGame.sol";
import "../interfaces/IBEP20.sol";

contract AirDropUtil is DefiGame, ReentrancyGuard {
    IBEP20 public refToken;
    uint256 public airDropCounter;
    uint256 public freeAirDropCounter;
    uint256 public minimumBalance;
    uint256 public maxAirDropQuota;
    uint256 public immutable TIMELOCK;
    mapping(string => bool) private ipAddresses;
    mapping(address => bool) public gotAirDrop;

    constructor(
        GodfatherStorage _godfatherStorage,
        IBEP20 _refToken,
        uint256 _timelock
    ) {
        godfatherStorage = _godfatherStorage;
        refToken = _refToken;
        minimumBalance = 200 ether;
        maxAirDropQuota = 512;
        TIMELOCK = _timelock;
    }

    function setMinimumBalance(uint256 value) external onlyOwner {
        minimumBalance = value;
    }

    function setQuota(uint256 value) external onlyOwner {
        maxAirDropQuota = value;
    }

    function getAirDrop(string memory ipAddress) external returns (uint256[] memory) {
        require(block.number > TIMELOCK, "AirDropUtil: airdrop is timelocked");
        require(keccak256(bytes(ipAddress)) != keccak256(bytes("")), "AirDropUtil: Invalid parameter");
        require(gotAirDrop[msg.sender] == false, "AirDropUtil: You have got the reward before");
        require(ipAddresses[ipAddress] == false, "AirDropUtil: You have got the reward before");

        uint256 _airDropCounter = airDropCounter;
        require(_airDropCounter < maxAirDropQuota, "AirDropUtil: No Quota Left");

        require(refToken.balanceOf(msg.sender) >= minimumBalance, "AirDropUtil: INSUFFICIENT_BALANCE");

        _airDropCounter++;
        uint256[] memory tokenIds = mintGodfather(0, 1);

        // Update Storage
        gotAirDrop[msg.sender] = true;
        ipAddresses[ipAddress] = true;
        airDropCounter = _airDropCounter;

        return tokenIds;
    }

    function getFreeAirDrop(string memory ipAddress) external returns (uint256[] memory) {
        require(block.number > TIMELOCK, "AirDropUtil: airdrop is timelocked");
        require(keccak256(bytes(ipAddress)) != keccak256(bytes("")), "AirDropUtil: Invalid parameter");
        require(gotAirDrop[msg.sender] == false, "AirDropUtil: You have got the reward before");
        require(ipAddresses[ipAddress] == false, "AirDropUtil: You have got the reward before");
        require(freeAirDropCounter < maxAirDropQuota, "AirDropUtil: No Quota Left");

        // Update Storage
        gotAirDrop[msg.sender] = true;
        ipAddresses[ipAddress] = true;
        freeAirDropCounter++;

        uint256[] memory tokenIds = mintGodfather(0, 1);
        return tokenIds;
    }

    function mintGodfather(uint256 rarity, uint256 quantity) private nonReentrant returns (uint256[] memory) {
        uint256[] memory tokenIds = godfatherStorage.bulkMint(msg.sender, rarity, quantity);
        return tokenIds;
    }
}

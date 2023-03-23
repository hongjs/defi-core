// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DefiStorage.sol";

// import "hardhat/console.sol";

contract PuppyStorage is DefiStorage {
    // Pupppy Counter
    struct PuppyCounter {
        uint128 currentPack;
        uint128 nextTicketNumber;
    }

    uint256 constant seasonNumber = 1;
    uint256 constant ticketType = 2;
    uint256 constant ticketDivider = 256;

    uint256 public maxPackAllowed = 10;

    PuppyCounter public puppyCounter;

    constructor() ERC721("Puppy", "PUP") {
        puppyCounter = PuppyCounter({currentPack: 0, nextTicketNumber: 0});
    }

    function getTicketSharingAddress(uint256 puppyNumber) public view returns (address[] memory) {
        PuppyCounter memory _puppyCounter = puppyCounter;
        uint256 holderQuantity = _puppyCounter.currentPack + 1;
        if (puppyNumber >= _puppyCounter.nextTicketNumber) {
            holderQuantity--;
        }

        address[] memory sharingHolder = new address[](holderQuantity);
        for (uint256 i = 0; i < holderQuantity; i++) {
            uint256 tokenId = (i * ticketDivider) + puppyNumber;
            //console.log("i: %d, tokenId: %d", i, tokenId);
            sharingHolder[i] = ownerOf(tokenId);
        }
        return sharingHolder;
    }

    function setMaxPackAllowed(uint256 value) external onlyOwner {
        maxPackAllowed = value;
    }

    function mint(address player) public nonReentrant returns (uint256) {
        require(canMint[msg.sender], "PuppyStorage: UnAuthorized Minter");
        PuppyCounter memory _puppyCounter = puppyCounter;
        require(_puppyCounter.currentPack <= maxPackAllowed, "PuppyStorage: No more pack left");

        uint256 tokenId = (_puppyCounter.currentPack * 256) + _puppyCounter.nextTicketNumber;
        _mint(player, tokenId);
        // _setTokenURI(
        //     tokenId,
        //     string(
        //         abi.encodePacked(
        //             '{"s":',
        //             uint256ToString(1),
        //             ',"t":',
        //             uint256ToString(2),
        //             ',"p":',
        //             uint256ToString(_puppyCounter.currentPack),
        //             ',"n":',
        //             uint256ToString(_puppyCounter.nextTicketNumber),
        //             "}"
        //         )
        //     )
        // );

        // if nextTicketNumber > 255 , Start New Pack
        _puppyCounter.nextTicketNumber++;
        if (_puppyCounter.nextTicketNumber > 255) {
            // Start New Pack
            puppyCounter = PuppyCounter({currentPack: ++_puppyCounter.currentPack, nextTicketNumber: 0});
        } else {
            puppyCounter = _puppyCounter;
        }

        return tokenId;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "PuppyStorage: ERC721URIStorage: URI query for nonexistent token");
        uint256 _pack;
        uint256 _ticketNumber;
        (_pack, _ticketNumber) = getPackAndNumber(tokenId);

        return
            string(
                abi.encodePacked(
                    '{"s":',
                    uint256ToString(seasonNumber),
                    ',"t":',
                    uint256ToString(ticketType),
                    ',"p":',
                    uint256ToString(_pack),
                    ',"n":',
                    uint256ToString(_ticketNumber),
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
            uint256 _pack,
            uint256 _ticketNumber
        )
    {
        require(_exists(tokenId), "PuppyStorage: ERC721URIStorage: URI query for nonexistent token");
        uint256 __pack;
        uint256 __ticketNumber;
        (__pack, __ticketNumber) = getPackAndNumber(tokenId);

        return (seasonNumber, ticketType, __pack, __ticketNumber);
    }

    function getPackAndNumber(uint256 tokenId) public pure returns (uint256, uint256) {
        uint256 _remainder = tokenId / ticketDivider;
        uint256 _modulus = tokenId % ticketDivider;
        return (_remainder, _modulus);
    }
}

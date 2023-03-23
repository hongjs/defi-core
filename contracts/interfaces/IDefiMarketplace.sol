// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDefiMarketplace {
    function createListing(
        uint256 _tokenId,
        uint256 _startingPrice,
        uint256 _endingPrice,
        uint256 _duration
    ) external;

    function purchase(uint256 _tokenId, uint256 _amount) external;

    function cancelListing(uint256 _tokenId) external;
}

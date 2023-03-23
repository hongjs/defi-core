// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IDefiStorage.sol";

abstract contract DefiStorage is ERC721Enumerable, Ownable, IDefiStorage, ReentrancyGuard {
    // ERC721 TokenURI Storage
    // mapping(uint256 => string) private _tokenURIs;
    mapping(address => bool) public canMint;

    function burn(uint256 tokenId) private {
        _burn(tokenId);
    }

    function addCanMint(address minter) external override onlyOwner {
        canMint[minter] = true;
    }

    function removeCanMint(address minter) external override onlyOwner {
        canMint[minter] = false;
    }

    // function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
    //     require(_exists(tokenId), "DefiStorage: ERC721URIStorage: URI set of nonexistent token");
    //     _tokenURIs[tokenId] = _tokenURI;
    // }

    // function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    //     require(_exists(tokenId), "DefiStorage: ERC721URIStorage: URI query for nonexistent token");
    //     return _tokenURIs[tokenId];
    // }

    function uint256ToString(uint256 value) internal pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT licence
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

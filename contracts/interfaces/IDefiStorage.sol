// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDefiStorage {
    function addCanMint(address minter) external;

    function removeCanMint(address minter) external;
}

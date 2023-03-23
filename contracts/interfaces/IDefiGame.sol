// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IBEP20.sol";
import "../tokens/GodfatherStorage.sol";
import "../tokens/PuppyStorage.sol";

interface IDefiGame {
    function getDefiToken() external view returns (IBEP20);

    function getGodfatherStorage() external view returns (GodfatherStorage);

    function getPuppyStorage() external view returns (PuppyStorage);

    function setGodfatherStorageAddress(GodfatherStorage _godfatherStorage) external;

    function setPuppyStorageAddress(PuppyStorage _puppyStorage) external;
}

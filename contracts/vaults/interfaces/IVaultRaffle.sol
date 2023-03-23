//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVaultRaffle {
    function deposit(uint256 amount) external;

    function awardWinnerByChainLink() external;

    function drawAward(address vaultHelper) external;
}

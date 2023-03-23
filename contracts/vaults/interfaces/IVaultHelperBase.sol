//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVaultHelperBase {
    function depositWETHFromPrize(
        address vault,
        uint256 wethAmount,
        uint256 tokenAmountOutMin
    ) external;
}

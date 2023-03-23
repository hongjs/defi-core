//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IVaultHelperBase.sol";

interface IVaultHelper is IVaultHelperBase {
    function depositFromETH(address vault, uint256 tokenAmountOutMin) external payable;

    function depositFromToken(
        address vault,
        address tokenIn,
        uint256 tokenInAmount,
        uint256 tokenAmountOutMin
    ) external;

    function withdrawToTokens(address vault, uint256 withdrawAmount) external;

    function withdrawToToken(
        address vault,
        uint256 withdrawAmount,
        address desiredToken,
        uint256 desiredTokenOutMin
    ) external;

    function withdrawAllToToken(
        address vault,
        address desiredToken,
        uint256 desiredTokenOutMin
    ) external;

    function withdrawAllToTokens(address vault) external;
}

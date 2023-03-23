//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IVaultStrategy.sol";

interface IDefiVault is IERC20 {
    function deposit(uint256 amount) external;

    function withdraw(uint256 shares) external;

    function want() external view returns (IERC20);

    function earn() external;

    function strategy() external view returns (IVaultStrategy);
}

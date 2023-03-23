// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMasterChefKSW {
    function kswPerSecond() external view returns (uint256);

    function totalAllocPoint() external view returns (uint256);

    function poolInfo(address _izlude)
        external
        view
        returns (
            IERC20 want,
            address izlude,
            uint256 accKSWPerJellopy,
            uint64 allocPoint,
            uint64 lastRewardTime
        );

    function userInfo(address _izlude, address _user)
        external
        view
        returns (
            uint256 jellopy,
            uint256 rewardDebt,
            uint256 storedJellopy
        );

    function totalPool() external view returns (uint256);

    function harvest(address[] calldata izludes) external;

    function withdraw(address izlude, uint256 jellopyAmount) external;

    function deposit(address izlude, uint256 amount) external;

    function emergencyWithdraw(address izlude) external;

    function pendingKSW(address _izlude, address _user) external view returns (uint256);
}

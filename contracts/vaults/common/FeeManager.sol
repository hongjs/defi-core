//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./StratManager.sol";

abstract contract FeeManager is StratManager {
    uint256 public constant MAX_FEE = 1000;
    uint256 public constant WITHDRAWAL_FEE_CAP = 10;
    uint256 public constant WITHDRAWAL_MAX = 10000;

    uint256 public withdrawLock = 10 days;
    uint256 public withdrawalFee = 10;
    uint256 public earlyWithdrawalFee = 250;
    uint256 public devFee = 150;
    uint256 public platformFee = MAX_FEE - devFee;

    uint256 public raffleRatio = 5000;
    uint256 public MAX_RAFFLE_RATIO = 10000;

    event onSetWithdrawalFee(uint256 newFee);
    event onSetEarlyWithdrawalFee(uint256 newFee);
    event onSetWithdrawLock(uint256 withdrawLock);
    event onSetDevFee(uint256 newDevFee, uint256 newPlaformFee);
    event onSetRaffleRatio(uint256 newRatio);

    function setWithdrawalFee(uint256 _fee) external onlyManager {
        require(_fee <= WITHDRAWAL_FEE_CAP, "!cap");
        withdrawalFee = _fee;

        emit onSetWithdrawalFee(withdrawalFee);
    }

    function setEarlyWithdrawalFee(uint256 _fee) external onlyManager {
        require(_fee <= MAX_FEE, "!cap");
        earlyWithdrawalFee = _fee;

        emit onSetEarlyWithdrawalFee(earlyWithdrawalFee);
    }

    function setDevFee(uint256 _devFee) external onlyManager {
        require(_devFee <= MAX_FEE);
        devFee = _devFee;
        platformFee = MAX_FEE - _devFee;

        emit onSetDevFee(devFee, platformFee);
    }

    function setRaffleRatio(uint256 _ratio) external onlyManager {
        require(_ratio <= MAX_RAFFLE_RATIO, "!ratio");

        raffleRatio = _ratio;
        emit onSetRaffleRatio(raffleRatio);
    }

    function setWithdrawLock(uint256 _withdrawLock) external onlyManager {
        withdrawLock = _withdrawLock;

        emit onSetWithdrawLock(withdrawLock);
    }
}

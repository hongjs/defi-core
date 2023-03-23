// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "../interfaces/IMasterChefKSW.sol";
import "../interfaces/IVaultRaffle.sol";
import "../interfaces/IIzludeV2.sol";
import "../common/FeeManager.sol";
import "../common/GasThrottler.sol";
import "../common/StratManager.sol";

contract DefiKSWStrategy is StratManager, FeeManager, GasThrottler, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Tokens used
    IERC20 public wbnb;
    IERC20 public output;
    IERC20 public want;

    // Third party contracts
    IMasterChefKSW public masterchef;
    address public kswIzlude;
    // Routes
    address[] outputToWbnbRoute;
    address[] outputToWantRoute;
    address[] wbnbToWantRoute;
    bool public harvestOnDeposit;

    // User's latest deposit time
    mapping(address => uint256) public userDepositTime;

    /**
     * @dev Event that is fired each time someone harvests the strat.
     */
    event onStratHarvest(address indexed harvester, uint256 indexed timestamp);
    event onReceiveWbnbFromRaffle(uint256 wbnbAmount);

    constructor(
        address _want,
        address _masterchef,
        address _router,
        address _wbnb,
        address _outputToken,
        address _keeper,
        address _devWallet,
        address _feeRecipient,
        address _gasPrice,
        address _raffle,
        address _kswIzlude
    ) StratManager(_router, _keeper, _devWallet, _feeRecipient, _raffle) GasThrottler(_gasPrice) {
        want = IERC20(_want);
        masterchef = IMasterChefKSW(_masterchef);
        wbnb = IERC20(_wbnb);
        output = IERC20(_outputToken);
        outputToWbnbRoute = [_outputToken, _wbnb];
        outputToWantRoute = [_outputToken, _wbnb, _want];
        if (_want != _wbnb) {
            wbnbToWantRoute = [_wbnb, _want];
        }

        kswIzlude = _kswIzlude;
        harvestOnDeposit = true;

        _giveAllowances();
    }

    function beforeDeposit() external override {
        if (harvestOnDeposit) {
            harvest();
        }
    }

    // puts the funds to work
    function deposit() public whenNotPaused nonReentrant {
        uint256 wantBal = want.balanceOf(address(this));

        if (wantBal > 0) {
            masterchef.deposit(kswIzlude, wantBal);

            if (msg.sender == vault) {
                userDepositTime[tx.origin] = block.timestamp;
            }
        }
    }

    /**
     * @param _amount amount of want to withdraw
     */
    function withdraw(uint256 _amount) external nonReentrant {
        require(msg.sender == vault, "!vault");

        uint256 wantBal = want.balanceOf(address(this));

        if (wantBal < _amount) {
            uint256 _jellopy = wantToJellopy(_amount.sub(wantBal));
            masterchef.withdraw(kswIzlude, _jellopy);
            wantBal = want.balanceOf(address(this));
        }

        if (wantBal > _amount) {
            wantBal = _amount;
        }

        bool isEarly = block.timestamp < userDepositTime[tx.origin].add(withdrawLock);
        if (tx.origin == owner() || paused()) {
            want.safeTransfer(vault, wantBal);
        } else if (isEarly) {
            uint256 withdrawalFeeAmount = wantBal.mul(earlyWithdrawalFee).div(WITHDRAWAL_MAX);
            want.safeTransfer(vault, wantBal.sub(withdrawalFeeAmount));
            want.safeTransfer(feeRecipient, withdrawalFeeAmount);
        } else {
            uint256 withdrawalFeeAmount = wantBal.mul(withdrawalFee).div(WITHDRAWAL_MAX);
            want.safeTransfer(vault, wantBal.sub(withdrawalFeeAmount));
            want.safeTransfer(feeRecipient, withdrawalFeeAmount);
        }
    }

    // compounds earnings and charges performance fee
    function harvest() public whenNotPaused {
        require(tx.origin == msg.sender || msg.sender == vault, "!contract");

        address[] memory wants = new address[](1);
        wants[0] = address(kswIzlude);
        masterchef.harvest(wants);
        uint256 outputBal = output.balanceOf(address(this));
        if (outputBal > 0) {
            (uint256 feeAmountWbnb, uint256 raffleAmountWbnb) = _outputFeeToWbnb();
            _chargeFees(feeAmountWbnb);
            _collectRaffle(raffleAmountWbnb);
            _outputToWant();
            deposit();
            emit onStratHarvest(msg.sender, block.timestamp);
        }
    }

    function afterReceiveWbnbFromRaffle(uint256 returnAmount) external onlyRaffle {
        uint256 wbnbBalance = wbnb.balanceOf(address(this));
        uint256 _balance = returnAmount <= wbnbBalance ? returnAmount : wbnbBalance;

        if (_balance > 0) {
            // Swap want to WBNB
            if (address(want) != address(wbnb)) {
                IUniswapV2Router02(router).swapExactTokensForTokens(
                    _balance,
                    0,
                    wbnbToWantRoute,
                    address(this),
                    block.timestamp
                );
            }
            // deposit want
            deposit();
        }
        emit onReceiveWbnbFromRaffle(_balance);
    }

    // swap output to wbnb only 1 time, reduce gas fee
    function _outputFeeToWbnb() internal returns (uint256 feeAmountWbnb, uint256 raffleAmountWbnb) {
        uint256 outputBalance = output.balanceOf(address(this));
        uint256 feeAmount = outputBalance.mul(35).div(1000);
        uint256 raffleAmount = outputBalance.sub(feeAmount).mul(raffleRatio).div(MAX_RAFFLE_RATIO);
        uint256 amountToWbnb = feeAmount.add(raffleAmount);
        IUniswapV2Router02(router).swapExactTokensForTokens(
            amountToWbnb,
            0,
            outputToWbnbRoute,
            address(this),
            block.timestamp
        );
        uint256 wbnbBalance = wbnb.balanceOf(address(this));
        feeAmountWbnb = wbnbBalance.mul(feeAmount).div(amountToWbnb);
        raffleAmountWbnb = wbnbBalance.sub(feeAmountWbnb);
    }

    // performance fees
    function _chargeFees(uint256 fee) internal {
        // send 85% of fee to Platform reserve
        uint256 platformFeeAmount = fee.mul(platformFee).div(MAX_FEE);
        wbnb.safeTransfer(feeRecipient, platformFeeAmount);

        // send 15% of fee to DevFee wallet
        uint256 devFeeAmount = fee.sub(platformFeeAmount);
        wbnb.safeTransfer(devWallet, devFeeAmount);
    }

    // Convert Output token to want
    function _outputToWant() internal {
        uint256 outputBal = output.balanceOf(address(this));

        if (outputBal > 0 && address(want) != address(output)) {
            IUniswapV2Router02(router).swapExactTokensForTokens(
                outputBal,
                0,
                outputToWantRoute,
                address(this),
                block.timestamp
            );
        }
    }

    // Store 50% of output to Raffle
    function _collectRaffle(uint256 fee) internal {
        if (fee > 0) {
            IVaultRaffle(raffle).deposit(fee);
        }
    }

    // calculate the total underlaying 'want' held by the strat.
    function balanceOf() public view returns (uint256) {
        return balanceOfWant().add(balanceOfPool());
    }

    // it calculates how much 'want' this contract holds.
    function balanceOfWant() public view returns (uint256) {
        return want.balanceOf(address(this));
    }

    // it calculates how much 'want' the strategy has working in the farm.
    function balanceOfPool() public view returns (uint256) {
        (uint256 _jellopy, , ) = masterchef.userInfo(kswIzlude, address(this));
        return jellopyToWant(_jellopy);
    }

    function setHarvestOnDeposit(bool _harvestOnDeposit) external onlyManager {
        harvestOnDeposit = _harvestOnDeposit;
    }

    /**
     * @dev convert jellopy amount to want amount
     * @param _jellopy jellopy amount of Prontera
     */
    function jellopyToWant(uint256 _jellopy) public view returns (uint256 wantAmount) {
        uint256 balance = IIzludeV2(kswIzlude).balance();
        uint256 totalSupply = IIzludeV2(kswIzlude).totalSupply();
        wantAmount = totalSupply == 0 ? 0 : _jellopy.mul(balance).div(totalSupply);
    }

    /**
     * @dev convert want amount to jellopy amount
     * @param _wantAmount want amount
     */
    function wantToJellopy(uint256 _wantAmount) public view returns (uint256 jellopyAmount) {
        uint256 balance = IIzludeV2(kswIzlude).balance();
        uint256 totalSupply = IIzludeV2(kswIzlude).totalSupply();
        jellopyAmount = balance == 0 ? 0 : _wantAmount.mul(totalSupply).div(balance);
    }

    // called as part of strat migration. Sends all the available funds back to the vault.
    function retireStrat() external {
        require(msg.sender == vault, "!vault");

        masterchef.emergencyWithdraw(kswIzlude);

        uint256 wantBal = want.balanceOf(address(this));
        want.transfer(vault, wantBal);
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        pause();
        masterchef.emergencyWithdraw(kswIzlude);
    }

    function pause() public onlyManager {
        _pause();

        _removeAllowances();
    }

    function unpause() external onlyManager {
        _unpause();

        _giveAllowances();

        deposit();
    }

    function _giveAllowances() internal {
        want.safeApprove(address(masterchef), type(uint256).max);
        output.safeApprove(router, type(uint256).max);
        wbnb.safeApprove(router, 0);
        wbnb.safeApprove(router, type(uint256).max);
        wbnb.safeApprove(raffle, 0);
        wbnb.safeApprove(raffle, type(uint256).max);
    }

    function _removeAllowances() internal {
        want.safeApprove(address(masterchef), 0);
        output.safeApprove(router, 0);
        wbnb.safeApprove(router, 0);
        wbnb.safeApprove(raffle, 0);
    }
}

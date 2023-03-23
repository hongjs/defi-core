// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../tokens/PuppyStorage.sol";
import "../interfaces/IBEP20.sol";
import "../libraries/TransferHelper.sol";

contract MintPuppyGame is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    PuppyStorage internal puppyStorage;
    IBEP20 internal defiToken;
    IBEP20 public busdToken;

    uint256 public busdCost = 400 ether;
    uint256 public defiCost = 8000 ether;

    address public feeCollectorAddress;
    address public platformReserveAddress;
    address public godfatherPrizeAddress;
    address public puppyPrizeAddress;
    uint8 public feeCollectorRatio;
    uint8 public platformReserveRatio;
    uint8 public godfatherPrizeRatio;
    uint8 public puppyPrizeRatio;

    event onWithdrawBalance(address caller, string indexed token, uint256 amount);
    event onUpdateCost(uint256 oldBusdCost, uint256 newBusdCost, uint256 oldDefiCost, uint256 newDefiCost);
    event onUpdateFeeCollector(
        address feeCollectorAddress,
        address platformReserveAddress,
        address godfatherPrizeAddress,
        address puppyPrizeAddress
    );
    event onUpdateFeeCollectorRatio(
        uint8 feeCollectorRatio,
        uint8 platformReserveRatio,
        uint8 godfatherPrizeRatio,
        uint8 puppyPrizeRatio
    );

    constructor(
        PuppyStorage _puppyStorage,
        IBEP20 _defiAddress,
        IBEP20 _busdAddress
    ) {
        puppyStorage = _puppyStorage;
        defiToken = _defiAddress;
        busdToken = _busdAddress;

        feeCollectorAddress = msg.sender;
        platformReserveAddress = msg.sender;
        godfatherPrizeAddress = msg.sender;
        puppyPrizeAddress = msg.sender;
        feeCollectorRatio = 40;
        platformReserveRatio = 10;
        godfatherPrizeRatio = 10;
        puppyPrizeRatio = 40;
    }

    function mintWithDEFI() external nonReentrant returns (uint256) {
        _collectFee(defiToken, defiCost);
        uint256 tokenId = mintPuppy();
        return tokenId;
    }

    function mintWithBUSD() external nonReentrant returns (uint256) {
        _collectFee(busdToken, busdCost);
        uint256 tokenId = mintPuppy();
        return tokenId;
    }

    function mintPuppy() private returns (uint256) {
        uint256 tokenId = puppyStorage.mint(msg.sender);
        return tokenId;
    }

    function withdrawDefi() external onlyOwner nonReentrant {
        uint256 balance = defiToken.balanceOf(address(this));
        require(balance > 0, "MintPuppyGame: INSUFFICIENT_DEFI");

        uint256 _feeCollectorAmount = balance.div(100).mul(feeCollectorRatio);
        uint256 _godfatherPrizeAmount = balance.div(100).mul(godfatherPrizeRatio);
        uint256 _puppyPrizeAmount = balance.div(100).mul(puppyPrizeRatio);
        uint256 _platformReserveAmount = balance.sub(_feeCollectorAmount).sub(_godfatherPrizeAmount).sub(
            _puppyPrizeAmount
        );

        if (_feeCollectorAmount > 0)
            TransferHelper.safeTransfer(address(defiToken), feeCollectorAddress, _feeCollectorAmount);
        if (_platformReserveAmount > 0)
            TransferHelper.safeTransfer(address(defiToken), platformReserveAddress, _platformReserveAmount);
        if (_godfatherPrizeAmount > 0)
            TransferHelper.safeTransfer(address(defiToken), godfatherPrizeAddress, _godfatherPrizeAmount);
        if (_puppyPrizeAmount > 0)
            TransferHelper.safeTransfer(address(defiToken), puppyPrizeAddress, _puppyPrizeAmount);

        emit onWithdrawBalance(msg.sender, "DEFI", balance);
    }

    function withdrawBusd() external onlyOwner nonReentrant {
        uint256 balance = busdToken.balanceOf(address(this));
        require(balance > 0, "MintPuppyGame: INSUFFICIENT_BUSD");
        TransferHelper.safeTransfer(address(busdToken), platformReserveAddress, balance);
        emit onWithdrawBalance(msg.sender, "BUSD", balance);
    }

    function _collectFee(IBEP20 _token, uint256 _amount) internal {
        uint256 balance = _token.balanceOf(msg.sender);
        require(balance >= _amount, "MintPuppyGame: INSUFFICIENT_BALANCE");
        TransferHelper.safeTransferFrom(address(_token), msg.sender, address(this), _amount);
    }

    function setCost(uint256 _busdCost, uint256 _defiCost) external onlyOwner {
        uint256 oldDefiCost = defiCost;
        uint256 oldBusdCost = busdCost;
        defiCost = _defiCost;
        busdCost = _busdCost;

        emit onUpdateCost(oldBusdCost, busdCost, oldDefiCost, defiCost);
    }

    function setFeeCollectorAddress(
        address _feeCollectorAddress,
        address _platformReserveAddress,
        address _godfatherPrizeAddress,
        address _puppyPrizeAddress
    ) external onlyOwner {
        if (_feeCollectorAddress != address(0)) feeCollectorAddress = _feeCollectorAddress;
        if (_platformReserveAddress != address(0)) platformReserveAddress = _platformReserveAddress;
        if (_godfatherPrizeAddress != address(0)) godfatherPrizeAddress = _godfatherPrizeAddress;
        if (_puppyPrizeAddress != address(0)) puppyPrizeAddress = _puppyPrizeAddress;

        emit onUpdateFeeCollector(
            feeCollectorAddress,
            platformReserveAddress,
            godfatherPrizeAddress,
            puppyPrizeAddress
        );
    }

    function setFeeCollectorRatio(
        uint8 _feeCollectorRatio,
        uint8 _platformReserveRatio,
        uint8 _godfatherPrizeRatio,
        uint8 _puppyPrizeRatio
    ) external onlyOwner {
        uint8 totalRatio = _feeCollectorRatio + _platformReserveRatio + _godfatherPrizeRatio + _puppyPrizeRatio;
        require(totalRatio == 100, "MintPuppyGame: Incorrect Ratio, total must equals 100");

        feeCollectorRatio = _feeCollectorRatio;
        platformReserveRatio = _platformReserveRatio;
        godfatherPrizeRatio = _godfatherPrizeRatio;
        puppyPrizeRatio = _puppyPrizeRatio;

        emit onUpdateFeeCollectorRatio(feeCollectorRatio, platformReserveRatio, godfatherPrizeRatio, puppyPrizeRatio);
    }
}

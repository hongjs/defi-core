//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./common/ItemEnumerator.sol";
import "./interfaces/IVaultHelperBase.sol";
import "./interfaces/IDefiVault.sol";
import "./interfaces/IVaultRaffle.sol";
import "./interfaces/IVaultStrategy.sol";

contract DefiVaultRaffle is Ownable, ReentrancyGuard, ItemEnumerator, IVaultRaffle, VRFConsumerBaseV2 {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // # Chainlink Variable
    VRFCoordinatorV2Interface COORDINATOR;
    LinkTokenInterface LINKTOKEN;
    uint64 s_subscriptionId;
    bytes32 keyHash;
    uint32 callbackGasLimit = 200000;
    uint16 requestConfirmations = 3;
    uint256 public s_requestId;

    // # Defi Variable
    address public admin;
    uint256 public randomResult;
    bool public isRandomSuccess;
    IERC20 public WBNB;
    address public latestWinner;
    uint256 public latestAwardAmount;
    uint256 public minVaultAmount;
    uint256 public minRaffleAmount;
    uint16 public minVaultCount;
    uint256 public initialDate;
    uint256 public latestDepositDate;

    // # Special Pot
    address public specialPot;
    address public specialPotHelper;
    uint16 public specialPotRatio = 800;
    uint16 public MAX_RATIO = 10000;

    event onSetAdmin(address newAdmin);
    event onSetFee(uint256 newFee);
    event onDeposit(address vault, uint256 amount);
    event onSetMinAmount(uint256 minRaffleAmount, uint256 minVaultAmount);
    event onSetMinVaultCount(uint256 minVaultCount);
    event onEmergencyWithdraw(address vault, uint256 amount);
    event onWithdrawLINK(address recipient, uint256 amount);
    event onAwardRequest(uint256 requestId);
    event onAwardResponse(uint256 requestId, uint256 indexed randomResult);
    event onDrawAward(
        uint256 indexed requestId,
        uint256 indexed randomResult,
        uint256 vaultCount,
        uint256 winnerNo,
        address winnerVault,
        uint256 prizeAmount
    );
    event onSetSpecialPot(address specialPot, address specialPotHelper);
    event onSetSpecialPotRatio(uint16 specialPotRatio);

    /**
     * @param _vrfCoordinator ChainLink vrfCoordinatorV2 address
     * @param _link ChainLink LINK token address
     * @param _keyHash KeyHash of ChainLink vrfCoordinatorV2
     * @param _subscriptionId VRFCoordinatorV2 Subscription Id
     * @param _wbnbAddress WBNB token address
     */
    constructor(
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        address _wbnbAddress
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        LINKTOKEN = LinkTokenInterface(_link);
        s_subscriptionId = _subscriptionId;
        keyHash = _keyHash;

        admin = msg.sender;

        minVaultCount = 2;
        minVaultAmount = 100_000_000_000_000_000; // 0.1 BNB
        minRaffleAmount = 500_000_000_000_000_000; // 0.5 BNB

        WBNB = IERC20(_wbnbAddress);
        initialDate = 0;
        latestDepositDate = 0;
    }

    modifier onlyAdmin() {
        require(admin == msg.sender, "Raffle: caller is not the admin");
        _;
    }

    /**
     * @dev Deposit amount from DefiVault when harvesting
     * @param amount WBNB amount
     */
    function deposit(uint256 amount) external override nonReentrant {
        require(WBNB.balanceOf(msg.sender) >= amount, "Raffle: INSUFFICIENT_BALANCE");
        require(WBNB.allowance(msg.sender, address(this)) >= amount, "Raffle: INSUFFICIENT_ALLOWANCE");

        address _vault = IVaultStrategy(msg.sender).vault();
        require(_vault != address(0), "Raffle: Invalid vault");
        WBNB.safeTransferFrom(msg.sender, address(this), amount);

        if (!containKey(_vault)) {
            VaultItem memory _item = VaultItem(_vault, amount, block.timestamp);
            addEntry(_vault, _item);
        } else {
            VaultItem memory _item = getEntryByKey(_vault);
            _item.balance = _item.balance.add(amount);
            _item.timestamp = block.timestamp;
            updateEntry(_vault, _item);
        }

        if (initialDate == 0) initialDate = block.timestamp;
        latestDepositDate = block.timestamp;
        isRandomSuccess = false;

        emit onDeposit(_vault, amount);
    }

    /**
     * @dev ChainLink randomness
     */
    function awardWinnerByChainLink() external override onlyAdmin nonReentrant {
        require(_shouldDraw() == true, "Raffle: Raffle does not meet all the criteria");
        require(isRandomSuccess == false, "Raffle: Already randomized");
        try
            COORDINATOR.requestRandomWords(keyHash, s_subscriptionId, requestConfirmations, callbackGasLimit, 1)
        returns (uint256 requestId) {
            s_requestId = requestId;
        } catch {
            require(false, "Raffle: error requestRandomWords");
        }

        randomResult = 0;
        isRandomSuccess = false;
        emit onAwardRequest(s_requestId);
    }

    // @dev Manual randomness incase ChainLink get struct
    function awardWinnerByManual() external onlyOwner nonReentrant {
        require(_shouldDraw() == true, "Raffle: Raffle does not meet all the criteria");
        require(isRandomSuccess == false, "Raffle: Already randomized");
        randomResult = uint256(keccak256(abi.encodePacked(block.timestamp, block.number)));
        isRandomSuccess = true;
        s_requestId = 0;

        emit onAwardRequest(s_requestId);
        emit onAwardResponse(s_requestId, randomResult);
    }

    /**
     * @dev Callback function used by VRF Coordinator
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        randomResult = randomWords[0];
        isRandomSuccess = true;

        emit onAwardResponse(requestId, randomWords[0]);
    }

    /**
     * @dev Draw award after Chain's randomness done
     * @param vaultHelper DefiVaultHelper of DefiVault
     */
    function drawAward(address vaultHelper) external override nonReentrant onlyAdmin {
        require(isRandomSuccess == true, "Raffle: !isRandomSuccess");
        require(_shouldDraw() == true, "Raffle: Raffle does not meet all the criteria");

        uint256 entryCount = entryCount();
        (Entry memory winner, uint256 prizeAmount, address[] memory candidates) = getWinner();
        uint16 candidateCount = uint16(candidates.length);
        require(winner.index < entryCount, "Raffle: Invalid vault");
        require(winner.value.vault != address(0), "Raffle: Invalid vault address");
        require(winner.value.balance >= minVaultAmount, "Raffle: Invalid vault balance");
        require(address(IDefiVault(winner.value.vault).strategy()) != address(0), "Raffle: Invalid vault strategy");
        require(WBNB.balanceOf(address(this)) >= prizeAmount, "Raffle: INSUFFICIENT_PRIZE");

        if (winner.value.vault == specialPot) {
            // Winner and specialPot is the same pot
            // Send (92+8)% of prize to Winner pot (Special Pot)
            IVaultHelperBase(specialPotHelper).depositWETHFromPrize(winner.value.vault, prizeAmount, 0);
            emit onDrawAward(s_requestId, randomResult, candidateCount, winner.index, winner.value.vault, prizeAmount);
        } else if (specialPot == address(0) || specialPotRatio == 0) {
            // No special pot
            WBNB.safeApprove(vaultHelper, 0);
            WBNB.safeApprove(vaultHelper, prizeAmount);
            IVaultHelperBase(vaultHelper).depositWETHFromPrize(winner.value.vault, prizeAmount, 0);
            emit onDrawAward(s_requestId, randomResult, candidateCount, winner.index, winner.value.vault, prizeAmount);
        } else {
            uint256 _sPotAmount = prizeAmount.mul(specialPotRatio).div(MAX_RATIO);
            uint256 _PrizeAmount = prizeAmount.sub(_sPotAmount);

            // Send 92% of prize to Winner Pot
            WBNB.safeApprove(vaultHelper, 0);
            WBNB.safeApprove(vaultHelper, _PrizeAmount);
            IVaultHelperBase(vaultHelper).depositWETHFromPrize(winner.value.vault, _PrizeAmount, 0);
            emit onDrawAward(s_requestId, randomResult, candidateCount, winner.index, winner.value.vault, _PrizeAmount);

            // Send 8% of prize to Special Pot
            IVaultHelperBase(specialPotHelper).depositWETHFromPrize(specialPot, _sPotAmount, 0);
            emit onDrawAward(s_requestId, randomResult, candidateCount, winner.index, specialPot, _sPotAmount);
        }

        for (uint256 i = 0; i < candidates.length; i++) {
            removeEntry(candidates[i], true);
        }

        isRandomSuccess = false;
        latestWinner = winner.value.vault;
        latestAwardAmount = prizeAmount;
        initialDate = 0;
        latestDepositDate = 0;
    }

    function getWinner()
        public
        view
        returns (
            Entry memory winner,
            uint256 prizeAmount,
            address[] memory candidateAddresses
        )
    {
        require(isRandomSuccess == true, "Raffle: !isRandomSuccess");
        uint256 entryCount = entryCount();
        uint16 validVaultCount = 0;
        for (uint256 i = 0; i < entryCount; i++) {
            VaultItem memory _vault = getEntryByIndex(i);
            if (_vault.balance >= minVaultAmount) validVaultCount++;
        }
        require(validVaultCount > 0, "No valid vault");

        VaultItem[] memory candidates = new VaultItem[](validVaultCount);
        candidateAddresses = new address[](validVaultCount);
        uint256 totalTicket = 0;
        uint16 _index = 0;
        for (uint256 i = 0; i < entryCount; i++) {
            VaultItem memory _vault = getEntryByIndex(i);
            if (_vault.balance >= minVaultAmount) {
                candidates[_index] = _vault;
                candidateAddresses[_index] = _vault.vault;
                totalTicket = totalTicket.add(_vault.balance);
                _index++;
            }
        }

        uint256 wonTicket = randomResult % totalTicket;
        uint256 ticketFinder = 0;

        for (uint256 i = 0; i < validVaultCount; i++) {
            VaultItem memory _vault = candidates[i];
            ticketFinder = ticketFinder.add(_vault.balance);
            if (ticketFinder >= wonTicket) {
                winner = entries[_vault.vault];
                break;
            }
        }

        return (winner, totalTicket, candidateAddresses);
    }

    /**
     * @dev Return amount to vaultAddress
     * @param vaultAddress DefiVault address
     */
    function emergencyWithdraw(address vaultAddress) public onlyOwner {
        require(containKey(vaultAddress), "Raffle: Invalid vault");

        VaultItem memory _item = getEntryByKey(vaultAddress);
        uint256 raffleBalance = WBNB.balanceOf(address(this));
        if (_item.balance >= 0 && raffleBalance >= _item.balance && _item.vault != address(0)) {
            IDefiVault _vault = IDefiVault(_item.vault);
            IVaultStrategy strategy = _vault.strategy();
            WBNB.transfer(address(strategy), _item.balance);
            strategy.afterReceiveWbnbFromRaffle(_item.balance);
        }
        removeEntry(_item.vault, true);
        emit onEmergencyWithdraw(_item.vault, _item.balance);
    }

    /**
     * @dev Return amount to each vaults
     */
    function emergencyWithdrawAll() external onlyOwner nonReentrant {
        require(entryCount() > 0, "Raffle: no entry");

        address[] memory vaults = getKeys();

        for (uint256 i = 0; i < vaults.length; i++) {
            emergencyWithdraw(vaults[i]);
        }

        totalBalance = 0;
    }

    function setAdmin(address _admin) external onlyOwner {
        admin = _admin;
        emit onSetAdmin(admin);
    }

    /**
     * @param _minRaffleAmount Minimum amount of Raffle to start awarding
     * @param _minVaultAmount Minimum amount of each vault to join the Raffle
     */
    function setMinAmount(uint256 _minRaffleAmount, uint256 _minVaultAmount) external onlyOwner nonReentrant {
        require(isRandomSuccess == false, "Raffle: Already randomized");
        require(_minVaultAmount <= _minRaffleAmount, "Raffle: Invalid min amount");
        minRaffleAmount = _minRaffleAmount;
        minVaultAmount = _minVaultAmount;
        emit onSetMinAmount(minRaffleAmount, minVaultAmount);
    }

    /**
     * @param _minVaultCount Minimum vault count to be start Raffle
     */
    function setMinVaultCount(uint16 _minVaultCount) external onlyOwner nonReentrant {
        require(isRandomSuccess == false, "Raffle: Already randomized");
        minVaultCount = _minVaultCount;
        emit onSetMinVaultCount(minVaultCount);
    }

    function setCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwner nonReentrant {
        require(_callbackGasLimit > 0);
        callbackGasLimit = _callbackGasLimit;
    }

    function setRequestConfirmations(uint16 _requestConfirmations) external onlyOwner nonReentrant {
        require(_requestConfirmations > 0);
        requestConfirmations = _requestConfirmations;
    }

    function setSubscriptionId(uint16 _setSubscriptionId) external onlyOwner nonReentrant {
        require(_setSubscriptionId > 0);
        s_subscriptionId = _setSubscriptionId;
    }

    function setKeyHash(bytes32 _keyHash) external onlyOwner nonReentrant {
        keyHash = _keyHash;
    }

    /**
     * @param _specialPot DefiVault of SpecialPot to receive 8% of Award
     * @param _specialPotHelper DefiVaultHelper of DefiVault specific to SpecialPot
     */
    function setSpecialPot(address _specialPot, address _specialPotHelper) external onlyOwner nonReentrant {
        if (_specialPot != address(0)) {
            require(_specialPotHelper != address(0), "Raffle: pot helper is required");
            require(_specialPot != _specialPotHelper, "Raffle: invalid helper address");
        } else {
            require(_specialPotHelper == address(0), "Raffle: pot helper is not required");
        }

        if (specialPotHelper != address(0)) {
            WBNB.safeApprove(specialPotHelper, 0);
        }
        if (_specialPotHelper != address(0)) {
            WBNB.safeApprove(_specialPotHelper, type(uint256).max);
        }

        specialPot = _specialPot;
        specialPotHelper = _specialPotHelper;

        emit onSetSpecialPot(_specialPot, _specialPotHelper);
    }

    /**
     * @param _specialPotRatio Ratio of aware to be sent to SpecialPot when Awarding
     */
    function setSpecialPotRatio(uint16 _specialPotRatio) external onlyOwner nonReentrant {
        require(_specialPotRatio <= MAX_RATIO, "Raffle: Invalid pot ratio");
        specialPotRatio = _specialPotRatio;

        emit onSetSpecialPotRatio(specialPotRatio);
    }

    function _shouldDraw() private view returns (bool) {
        uint256 entryCount = entryCount();
        require(entryCount > 0, "Raffle: no entry");
        require(WBNB.balanceOf(address(this)) >= minRaffleAmount, "Raffle: WBNB is too low");

        uint16 _validVaultCount = 0;
        uint256 _validVaultAmount = 0;
        for (uint256 i = 0; i < entryCount; i++) {
            VaultItem memory _vault = getEntryByIndex(i);
            if (_vault.balance >= minVaultAmount) {
                _validVaultCount++;
                _validVaultAmount = _validVaultAmount.add(_vault.balance);
            }
        }

        require(_validVaultCount >= minVaultCount, "Raffle: Not enough valid vault");
        require(_validVaultAmount >= minRaffleAmount, "Raffle: Valid WBNB is too low");

        return true;
    }
}

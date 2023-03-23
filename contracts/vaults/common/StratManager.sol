//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

abstract contract StratManager is Ownable, Pausable {
    /**
     * @dev Defi Contracts:
     * {keeper} - Address to manage a few lower risk features of the strat
     * {router} - Address of exchange to execute swaps.
     * {vault} - Address of the vault that controls the strategy's funds.
     * {feeRecipient} - Address of the Defi Platform fee will go.
     * {devWallet} - Address of the strategy author/deployer where DevWallet fee will go.
     * {raffle} - Address of the raffle that store and award prize.
     */
    address public keeper;
    address public router;
    address public vault;
    address public feeRecipient;
    address public devWallet;
    address public raffle;

    event onSetRouter(address newRouter);
    event onSetVaultAddress(address newVault);
    event onSetFeeRecipient(address newFeeRecipient);
    event onSetDevWallet(address newDevWallet);
    event onSetRaffle(address newFaffle);

    /**
     * @dev Initializes the base strategy.
     * @param _router router to use for swaps
     * @param _keeper address to use as alternative owner.
     * @param _devWallet address where Dev fees go.
     * @param _feeRecipient address where to send Defi's fees.
     * @param _raffle address where to send raffle's fees.
     */
    constructor(
        address _router,
        address _keeper,
        address _devWallet,
        address _feeRecipient,
        address _raffle
    ) {
        require(_keeper != address(0), "Invalid keeper.");
        require(_devWallet != address(0), "Invalid devWallet.");
        require(_feeRecipient != address(0), "Invalid feeRecipient.");
        require(_raffle != address(0), "Invalid raffle.");

        keeper = _keeper;
        devWallet = _devWallet;
        router = _router;
        feeRecipient = _feeRecipient;
        raffle = _raffle;
    }

    // checks that caller is either owner or keeper.
    modifier onlyManager() {
        require(msg.sender == owner() || msg.sender == keeper, "!manager");
        _;
    }

    // verifies that the caller is not a contract.
    modifier onlyEOA() {
        require(msg.sender == tx.origin, "!EOA");
        _;
    }

    modifier onlyRaffle() {
        require(msg.sender == raffle, "!raffle");
        _;
    }

    /**
     * @dev Updates address of the strat keeper.
     * @param _keeper new keeper address.
     */
    function setKeeper(address _keeper) external onlyManager {
        require(_keeper != address(0), "Invalid keeper.");
        keeper = _keeper;
    }

    /**
     * @dev Updates address where DevWallet fee earnings will go.
     * @param _devWallet new devWallet address.
     */
    function setDevWallet(address _devWallet) external onlyManager {
        require(_devWallet != address(0), "Invalid devWallet.");
        devWallet = _devWallet;

        emit onSetDevWallet(devWallet);
    }

    /**
     * @dev Updates router that will be used for swaps.
     * @param _router new router address.
     */
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router.");
        router = _router;

        emit onSetRouter(router);
    }

    /**
     * @dev Updates parent vault.
     * @param _vault new vault address.
     */
    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "Invalid vault.");
        vault = _vault;

        emit onSetVaultAddress(vault);
    }

    /**
     * @dev Updates platform reserve fee.
     * @param _feeRecipient new platform reserve address.
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid feeRecipient.");
        feeRecipient = _feeRecipient;

        emit onSetFeeRecipient(feeRecipient);
    }

    /**
     * @dev Updates raffle address.
     * @param _raffle new raffle address.
     */
    function setRaffle(address _raffle) external onlyOwner {
        require(_raffle != address(0), "Invalid Raffle.");
        raffle = _raffle;

        emit onSetRaffle(raffle);
    }

    /**
     * @dev Function to synchronize balances before new user deposit.
     * Can be overridden in the strategy.
     */
    function beforeDeposit() external virtual {}
}

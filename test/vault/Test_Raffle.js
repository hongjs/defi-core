const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");
const {ethers} = require("hardhat");
const {toBigNumber, ...util} = require("../utils/testUtils");

describe("Test Raffle", function () {
    before(async () => {
        [owner, admin, vrf, feeCollector, keeper, devWallet, feeRecipient, hacker] = await ethers.getSigners();

        WBNB = await ethers.getContractFactory("WBNB");
        wbnb = await WBNB.deploy();
        await wbnb.deployed();

        await wbnb.deposit({value: ethers.utils.parseEther("100")});
    });

    beforeEach(async () => {
        DefiToken = await ethers.getContractFactory("DefiToken");
        defi = await DefiToken.deploy();
        await defi.deployed();

        BEP40Token = await ethers.getContractFactory("BEP40Token");

        busd = await BEP40Token.deploy("BUSD Token", "BUSD");
        await busd.deployed();

        usdt = await BEP40Token.deploy("USDT Token", "USDT");
        await usdt.deployed();

        KennelClub = await ethers.getContractFactory("KennelClub");
        kennelClub = await KennelClub.deploy(defi.address);
        await kennelClub.deployed();

        DefiMasterChef = await ethers.getContractFactory("DefiMasterChef");
        masterChef = await DefiMasterChef.deploy(
            defi.address,
            kennelClub.address,
            owner.address,
            feeCollector.address,
            ethers.utils.parseEther("1000"),
            0
        );
        await masterChef.deployed();

        DefiFactory = await ethers.getContractFactory("DefiFactory");
        factory = await DefiFactory.deploy(owner.address);
        await factory.deployed();

        DefiRouter = await ethers.getContractFactory("DefiRouter");
        router = await DefiRouter.deploy(factory.address, wbnb.address);
        await router.deployed();

        [lpDefiBnb, lpDefiBusd, lpBnbBusd, lpUsdtBusd] = await util.initMasterChef({
            owner,
            masterChef,
            router,
            factory,
            kennelClub,
            defi,
            wbnb,
            busd,
            usdt,
        });

        GasPrice = await ethers.getContractFactory("GasPrice");
        gasPrice = await GasPrice.deploy();
        await gasPrice.deployed();

        DefiTokenVaultHelper = await ethers.getContractFactory("DefiTokenVaultHelper");
        DefiVaultHelper = await ethers.getContractFactory("DefiVaultHelper");
        helper = await DefiVaultHelper.deploy(router.address, wbnb.address, busd.address, usdt.address);
        await helper.deployed();

        const linkAddress = "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06";
        const vrfCoordinator = "0x6a2aad07396b36fe02a22b33cf443582f682c82f";
        const keyHash = "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314";
        const subscriptionId = 423;

        DefiVaultRaffle = await ethers.getContractFactory("DefiVaultRaffle");
        raffle = await DefiVaultRaffle.deploy(vrfCoordinator, linkAddress, keyHash, subscriptionId, wbnb.address);
        await raffle.deployed();
    });

    /* TODO: Add this code before run Raffle test 
    // TODO: remove this function before deploy mainnet
    function awardWinnerByManual() external onlyOwner nonReentrant {
        require(_shouldDraw() == true, "Raffle: Raffle does not meet all the criteria");
        require(isRandomSuccess == false, "Raffle: Already randomized");
        randomResult = uint256(keccak256(abi.encodePacked(block.timestamp, salt)));
        isRandomSuccess = true;
    }
    */

    it("Should pass, run full loop Raffle #1", async () => {
        await fullLoopTest(ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.1"));
    });

    it("Should pass, run full loop Raffle #2", async () => {
        await fullLoopTest(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.7"));
    });

    it("Should pass, run full loop Raffle #3", async () => {
        await fullLoopTest(ethers.utils.parseEther("5000"), ethers.utils.parseEther("1000"));
    });

    it("Should pass, run full loop Raffle #4 (special pot)", async () => {
        await specialfullLoopTest(ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.1"));
    });

    it("Should fail, test all failure cases", async () => {
        const amount = ethers.utils.parseEther("100000");
        await expect(raffle.connect(hacker).awardWinnerByChainLink()).to.be.revertedWith(
            "Raffle: caller is not the admin"
        );
        await expect(raffle.connect(hacker).drawAward(helper.address)).to.be.revertedWith(
            "Raffle: caller is not the admin"
        );
        await expect(raffle.awardWinnerByChainLink()).to.be.revertedWith("Raffle: no entry");
        await expect(raffle.drawAward(helper.address)).to.be.revertedWith("Raffle: !isRandomSuccess");

        await raffle.setMinAmount(ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.01"));

        // try to call raffle.deposit() without WBNB
        await expect(raffle.connect(admin).deposit(ethers.utils.parseEther("1"))).to.be.revertedWith(
            "Raffle: INSUFFICIENT_BALANCE"
        );

        // raffle.deposit() must be called from Vault only
        await expect(raffle.deposit(ethers.utils.parseEther("1"))).to.be.revertedWith("Raffle: INSUFFICIENT_ALLOWANCE");
        await wbnb.approve(raffle.address, ethers.utils.parseEther("1"));
        await expect(raffle.deposit(ethers.utils.parseEther("1"))).to.be.revertedWith("");

        await initVaultRaffle(amount, 1, 1 * 24 * 60 * 60);

        const raffleBalance2 = toBigNumber(await wbnb.balanceOf(raffle.address))
            .div(1e18)
            .toNumber();
        expect(raffleBalance2).to.gt(0);

        const vaultCount1 = await raffle.entryCount();
        expect(vaultCount1).to.eq(3);

        // 4. Award winner
        const salt = Math.round(Math.random() * 100000);

        await raffle.setMinAmount(ethers.utils.parseEther("10"), ethers.utils.parseEther("0.1"));
        await expect(raffle.awardWinnerByManual()).to.be.revertedWith("Raffle: WBNB is too low");
        await raffle.setMinAmount(ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.3"));
        await expect(raffle.awardWinnerByManual()).to.be.revertedWith("Raffle: Not enough valid vault");
        await raffle.setMinAmount(ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.1"));
        await raffle.setMinVaultCount(3);
        await expect(raffle.awardWinnerByManual()).to.be.revertedWith("Raffle: Not enough valid vault");
        await raffle.setMinVaultCount(2);
        await raffle.setMinAmount(ethers.utils.parseEther("0.85"), ethers.utils.parseEther("0.1"));
        await expect(raffle.awardWinnerByManual()).to.be.revertedWith("Raffle: Valid WBNB is too low");
        await raffle.setMinAmount(ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.1"));
        await raffle.awardWinnerByManual();
        await expect(raffle.awardWinnerByManual()).to.be.revertedWith("Raffle: Already randomized");

        await expect(raffle.deposit(ethers.utils.parseEther("1"))).to.be.revertedWith(
            "function call to a non-contract account"
        );
    });

    it("Should pass, emergency withdraw all", async () => {
        const amount = ethers.utils.parseEther("100000");

        const [vault1, strategy1, vault2, strategy2, vault3, strategy3] = await initVaultRaffle(
            amount,
            1000,
            7 * 24 * 60 * 60
        );

        const count1 = await raffle.entryCount();
        const totalBalance1 = toBigNumber(await raffle.totalBalance()).div(1e18);
        const raffleWbnb1 = toBigNumber(await wbnb.balanceOf(raffle.address)).div(1e18);
        const strategy1Pool1 = toBigNumber(await strategy1.balanceOfPool()).div(1e18);
        const strategy2Pool1 = toBigNumber(await strategy2.balanceOfPool()).div(1e18);
        const strategy3Pool1 = toBigNumber(await strategy3.balanceOfPool()).div(1e18);

        expect(count1.toNumber()).to.eq(3);
        expect(totalBalance1.toNumber()).to.gt(0);
        expect(raffleWbnb1.toNumber()).to.gt(0);

        // 4. Emergency Withdraw All
        await raffle.emergencyWithdrawAll();

        const count2 = await raffle.entryCount();
        const totalBalance2 = await raffle.totalBalance();
        const raffleWbnb2 = await wbnb.balanceOf(raffle.address);
        const strategy1Pool2 = toBigNumber(await strategy1.balanceOfPool()).div(1e18);
        const strategy2Pool2 = toBigNumber(await strategy2.balanceOfPool()).div(1e18);
        const strategy3Pool2 = toBigNumber(await strategy3.balanceOfPool()).div(1e18);

        expect(count2.toNumber()).to.eq(0);
        expect(totalBalance2.toNumber()).to.eq(0);
        expect(raffleWbnb2.toNumber()).to.eq(0);
        expect(strategy1Pool2.toNumber()).to.gt(strategy1Pool1.toNumber());
        expect(strategy2Pool2.toNumber()).to.gt(strategy2Pool1.toNumber());
        expect(strategy3Pool2.toNumber()).to.gt(strategy3Pool1.toNumber());
    });

    it("Should pass, emergency withdraw 1 vault", async () => {
        const amount = ethers.utils.parseEther("100000");

        const [vault1, strategy1, vault2, strategy2, vault3, strategy3] = await initVaultRaffle(
            amount,
            1000,
            7 * 24 * 60 * 60
        );

        const count1 = await raffle.entryCount();
        const totalBalance1 = toBigNumber(await raffle.totalBalance());
        const raffleWbnb1 = toBigNumber(await wbnb.balanceOf(raffle.address)).div(1e18);
        const strategy1Pool1 = toBigNumber(await strategy1.balanceOfPool()).div(1e18);
        const strategy2Pool1 = toBigNumber(await strategy2.balanceOfPool()).div(1e18);
        const strategy3Pool1 = toBigNumber(await strategy3.balanceOfPool()).div(1e18);

        expect(count1.toNumber()).to.eq(3);
        expect(totalBalance1.toNumber()).to.gt(0);
        expect(raffleWbnb1.toNumber()).to.gt(0);

        const vault1Balance = toBigNumber((await raffle.getEntryByKey(vault1.address)).balance);

        // 4. Emergency Withdraw
        await raffle.emergencyWithdraw(vault1.address);

        const count2 = await raffle.entryCount();
        const totalBalance2 = toBigNumber(await raffle.totalBalance());
        const raffleWbnb2 = toBigNumber(await wbnb.balanceOf(raffle.address)).div(1e18);
        const strategy1Pool2 = toBigNumber(await strategy1.balanceOfPool()).div(1e18);
        const strategy2Pool2 = toBigNumber(await strategy2.balanceOfPool()).div(1e18);
        const strategy3Pool2 = toBigNumber(await strategy3.balanceOfPool()).div(1e18);

        expect(count2.toNumber()).to.eq(2);

        expect(vault1Balance.toString()).to.eq(totalBalance1.minus(totalBalance2).toString());
        expect(Math.round(vault1Balance.toNumber() * 100000000000) / 100000000000).to.eq(
            Math.round((totalBalance1.toNumber() - totalBalance2.toNumber()) * 100000000000) / 100000000000
        );
        expect(raffleWbnb2.toNumber()).to.eq(totalBalance2.div(1e18).toNumber());
        expect(strategy1Pool2.toNumber()).to.gt(strategy1Pool1.toNumber());
        expect(strategy2Pool2.toNumber()).to.eq(strategy2Pool1.toNumber());
        expect(strategy3Pool2.toNumber()).to.eq(strategy3Pool1.toNumber());
    });

    it("Should pass, update new Admin", async () => {
        await expect(raffle.connect(hacker).setAdmin(feeCollector.address)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
        await raffle.setAdmin(feeCollector.address);
        const newAdmin = await raffle.admin();
        expect(newAdmin).eq(feeCollector.address);
    });

    it("Should pass, setMinAmount", async () => {
        await expect(
            raffle.connect(hacker).setMinAmount(ethers.utils.parseEther("0.02"), ethers.utils.parseEther("0.01"))
        ).to.be.revertedWith("Ownable: caller is not the owner");

        await expect(
            raffle.setMinAmount(ethers.utils.parseEther("1"), ethers.utils.parseEther("2"))
        ).to.be.revertedWith("Raffle: Invalid min amount");

        raffle.setMinAmount(ethers.utils.parseEther("2"), ethers.utils.parseEther("1"));
        const minRaffleAmount = await raffle.minRaffleAmount();
        const minVaultAmount = await raffle.minVaultAmount();
        expect(minRaffleAmount.toString()).to.eq(ethers.utils.parseEther("2").toString());
        expect(minVaultAmount.toString()).to.eq(ethers.utils.parseEther("1").toString());

        await expect(raffle.connect(hacker).setMinVaultCount(999)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );

        await raffle.setMinVaultCount(123);
        const minVaultCount = await raffle.minVaultCount();
        expect(minVaultCount).to.eq(123);
    });

    it("Should pass, setChainLinkVariable", async () => {
        await expect(raffle.connect(hacker).setCallbackGasLimit(123)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
        await raffle.setCallbackGasLimit(123);

        await expect(raffle.connect(hacker).setRequestConfirmations(5)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
        await raffle.setRequestConfirmations(5);

        await expect(raffle.connect(hacker).setSubscriptionId(10)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
        await raffle.setSubscriptionId(10);

        await expect(
            raffle.connect(hacker).setKeyHash("0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314")
        ).to.be.revertedWith("Ownable: caller is not the owner");
        await raffle.setKeyHash("0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314");
    });

    it("Should pass, setSpecialPot", async () => {
        await expect(raffle.connect(hacker).setSpecialPot(hacker.address, hacker.address)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );

        await expect(
            raffle.setSpecialPot("0x0000000000000000000000000000000000000000", keeper.address)
        ).to.be.revertedWith("Raffle: pot helper is not required");
        await expect(
            raffle.setSpecialPot(keeper.address, "0x0000000000000000000000000000000000000000")
        ).to.be.revertedWith("Raffle: pot helper is required");
        await expect(raffle.setSpecialPot(keeper.address, keeper.address)).to.be.revertedWith(
            "Raffle: invalid helper address"
        );
        await raffle.setSpecialPot(admin.address, keeper.address);
        const specialPot = await raffle.specialPot();
        const specialPotHelper = await raffle.specialPotHelper();
        expect(specialPot).to.be.eq(admin.address);
        expect(specialPotHelper).to.be.eq(keeper.address);

        await expect(raffle.connect(hacker).setSpecialPotRatio(123)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
        await expect(raffle.setSpecialPotRatio(10001)).to.be.revertedWith("Raffle: Invalid pot ratio");

        await raffle.setSpecialPotRatio(90);
        const specialPotRatio = await raffle.specialPotRatio();
        expect(specialPotRatio.toString()).to.be.eq("90");
    });

    const fullLoopTest = async (minRaffleAmount, minVaultAmount) => {
        const amount = ethers.utils.parseEther("100000");

        const [vault1, strategy1, vault2, strategy2, vault3, strategy3] = await initVaultRaffle(
            amount,
            500,
            7 * 24 * 60 * 60
        );

        await raffle.setMinAmount(minRaffleAmount, minVaultAmount);
        const infos1 = await getVaultsInfo([strategy1, strategy2, strategy3]);

        const raffleBalance = toBigNumber(await wbnb.balanceOf(raffle.address))
            .div(1e18)
            .toNumber();
        expect(raffleBalance).to.gt(0);

        const vaultCount1 = await raffle.entryCount();
        expect(vaultCount1).to.eq(3);

        // 4. Award winner
        const salt = Math.round(Math.random() * 100000);
        const _minRaffleAmount = toBigNumber(await raffle.minRaffleAmount())
            .div(1e18)
            .toNumber();
        const _minVaultAmount = toBigNumber(await raffle.minVaultAmount())
            .div(1e18)
            .toNumber();

        if (raffleBalance >= _minRaffleAmount) {
            await raffle.awardWinnerByManual();
        } else {
            await expect(raffle.awardWinnerByManual()).to.be.revertedWith("Raffle: WBNB is too low");
            return;
        }

        await checkTotalAmount();

        const randomResult = toBigNumber(await raffle.randomResult())
            .div(1e18)
            .toNumber();
        const isRandomSuccess = await raffle.isRandomSuccess();
        expect(randomResult).to.gt(0);
        expect(isRandomSuccess).to.eq(true);

        await raffle.drawAward(helper.address);
        await checkTotalAmount();

        const winnerVault = await raffle.latestWinner();

        const infos2 = await getVaultsInfo([strategy1, strategy2, strategy3]);

        const invalidVaults = infos1.filter((i) => i.wbnbInRaffle < _minVaultAmount);
        const remainWbnbInRaffle =
            invalidVaults.length > 0 ? invalidVaults.map((i) => i.wbnbInRaffle).reduce((prev, next) => prev + next) : 0;
        const raffleBalance3 = toBigNumber(await wbnb.balanceOf(raffle.address))
            .div(1e18)
            .toNumber();
        expect(raffleBalance3).to.eq(remainWbnbInRaffle);
        const vaultCount2 = await raffle.entryCount();

        expect(vaultCount2).to.eq(invalidVaults.length);

        // 5. Winner should have more balance in the MasterChef
        infos1.map((info1) => {
            const info2 = infos2.find((i) => i.vault === info1.vault);
            if (info2) {
                if (info1.vault === winnerVault) {
                    expect(info2.lpInMasterChef).to.gt(info1.lpInMasterChef);
                } else {
                    expect(info2.lpInMasterChef).to.eq(info1.lpInMasterChef);
                }
            }
            if (info1.wbnbInRaffle >= _minVaultAmount) {
                expect(info1.wbnbInRaffle).to.gt(0);
                expect(info2.wbnbInRaffle).to.eq(0);
            } else {
                expect(info1.wbnbInRaffle).to.eq(info2.wbnbInRaffle);
            }
        });
    };

    const specialfullLoopTest = async (minRaffleAmount, minVaultAmount) => {
        const amount = ethers.utils.parseEther("100000");

        const [vault1, strategy1, vault2, strategy2, vault3, strategy3, xVault, xStrategy, xHelper] =
            await initVaultRaffle(amount, 500, 7 * 24 * 60 * 60, true);

        await raffle.setMinAmount(minRaffleAmount, minVaultAmount);
        await raffle.setSpecialPot(xVault.address, xHelper.address);
        const infos1 = await getVaultsInfo([strategy1, strategy2, strategy3, xStrategy]);

        const raffleBalance = toBigNumber(await wbnb.balanceOf(raffle.address))
            .div(1e18)
            .toNumber();
        expect(raffleBalance).to.gt(0);

        const vaultCount1 = await raffle.entryCount();
        expect(vaultCount1).to.eq(4);

        // 4. Award winner
        const salt = Math.round(Math.random() * 100000);
        const _minRaffleAmount = toBigNumber(await raffle.minRaffleAmount())
            .div(1e18)
            .toNumber();
        const _minVaultAmount = toBigNumber(await raffle.minVaultAmount())
            .div(1e18)
            .toNumber();

        if (raffleBalance >= _minRaffleAmount) {
            await raffle.awardWinnerByManual();
        } else {
            await expect(raffle.awardWinnerByManual()).to.be.revertedWith("Raffle: WBNB is too low");
            return;
        }

        await checkTotalAmount();

        const randomResult = toBigNumber(await raffle.randomResult())
            .div(1e18)
            .toNumber();
        const isRandomSuccess = await raffle.isRandomSuccess();
        expect(randomResult).to.gt(0);
        expect(isRandomSuccess).to.eq(true);

        await raffle.drawAward(helper.address);
        await checkTotalAmount();

        const winnerVault = await raffle.latestWinner();

        const infos2 = await getVaultsInfo([strategy1, strategy2, strategy3, xStrategy]);

        const invalidVaults = infos1.filter((i) => i.wbnbInRaffle < _minVaultAmount);
        const remainWbnbInRaffle =
            invalidVaults.length > 0 ? invalidVaults.map((i) => i.wbnbInRaffle).reduce((prev, next) => prev + next) : 0;
        const raffleBalance3 = toBigNumber(await wbnb.balanceOf(raffle.address))
            .div(1e18)
            .toNumber();
        expect(raffleBalance3).to.eq(remainWbnbInRaffle);
        const vaultCount2 = await raffle.entryCount();

        expect(vaultCount2).to.eq(invalidVaults.length);

        // 5. Winner should have more balance in the MasterChef
        infos1.map((info1) => {
            const info2 = infos2.find((i) => i.vault === info1.vault);
            if (info2) {
                if (info1.vault === winnerVault) {
                    expect(info2.lpInMasterChef).to.gt(info1.lpInMasterChef);
                } else if (info1.vault === xVault.address) {
                    expect(info2.lpInMasterChef).to.gt(info1.lpInMasterChef);
                } else {
                    expect(info2.lpInMasterChef).to.eq(info1.lpInMasterChef);
                }
            }
            if (info1.wbnbInRaffle >= _minVaultAmount) {
                expect(info1.wbnbInRaffle).to.gt(0);
                expect(info2.wbnbInRaffle).to.eq(0);
            } else {
                expect(info1.wbnbInRaffle).to.eq(info2.wbnbInRaffle);
            }
        });
    };

    const checkTotalAmount = async () => {
        const balance1 = await wbnb.balanceOf(raffle.address);
        const balance2 = await raffle.totalBalance();
        // console.log("checkTotalAmount", balance1.toString(), balance2.toString());
        expect(balance1.toString()).to.eq(balance2.toString());
    };

    const initVaultRaffle = async (amount, blockIncrement, timeIncrement, hasSpecialPot = false) => {
        // 1. Initial vaults
        const [vault1, strategy1] = await initVault(lpDefiBnb.address, 1, "DEFI-BNB");
        const balance1 = toBigNumber(await lpDefiBnb.balanceOf(owner.address));
        await lpDefiBnb.approve(vault1.address, amount);
        await vault1.deposit(balance1.toString());

        await checkTotalAmount();

        const [vault2, strategy2] = await initVault(lpDefiBusd.address, 2, "DEFI-BUSD");
        const balance2 = toBigNumber(await lpDefiBusd.balanceOf(owner.address));
        await lpDefiBusd.approve(vault2.address, amount);
        await vault2.deposit(balance2.toString());
        await checkTotalAmount();

        const [vault3, strategy3] = await initVault(lpBnbBusd.address, 3, "BNB-BUSD");
        const balance3 = toBigNumber(await lpBnbBusd.balanceOf(owner.address));
        await lpBnbBusd.approve(vault3.address, amount);
        await vault3.deposit(balance3.toString());
        await checkTotalAmount();

        let xVault = undefined;
        let xStrategy = undefined;
        let xHelper = undefined;
        if (hasSpecialPot) {
            [xVault, xStrategy] = await initSpecialVault(defi.address, defi.address, 0, "DEFI");
            xHelper = await DefiTokenVaultHelper.deploy(router.address, wbnb.address);
            xHelper.deployed();
            await defi.approve(xVault.address, amount);
            await xVault.deposit(amount.toString());
            await checkTotalAmount();
        }

        // 2. increase timestamp and block
        await ethers.provider.send("evm_increaseTime", [timeIncrement]);
        await util.increaseBlock(blockIncrement);

        // 3. Harvesting to get a reward to Raffle
        const raffleBalance = toBigNumber(await wbnb.balanceOf(raffle.address)).toNumber();
        expect(raffleBalance).to.eq(0);

        await strategy1.harvest();
        await checkTotalAmount();

        await strategy2.harvest();
        await checkTotalAmount();

        await strategy3.harvest();
        await checkTotalAmount();

        if (!hasSpecialPot) {
            return [vault1, strategy1, vault2, strategy2, vault3, strategy3];
        } else {
            await xStrategy.harvest();
            await checkTotalAmount();
            return [vault1, strategy1, vault2, strategy2, vault3, strategy3, xVault, xStrategy, xHelper];
        }
    };

    const getVaultsInfo = async (strategies) => {
        return await Promise.all(
            strategies.map(async (strategy) => {
                const vault = await strategy.vault();
                const masterChef = await strategy.masterchef();
                const wantLP = await BEP40Token.attach(await strategy.want());
                const wbnbInStrategy = toBigNumber(await wbnb.balanceOf(strategy.address))
                    .div(1e18)
                    .toNumber();
                const lpInMasterChef = toBigNumber(await wantLP.balanceOf(masterChef))
                    .div(1e18)
                    .toNumber();
                const wbnbInRaffle = toBigNumber((await raffle.getEntryByKey(vault)).balance)
                    .div(1e18)
                    .toNumber();
                return {
                    vault,
                    strategy: strategy.address,
                    wbnbInStrategy,
                    lpInMasterChef,
                    wbnbInRaffle,
                };
            })
        );
    };

    const initVault = async (lpAddress, poolId, name) => {
        DefiCommonStrategy = await ethers.getContractFactory("DefiCommonStrategy");
        strategy = await DefiCommonStrategy.deploy(
            lpAddress,
            masterChef.address,
            poolId,
            router.address,
            wbnb.address,
            defi.address,
            keeper.address,
            devWallet.address,
            feeRecipient.address,
            gasPrice.address,
            raffle.address
        );
        await strategy.deployed();

        DefiVault = await ethers.getContractFactory("DefiVault");
        vault = await DefiVault.deploy(strategy.address, "Defi Vault LP", `Vault LP ${name}`, 21600);
        await vault.deployed();

        await strategy.setVault(vault.address);
        return [vault, strategy];
    };

    const initSpecialVault = async (want, output, name) => {
        DefiTokenStrategy = await ethers.getContractFactory("DefiTokenStrategy");
        strategy = await DefiTokenStrategy.deploy(
            want,
            masterChef.address,
            router.address,
            wbnb.address,
            output,
            keeper.address,
            devWallet.address,
            feeRecipient.address,
            gasPrice.address,
            raffle.address
        );
        await strategy.deployed();

        DefiVault = await ethers.getContractFactory("DefiVault");
        vault = await DefiVault.deploy(strategy.address, "Defi Vault LP", `Vault LP ${name}`, 21600);
        await vault.deployed();

        await strategy.setVault(vault.address);
        return [vault, strategy];
    };
});

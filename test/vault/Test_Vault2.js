const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");
const {ethers} = require("hardhat");
const {toBigNumber, ...util} = require("../utils/testUtils");

describe("Test Vault2", function () {
    before(async () => {
        [owner, feeCollector, keeper, devWallet, feeRecipient, raffle, user1] = await ethers.getSigners();

        DefiToken = await ethers.getContractFactory("DefiToken");
        defi = await DefiToken.deploy();
        await defi.deployed();

        WBNB = await ethers.getContractFactory("WBNB");
        wbnb = await WBNB.deploy();
        await wbnb.deployed();

        BEP40Token = await ethers.getContractFactory("BEP40Token");
        busd = await BEP40Token.deploy("BUSD Token", "BUSD");
        await busd.deployed();

        BEP40Token = await ethers.getContractFactory("BEP40Token");
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
            ethers.utils.parseEther("0.8"),
            0
        );
        await masterChef.deployed();

        DefiFactory = await ethers.getContractFactory("DefiFactory");
        factory = await DefiFactory.deploy(owner.address);
        await factory.deployed();

        DefiRouter = await ethers.getContractFactory("DefiRouter");
        router = await DefiRouter.deploy(factory.address, wbnb.address);
        await router.deployed();

        await initMasterChef();

        GasPrice = await ethers.getContractFactory("GasPrice");
        gasPrice = await GasPrice.deploy();
        await gasPrice.deployed();

        DefiVaultHelper = await ethers.getContractFactory("DefiVaultHelper");
        helper = await DefiVaultHelper.deploy(router.address, wbnb.address, busd.address, usdt.address);
        await helper.deployed();

        [vault, strategy] = await initVault(lpDefiBnb.address, 1);
    });

    it("Should pass, set new deposit lock", async () => {
        const newLock1 = 2 * 24 * 60 * 60;
        await strategy.setWithdrawLock(newLock1);
        const newLock2 = await strategy.withdrawLock();
        expect(newLock1).to.eq(newLock2);

        await strategy.setEarlyWithdrawalFee(123);
        const newFee = await strategy.earlyWithdrawalFee();
        expect(newFee).to.eq(123);

        await strategy.setFeeRecipient(keeper.address);
        const newRecipient = await strategy.feeRecipient();
        expect(newRecipient).to.eq(keeper.address);
    });

    it("Should pass, set new raffle", async () => {
        await strategy.setRaffle(user1.address);
        const newRaffle = await strategy.raffle();
        expect(newRaffle).to.eq(user1.address);
    });

    it("Should pass, set new Vault", async () => {
        await strategy.setVault(user1.address);
        const newVault = await strategy.vault();
        expect(newVault).to.eq(user1.address);

        await strategy.setVault(vault.address);
        const newVault2 = await strategy.vault();
        expect(newVault2).to.eq(vault.address);
    });

    it("Should pass, upgrade strategy", async () => {
        const amount = ethers.utils.parseEther("1000");
        await lpDefiBnb.approve(vault.address, amount);
        await vault.deposit(amount);

        const vaultBalance = toBigNumber(await vault.balanceOf(owner.address));

        const lp = {pool: lpDefiBnb, index: 1};
        const strategy2 = await DefiCommonStrategy.deploy(
            lp.pool.address,
            masterChef.address,
            lp.index,
            router.address,
            wbnb.address,
            defi.address,
            keeper.address,
            devWallet.address,
            feeRecipient.address,
            gasPrice.address,
            raffle.address
        );
        await strategy2.deployed();

        const oldStrategy = await vault.strategy();
        const balanceInMasterchef1 = await masterChef.userInfo(lp.index, oldStrategy);
        expect(vaultBalance._hex).to.eq(balanceInMasterchef1._hex);

        await expect(vault.proposeStrat(strategy2.address)).to.be.revertedWith(
            "Vault: Proposal not valid for this Vault"
        );

        await strategy2.setVault(vault.address);
        await vault.proposeStrat(strategy2.address);

        await expect(vault.upgradeStrat()).to.be.revertedWith("Vault: Delay has not passed");

        await ethers.provider.send("evm_increaseTime", [6 * 60 * 60]);
        await util.increaseBlock(10);

        await vault.upgradeStrat();

        const newStrategy = await vault.strategy();
        expect(newStrategy).to.eq(strategy2.address);

        await expect(vault.upgradeStrat()).to.be.revertedWith("Vault: There is no candidate");

        const balanceInMasterchef2 = await masterChef.userInfo(lp.index, newStrategy);
        expect(balanceInMasterchef1._hex).to.eq(balanceInMasterchef2._hex);
    });

    const initVault = async (lpDefiBnb, poolId) => {
        DefiCommonStrategy = await ethers.getContractFactory("DefiCommonStrategy");
        strategy = await DefiCommonStrategy.deploy(
            lpDefiBnb,
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
        vault = await DefiVault.deploy(strategy.address, "Defi Vault LP", "Vault LP BNB-DEFI", 21600);
        await vault.deployed();

        await strategy.setVault(vault.address);
        return [vault, strategy];
    };

    const initMasterChef = async () => {
        const DefiPair = await ethers.getContractFactory("DefiPair");
        let txCreatePair = await factory.createPair(defi.address, wbnb.address);
        await txCreatePair.wait();
        lpDefiBnb = await DefiPair.attach(await factory.getPair(defi.address, wbnb.address));
        txCreatePair = await factory.createPair(defi.address, busd.address);
        await txCreatePair.wait();
        lpDefiBusd = await DefiPair.attach(await factory.getPair(defi.address, busd.address));
        txCreatePair = await factory.createPair(wbnb.address, busd.address);
        await txCreatePair.wait();
        lpBnbBusd = await DefiPair.attach(await factory.getPair(wbnb.address, busd.address));

        // Add LP
        await masterChef.add(4000, lpDefiBnb.address, 0, 0);
        await masterChef.add(3000, lpDefiBusd.address, 0, 0);
        await masterChef.add(300, lpBnbBusd.address, 80, 200);

        // Mint
        await wbnb.deposit({value: ethers.utils.parseEther("1000")});
        await busd.mint(ethers.utils.parseEther("6000000"));
        await defi.mintTo(owner.address, ethers.utils.parseEther("6000000"));

        // Approve
        await defi.approve(router.address, ethers.utils.parseEther("100000000"));
        await wbnb.approve(router.address, ethers.utils.parseEther("100000000"));
        await busd.approve(router.address, ethers.utils.parseEther("100000000"));

        // transferOwnership
        await defi.transferOwnership(masterChef.address);
        await kennelClub.transferOwnership(masterChef.address);

        // add LP
        await util.addLPBnb(router, owner, defi, "500000", "100");
        await util.addLP(router, owner, defi, busd, "1000", "100");
        await util.addLPBnb(router, owner, busd, "50000", "100");
    };

    const generateDefaultPairs = () => {
        return {
            [lpDefiBnb.address]: {
                pool: lpDefiBnb,
                token: wbnb,
                quoteToken: defi,
                index: 1,
            },
            [lpDefiBusd.address]: {
                pool: lpDefiBusd,
                token: busd,
                quoteToken: defi,
                index: 2,
            },
            [lpBnbBusd.address]: {
                pool: lpBnbBusd,
                token: busd,
                quoteToken: wbnb,
                index: 3,
            },
        };
    };
});

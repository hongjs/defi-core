const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");
const {ethers} = require("hardhat");
const {toBigNumber, ...util} = require("../utils/testUtils");

describe("Test Vault3", function () {
    before(async () => {
        [owner, feeCollector, keeper, devWallet, feeRecipient, vrf, user1] = await ethers.getSigners();

        DefiToken = await ethers.getContractFactory("DefiToken");
        defi = await DefiToken.deploy();
        await defi.deployed();

        WBNB = await ethers.getContractFactory("WBNB");
        wbnb = await WBNB.deploy();
        await wbnb.deployed();

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

        DefiVaultHelper = await ethers.getContractFactory("DefiVaultHelper");
        helper = await DefiVaultHelper.deploy(router.address, wbnb.address, busd.address, usdt.address);
        await helper.deployed();

        link = await BEP40Token.deploy("LINK", "LINK");
        await link.deployed();

        const keyHash = "0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186";

        DefiVaultRaffle = await ethers.getContractFactory("DefiVaultRaffle");
        raffle = await DefiVaultRaffle.deploy(vrf.address, link.address, keyHash, 123, wbnb.address);
        await raffle.deployed();
    });

    it("Should pass, deposit 1,000 LP and withdraw LP", async () => {
        const lp = {pool: lpDefiBnb, index: 1, name: "DEFI-BNB"};
        const amount = ethers.utils.parseEther("1000");
        const balance1 = toBigNumber(await lp.pool.balanceOf(owner.address));
        const [vault, strategy] = await initVault(lp.pool.address, lp.index, lp.name);
        await strategy.setWithdrawLock(1);

        // 1. User deposit amount to Defi Vault
        await lp.pool.approve(vault.address, amount);
        await vault.deposit(amount);
        const balance2 = toBigNumber(await lp.pool.balanceOf(owner.address));

        await ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);
        await util.increaseBlock(100);

        const masterChefBalance1 = toBigNumber(await lp.pool.balanceOf(masterChef.address));

        await strategy.connect(devWallet).harvest();

        expect(balance1.minus(balance2).toString()).to.eq(amount.toString());

        const vaultBalance = toBigNumber(await vault.balanceOf(owner.address));
        expect(vaultBalance.toString()).to.eq(amount.toString());

        const masterChefBalance2 = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        expect(masterChefBalance2.gt(masterChefBalance1)).to.be.true;

        // Test havest
        await ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);
        await util.increaseBlock(100);

        const userAmountInMC1 = toBigNumber((await masterChef.userInfo(lp.index, strategy.address)).amount);
        const devWalletBnb1 = toBigNumber(await wbnb.balanceOf(devWallet.address));
        const feeRecipientBnb1 = toBigNumber(await wbnb.balanceOf(feeRecipient.address));
        const rafflePotBnb1 = toBigNumber(await wbnb.balanceOf(raffle.address));

        // 2. System run auto compound
        await strategy.connect(devWallet).harvest();

        const userAmountInMC2 = toBigNumber((await masterChef.userInfo(lp.index, strategy.address)).amount);
        const devWalletBnb2 = toBigNumber(await wbnb.balanceOf(devWallet.address));
        const feeRecipientBnb2 = toBigNumber(await wbnb.balanceOf(feeRecipient.address));
        const rafflePotBnb2 = toBigNumber(await wbnb.balanceOf(raffle.address));

        expect(userAmountInMC2.div(1e18).toNumber()).to.greaterThan(userAmountInMC1.div(1e18).toNumber());
        expect(devWalletBnb2.div(1e18).toNumber()).to.greaterThan(devWalletBnb1.div(1e18).toNumber());
        expect(feeRecipientBnb2.div(1e18).toNumber()).to.greaterThan(feeRecipientBnb1.div(1e18).toNumber());
        expect(rafflePotBnb2.div(1e18).toNumber()).to.greaterThan(rafflePotBnb1.div(1e18).toNumber());

        // 3. Withdraw LP from Vault (try withdraw 20% first then withdrawAll)
        const ownerLPAmount1 = toBigNumber(await lp.pool.balanceOf(owner.address));
        await vault.withdraw(vaultBalance.times(0.2).toString());
        const ownerLPAmount2 = toBigNumber(await lp.pool.balanceOf(owner.address));
        await vault.withdrawAll();
        const ownerLPAmount3 = toBigNumber(await lp.pool.balanceOf(owner.address));
        expect(ownerLPAmount2.div(1e18).toNumber()).to.greaterThan(ownerLPAmount1.div(1e18).toNumber());
        expect(ownerLPAmount3.div(1e18).toNumber()).to.greaterThan(ownerLPAmount2.div(1e18).toNumber());
    });

    const initVault = async (lp, poolId, name) => {
        DefiCommonStrategy = await ethers.getContractFactory("DefiCommonStrategy");
        strategy = await DefiCommonStrategy.deploy(
            lp,
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
        vault = await DefiVault.deploy(strategy.address, `Vault LP ${name}`, `Vault LP ${name}`, 21600);
        await vault.deployed();

        await strategy.setVault(vault.address);
        return [vault, strategy];
    };

    const initTokenVault = async (token, name) => {
        DefiTokenStrategy = await ethers.getContractFactory("DefiTokenStrategy");
        strategy = await DefiTokenStrategy.deploy(
            token,
            masterChef.address,
            router.address,
            wbnb.address,
            token,
            keeper.address,
            devWallet.address,
            feeRecipient.address,
            gasPrice.address,
            raffle.address
        );
        await strategy.deployed();

        DefiVault = await ethers.getContractFactory("DefiVault");
        vault = await DefiVault.deploy(strategy.address, `Vault Token ${name}`, `Vault Token ${name}`, 21600);
        await vault.deployed();

        await strategy.setVault(vault.address);
        return [vault, strategy];
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

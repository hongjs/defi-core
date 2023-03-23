const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");
const {ethers} = require("hardhat");
const {toBigNumber, ...util} = require("../utils/testUtils");

describe("Test Vault", function () {
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

        // 1. User deposit amount to Defi Vault
        await lp.pool.approve(vault.address, amount);
        await vault.deposit(amount);
        const balance2 = toBigNumber(await lp.pool.balanceOf(owner.address));

        expect(balance1.minus(balance2).toString()).to.eq(amount.toString());

        const vaultBalance = toBigNumber(await vault.balanceOf(owner.address));
        expect(vaultBalance.toString()).to.eq(amount.toString());

        const masterChefBalance = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        expect(masterChefBalance.toString()).to.eq(amount.toString());

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

    it("Should pass, test withdraw fee 2.5%", async () => {
        const lp = {pool: lpDefiBnb, index: 1, name: "DEFI-BNB"};
        const amount = ethers.utils.parseEther("1000");
        const [vault, strategy] = await initVault(lp.pool.address, lp.index, lp.name);

        // 1. User deposit amount to Defi Vault
        await lp.pool.connect(user1).approve(vault.address, amount);
        const ownerBalance = await lp.pool.balanceOf(owner.address);
        await lp.pool.transfer(user1.address, ownerBalance);
        await vault.connect(user1).deposit(amount);

        // Test havest
        await ethers.provider.send("evm_increaseTime", [1 * 24 * 60 * 60]);
        await util.increaseBlock(1);

        // 2. System run auto compound
        await strategy.connect(devWallet).harvest();
        const vaultBalance = toBigNumber(await vault.balanceOf(user1.address));
        const user1Balance1 = toBigNumber(await lp.pool.balanceOf(user1.address));
        const feeBalance1 = toBigNumber(await lp.pool.balanceOf(feeRecipient.address));

        await vault.connect(user1).withdraw(vaultBalance.times(0.2).toString());

        const user1Balance2 = toBigNumber(await lp.pool.balanceOf(user1.address));
        const feeBalance2 = toBigNumber(await lp.pool.balanceOf(feeRecipient.address));

        expect(user1Balance2.gt(user1Balance1)).to.be.true;
        expect(feeBalance2.gt(feeBalance1)).to.be.true;

        const withdrawFeeAmount1 =
            Math.round(feeBalance2.minus(feeBalance1).div(user1Balance2.minus(user1Balance1)).toNumber() * 1000) / 1000;
        expect(withdrawFeeAmount1).to.gte(0.025);
        expect(withdrawFeeAmount1).to.lte(0.026);

        // Test havest
        await ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);
        await util.increaseBlock(10);

        // 2. System run auto compound
        await strategy.connect(devWallet).harvest();

        const user1Balance3 = toBigNumber(await lp.pool.balanceOf(user1.address));
        const feeBalance3 = toBigNumber(await lp.pool.balanceOf(feeRecipient.address));

        await vault.connect(user1).withdrawAll();

        const user1Balance4 = toBigNumber(await lp.pool.balanceOf(user1.address));
        const feeBalance4 = toBigNumber(await lp.pool.balanceOf(feeRecipient.address));

        expect(user1Balance4.gt(user1Balance3)).to.be.true;
        expect(feeBalance4.gt(feeBalance3)).to.be.true;

        const withdrawFeeAmount2 =
            Math.round(feeBalance4.minus(feeBalance3).div(user1Balance4.minus(user1Balance3)).toNumber() * 1000) / 1000;
        expect(withdrawFeeAmount2).to.gte(0.001);
        expect(withdrawFeeAmount2).to.lte(0.0011);
    });

    it("Should pass, deposit 1,000 DEFI and withdraw DEFI", async () => {
        const lp = {pool: lpDefiBnb, index: 1, name: "DEFI-BNB"};
        const amount = ethers.utils.parseEther("1000");
        const [vault, strategy] = await initVault(lp.pool.address, lp.index, lp.name);

        // 1. User deposit amount to Defi Vault
        const balance1 = toBigNumber(await defi.balanceOf(owner.address));
        await defi.approve(helper.address, amount);
        await helper.depositFromToken(vault.address, defi.address, amount, 0);
        const balance2 = toBigNumber(await defi.balanceOf(owner.address));

        expect(balance1.minus(balance2).toString()).to.eq(amount.toString());

        const vaultBalance = toBigNumber(await vault.balanceOf(owner.address));
        expect(vaultBalance.div(1e18).toNumber()).to.gt(0);

        const masterChefBalance = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        expect(masterChefBalance.div(1e18).toNumber()).to.eq(vaultBalance.div(1e18).toNumber());

        await vault.approve(helper.address, vaultBalance.toString());

        // Test havest
        await ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");

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
        const ownerLPAmount1 = toBigNumber(await defi.balanceOf(owner.address));
        await vault.approve(helper.address, vaultBalance.toString());
        await helper.withdrawToToken(vault.address, vaultBalance.times(0.2).integerValue().toString(), defi.address, 0);
        const ownerLPAmount2 = toBigNumber(await defi.balanceOf(owner.address));
        await helper.withdrawAllToToken(vault.address, defi.address, 0);
        const ownerLPAmount3 = toBigNumber(await defi.balanceOf(owner.address));
        expect(ownerLPAmount2.div(1e18).toNumber()).to.greaterThan(ownerLPAmount1.div(1e18).toNumber());
        expect(ownerLPAmount3.div(1e18).toNumber()).to.greaterThan(ownerLPAmount2.div(1e18).toNumber());
    });

    it("Should pass, deposit 10 BNB and withdraw BNB", async () => {
        const lp = {pool: lpDefiBnb, index: 1, name: "DEFI-BNB"};
        const amount = ethers.utils.parseEther("10");
        const [vault, strategy] = await initVault(lp.pool.address, lp.index, lp.name);

        // 1. User deposit amount to Defi Vault
        const balance1 = toBigNumber(await vault.balanceOf(owner.address));
        await wbnb.approve(helper.address, amount);
        await helper.depositFromETH(vault.address, 0, {value: amount});
        const balance2 = toBigNumber(await vault.balanceOf(owner.address));

        expect(balance2.div(1e18).toNumber()).to.gt(balance1.div(1e18).toNumber());

        const vaultBalance = toBigNumber(await vault.balanceOf(owner.address));
        expect(vaultBalance.div(1e18).toNumber()).to.gt(0);

        const masterChefBalance = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        expect(masterChefBalance.div(1e18).toNumber()).to.eq(vaultBalance.div(1e18).toNumber());

        await vault.approve(helper.address, vaultBalance.toString());

        // Test havest
        await ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");

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

        expect(userAmountInMC2.div(1e18).toNumber()).to.gt(userAmountInMC1.div(1e18).toNumber());
        expect(devWalletBnb2.div(1e18).toNumber()).to.gt(devWalletBnb1.div(1e18).toNumber());
        expect(feeRecipientBnb2.div(1e18).toNumber()).to.gt(feeRecipientBnb1.div(1e18).toNumber());
        expect(rafflePotBnb2.div(1e18).toNumber()).to.gt(rafflePotBnb1.div(1e18).toNumber());

        // 3. Withdraw LP from Vault (try withdraw 20% first then withdrawAll)
        const ownerLPAmount1 = toBigNumber(await vault.balanceOf(owner.address));
        await vault.approve(helper.address, vaultBalance.toString());
        await helper.withdrawToTokens(vault.address, vaultBalance.times(0.2).integerValue().toString());
        const ownerLPAmount2 = toBigNumber(await vault.balanceOf(owner.address));
        await helper.withdrawAllToTokens(vault.address);
        const ownerLPAmount3 = toBigNumber(await vault.balanceOf(owner.address));
        expect(ownerLPAmount2.div(1e18).toNumber()).to.lte(ownerLPAmount1.div(1e18).toNumber());
        expect(ownerLPAmount3.div(1e18).toNumber()).to.lte(ownerLPAmount2.div(1e18).toNumber());
    });

    it("Should pass, deposit WBNB from Raffle (DEFI-BNB)", async () => {
        const lp = {pool: lpDefiBnb, index: 1, name: "DEFI-BNB"};
        const amount = ethers.utils.parseEther("10");
        const [vault, strategy] = await initVault(lp.pool.address, lp.index, lp.name);

        const balance1 = toBigNumber(await vault.balanceOf(owner.address));
        const masterChefBalance1 = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        const totalSupply1 = toBigNumber(await vault.totalSupply());

        await wbnb.approve(helper.address, amount);
        await helper.depositWETHFromPrize(vault.address, amount, 0);

        const balance2 = toBigNumber(await vault.balanceOf(owner.address));
        const masterChefBalance2 = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        const totalSupply2 = toBigNumber(await vault.totalSupply());

        expect(balance2.div(1e18).toNumber()).to.eq(balance1.div(1e18).toNumber());
        expect(masterChefBalance2.div(1e18).toNumber()).to.gt(masterChefBalance1.div(1e18).toNumber());
        expect(totalSupply2.div(1e18).toNumber()).to.eq(totalSupply1.div(1e18).toNumber());
    });

    it("Should pass, deposit WBNB from Raffle (DEFI-BUSD)", async () => {
        const lp = {pool: lpDefiBusd, index: 2, name: "DEFI-BUSD"};
        const amount = ethers.utils.parseEther("1");
        const [vault, strategy] = await initVault(lp.pool.address, lp.index, lp.name);

        const balance1 = toBigNumber(await vault.balanceOf(owner.address));
        const masterChefBalance1 = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        const totalSupply1 = toBigNumber(await vault.totalSupply());

        await wbnb.approve(helper.address, amount);
        await helper.depositWETHFromPrize(vault.address, amount, 0);

        const balance2 = toBigNumber(await vault.balanceOf(owner.address));
        const masterChefBalance2 = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        const totalSupply2 = toBigNumber(await vault.totalSupply());

        expect(balance2.div(1e18).toNumber()).to.eq(balance1.div(1e18).toNumber());
        expect(masterChefBalance2.div(1e18).toNumber()).to.gt(masterChefBalance1.div(1e18).toNumber());
        expect(totalSupply2.div(1e18).toNumber()).to.eq(totalSupply1.div(1e18).toNumber());
    });

    it("Should pass, deposit WBNB from Raffle (BNB-BUSD)", async () => {
        const lp = {pool: lpBnbBusd, index: 3, name: "BNB-BUSD"};
        const amount = ethers.utils.parseEther("1");
        const [vault, strategy] = await initVault(lp.pool.address, lp.index, lp.name);

        const balance1 = toBigNumber(await vault.balanceOf(owner.address));
        const masterChefBalance1 = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        const totalSupply1 = toBigNumber(await vault.totalSupply());

        await wbnb.approve(helper.address, amount);
        await helper.depositWETHFromPrize(vault.address, amount, 0);

        const balance2 = toBigNumber(await vault.balanceOf(owner.address));
        const masterChefBalance2 = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        const totalSupply2 = toBigNumber(await vault.totalSupply());

        expect(balance2.div(1e18).toNumber()).to.eq(balance1.div(1e18).toNumber());
        expect(masterChefBalance2.div(1e18).toNumber()).to.gt(masterChefBalance1.div(1e18).toNumber());
        expect(totalSupply2.div(1e18).toNumber()).to.eq(totalSupply1.div(1e18).toNumber());
    });

    it("Should pass, deposit WBNB from Raffle (USDT-BUSD)", async () => {
        const lp = {pool: lpUsdtBusd, index: 4, name: "USDT-BUSD"};
        const amount = ethers.utils.parseEther("1");
        const [vault, strategy] = await initVault(lp.pool.address, lp.index, lp.name);

        const balance1 = toBigNumber(await vault.balanceOf(owner.address));
        const masterChefBalance1 = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        const totalSupply1 = toBigNumber(await vault.totalSupply());

        await wbnb.approve(helper.address, amount);
        await helper.depositWETHFromPrize(vault.address, amount, 0);

        const balance2 = toBigNumber(await vault.balanceOf(owner.address));
        const masterChefBalance2 = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        const totalSupply2 = toBigNumber(await vault.totalSupply());

        expect(balance2.div(1e18).toNumber()).to.eq(balance1.div(1e18).toNumber());
        expect(masterChefBalance2.div(1e18).toNumber()).to.gt(masterChefBalance1.div(1e18).toNumber());
        expect(totalSupply2.div(1e18).toNumber()).to.eq(totalSupply1.div(1e18).toNumber());
    });

    it("Should pass, deposit 1,000 DEFI to TokenVault and withdraw DEFI", async () => {
        const lp = {pool: defi, index: 0, name: "DEFI"};
        const amount = ethers.utils.parseEther("1000");
        const balance1 = toBigNumber(await lp.pool.balanceOf(owner.address));
        const [vault, strategy] = await initTokenVault(lp.pool.address, lp.index);

        // 1. User deposit amount to Defi Vault
        await lp.pool.approve(vault.address, amount);
        await vault.deposit(amount);
        const balance2 = toBigNumber(await lp.pool.balanceOf(owner.address));

        expect(balance1.minus(balance2).toString()).to.eq(amount.toString());

        const vaultBalance = toBigNumber(await vault.balanceOf(owner.address));
        expect(vaultBalance.toString()).to.eq(amount.toString());

        const masterChefBalance = toBigNumber(await lp.pool.balanceOf(masterChef.address));
        expect(masterChefBalance.toString()).to.eq(amount.toString());

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

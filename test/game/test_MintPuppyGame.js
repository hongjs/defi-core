const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");

describe("Mint Puppy Game", function () {
    beforeEach(async function () {
        [owner, user1, feeCollector, platformReserve, godfatherPrize, puppyPrize, ...accounts] =
            await hre.ethers.getSigners();
        DefiToken = await ethers.getContractFactory("DefiToken");
        defi = await DefiToken.deploy();
        const BEP40Token = await ethers.getContractFactory("BEP40Token");
        busd = await BEP40Token.deploy("Binance USD", "BUSD");

        PuppyStorage = await ethers.getContractFactory("PuppyStorage");
        puppyStorage = await PuppyStorage.deploy();
        MintPuppyGame = await ethers.getContractFactory("MintPuppyGame");
        mintPuppyGame = await MintPuppyGame.deploy(puppyStorage.address, defi.address, busd.address);

        puppyStorage.addCanMint(mintPuppyGame.address);
    });

    it("Should Success, User have 8000 DEFI for mintWithDEFI", async function () {
        await mintDefiAndApprove(user1, ethers.utils.parseEther("8000"));
        await mintPuppyGame.connect(user1).mintWithDEFI();
        expect(await puppyStorage.balanceOf(user1.address)).to.eq(1);
    });

    it("Should Success, User have 400 BUSD for mintWithBUSD", async function () {
        await mintBusdAndApprove(user1, ethers.utils.parseEther("400"));
        await mintPuppyGame.connect(user1).mintWithBUSD();
        expect(await puppyStorage.balanceOf(user1.address)).to.eq(1);
    });

    it("Should error, User doesn't have 8000 DEFI for mintWithDEFI", async function () {
        await mintDefiAndApprove(user1, ethers.utils.parseEther("7999"));
        await expect(mintPuppyGame.connect(user1).mintWithDEFI()).to.be.revertedWith(
            "MintPuppyGame: INSUFFICIENT_BALANCE"
        );
        expect(await puppyStorage.balanceOf(user1.address)).to.eq(0);
    });

    it("Should error, User doesn't have 400 BUSD for mintWithBUSD", async function () {
        await mintBusdAndApprove(user1, ethers.utils.parseEther("399"));
        await expect(mintPuppyGame.connect(user1).mintWithBUSD()).to.be.revertedWith(
            "MintPuppyGame: INSUFFICIENT_BALANCE"
        );
        expect(await puppyStorage.balanceOf(user1.address)).to.eq(0);
    });

    it("SetCost should be updated", async function () {
        const busdCost = ethers.utils.parseEther("300");
        const defiCost = ethers.utils.parseEther("6000");
        await mintPuppyGame.connect(owner).setCost(busdCost, defiCost);

        // console.log("busdCost: " + busdCost.toHexString());
        // console.log("defiCost: " + defiCost.toHexString());
        const _busdCost = await mintPuppyGame.busdCost();
        expect(busdCost.eq(_busdCost));
        const _defiCost = await mintPuppyGame.defiCost();
        expect(defiCost.eq(_defiCost));
        // console.log("_busdCost: " + _busdCost.toHexString());
        // console.log("_defiCost: " + _defiCost.toHexString());
    });

    it("Should withdraw defi and busd from MintPuppyGame", async function () {
        const amount = ethers.utils.parseEther("100");
        // DEFI
        await defi.mintTo(owner.address, amount);
        const defiBalance1 = await defi.balanceOf(owner.address);
        await defi.transfer(mintPuppyGame.address, amount);
        const defiBalance2 = await defi.balanceOf(owner.address);
        await mintPuppyGame.withdrawDefi();
        const defiBalance3 = await defi.balanceOf(owner.address);

        expect(defiBalance1.toString()).to.eq(defiBalance3.toString());
        expect(defiBalance2.toString()).to.eq("0");

        // BUSD
        await busd.mint(amount);
        await busd.transfer(owner.address, amount);
        const busdBalance1 = await busd.balanceOf(owner.address);
        await busd.transfer(mintPuppyGame.address, amount);
        const busdBalance2 = await busd.balanceOf(owner.address);
        await mintPuppyGame.withdrawBusd();
        const busdBalance3 = await busd.balanceOf(owner.address);

        expect(busdBalance1.toString()).to.eq(busdBalance3.toString());
        expect(busdBalance2.toString()).to.eq("0");
    });

    it("Should fail, user1 try to withdrawDefi", async function () {
        await expect(mintPuppyGame.connect(user1).withdrawDefi()).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });

    it("Should fail, user1 try to withdrawBusd", async function () {
        await expect(mintPuppyGame.connect(user1).withdrawBusd()).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });

    it("Should fail, user1 try to SetCost", async function () {
        await expect(mintPuppyGame.connect(user1).setCost(1, 2)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should fail, call setFeeCollectorRatio with invalid ratio", async function () {
        await expect(mintPuppyGame.setFeeCollectorRatio(1, 1, 1, 1)).to.be.revertedWith(
            "MintPuppyGame: Incorrect Ratio, total must equals 100"
        );
    });

    it("Should pass, FeeCollectorRatio should be updated", async function () {
        await mintPuppyGame.setFeeCollectorRatio(1, 2, 3, 94);

        const a = await mintPuppyGame.feeCollectorRatio();
        const b = await mintPuppyGame.platformReserveRatio();
        const c = await mintPuppyGame.godfatherPrizeRatio();
        const d = await mintPuppyGame.puppyPrizeRatio();

        expect(a).to.eq(1);
        expect(b).to.eq(2);
        expect(c).to.eq(3);
        expect(d).to.eq(94);
    });

    it("Should fail, user1 try to setFeeCollectorRatio", async function () {
        await expect(mintPuppyGame.connect(user1).setFeeCollectorRatio(25, 25, 25, 25)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });

    it("Should fail, user1 try to setFeeCollectorRatio", async function () {
        await expect(mintPuppyGame.connect(user1).setFeeCollectorRatio(25, 25, 25, 25)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });

    it("Should pass, FeeCollectorAddress should be updated", async function () {
        await mintPuppyGame.setFeeCollectorAddress(user1.address, user1.address, user1.address, user1.address);

        const a = await mintPuppyGame.feeCollectorAddress();
        const b = await mintPuppyGame.platformReserveAddress();
        const c = await mintPuppyGame.godfatherPrizeAddress();
        const d = await mintPuppyGame.puppyPrizeAddress();

        expect(a).to.eq(user1.address);
        expect(b).to.eq(user1.address);
        expect(c).to.eq(user1.address);
        expect(d).to.eq(user1.address);
    });

    // ================================================================

    const mintBusdAndApprove = async (account, amount) => {
        await busd.mint(amount);
        await busd.transfer(account.address, amount);
        await busd.connect(account).approve(mintPuppyGame.address, amount);
    };

    const mintDefiAndApprove = async (account, amount) => {
        await defi.mintTo(account.address, amount);
        await defi.connect(account).approve(mintPuppyGame.address, amount);
    };
});

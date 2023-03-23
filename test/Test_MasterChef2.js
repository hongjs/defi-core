const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");
const util = require("./utils/testUtils");

describe("Test MasterChef2", function () {
    beforeEach(async function () {
        [owner, feeCollector, user2, attacker] = await ethers.getSigners();

        BEP40Token = await ethers.getContractFactory("BEP40Token");
        busd = await BEP40Token.deploy("BUSD Token", "BUSD");
        await busd.deployed();

        usdt = await BEP40Token.deploy("USDT Token", "USDT");
        await usdt.deployed();

        kMatic = await BEP40Token.deploy("KMATIC Token", "KMATIC");
        await kMatic.deployed();

        WBNB = await ethers.getContractFactory("WBNB");
        wbnb = await WBNB.deploy();
        await wbnb.deployed();

        DefiToken = await ethers.getContractFactory("DefiToken");
        defi = await DefiToken.deploy();
        await defi.deployed();

        KennelClub = await ethers.getContractFactory("KennelClub");
        kennelClub = await KennelClub.deploy(defi.address);
        await kennelClub.deployed();

        DefiMasterChef = await ethers.getContractFactory("DefiMasterChef");
        masterChef = await DefiMasterChef.deploy(
            defi.address,
            kennelClub.address,
            owner.address,
            feeCollector.address,
            ethers.utils.parseEther("3"),
            0
        );
        await masterChef.deployed();

        DefiFactory = await ethers.getContractFactory("DefiFactory");
        factory = await DefiFactory.deploy(owner.address);
        await factory.deployed();
        // console.log(await factory.INIT_CODE_PAIR_HASH());

        DefiRouter = await ethers.getContractFactory("DefiRouter");
        router = await DefiRouter.deploy(factory.address, wbnb.address);
        await router.deployed();

        await initPairsForFactory();

        await mint();
        await transferOwnership(masterChef);
        await initLPForMasterChef(masterChef);
        await allowRouterToTransferAmount();
    });

    describe("Test MasterChef2", function () {
        it("Change dev address", async function () {
            await masterChef.dev(user2.address);
            const newAddr = await masterChef.devAddr();
            expect(newAddr).to.eq(user2.address);
        });

        it("Change FeeCollector address", async function () {
            await masterChef.updateFeeCollector(user2.address);
            const newAddr = await masterChef.feeCollectorAddr();
            expect(newAddr).to.eq(user2.address);
        });

        it("Change MinimumDefi", async function () {
            await masterChef.updateMinimumDefi(ethers.utils.parseEther("500"));
            const minimumDefi = await masterChef.minimumDefi();
            expect(minimumDefi.toString()).to.eq(ethers.utils.parseEther("500").toString());
        });

        it("Change DefiPerBlock", async function () {
            await masterChef.updateDefiPerBlock(ethers.utils.parseEther("99"));
            const defiPerBlock = await masterChef.defiPerBlock();
            expect(defiPerBlock.toString()).to.eq(ethers.utils.parseEther("99").toString());
        });

        it("Shouldn't Change dev address", async function () {
            await expect(masterChef.connect(attacker).dev(attacker.address)).to.be.revertedWith(
                "dev: you are not devAddr."
            );
        });

        it("Shouldn't Change FeeCollector address", async function () {
            await expect(masterChef.connect(attacker).updateFeeCollector(user2.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Shouldn't Change MinimumDefi", async function () {
            await expect(
                masterChef.connect(attacker).updateMinimumDefi(ethers.utils.parseEther("500"))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Shouldn't Change DefiPerBlock", async function () {
            await expect(
                masterChef.connect(attacker).updateDefiPerBlock(ethers.utils.parseEther("99"))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Test EmergencyWithdraw", async function () {
            await util.addLPBnb(router, owner, defi, "1800", "1");
            const pairs = generateDefaultPairs();
            const pair = pairs[pairDefiBnb.address];
            await util.enterFarm(masterChef, owner, pair);
            const mcBalance1 = new BigNumber((await pairDefiBnb.balanceOf(masterChef.address))._hex);
            const userBalance1 = await pairDefiBnb.balanceOf(owner.address);
            const userInfo1 = await masterChef.userInfo(pair.index, owner.address);
            expect(mcBalance1.toString()).to.not.eq("0");
            expect(userBalance1.toString()).to.eq("0");
            expect(userInfo1.amount.toString()).to.eq(mcBalance1.toString());

            await masterChef.emergencyWithdraw(pair.index);
            const mcBalance2 = new BigNumber((await pairDefiBnb.balanceOf(masterChef.address))._hex);
            const userBalance2 = await pairDefiBnb.balanceOf(owner.address);
            const userInfo2 = await masterChef.userInfo(pair.index, owner.address);
            expect(mcBalance2.toString()).to.eq("0");
            expect(userBalance2.toString()).to.eq(userInfo1.amount.toString());
            expect(userInfo2.amount.toString()).to.eq("0");
        });
    });

    const initPairsForFactory = async () => {
        // Create default Pairs
        const DefiPair = await ethers.getContractFactory("DefiPair");

        await factory.createPair(defi.address, busd.address);
        pairDefiBusd = await DefiPair.attach(await factory.getPair(defi.address, busd.address));
        await factory.createPair(defi.address, wbnb.address);
        pairDefiBnb = await DefiPair.attach(await factory.getPair(defi.address, wbnb.address));
        await factory.createPair(wbnb.address, busd.address);
        pairBnbBusd = await DefiPair.attach(await factory.getPair(wbnb.address, busd.address));
        await factory.createPair(usdt.address, busd.address);
        pairUsdtBusd = await DefiPair.attach(await factory.getPair(usdt.address, busd.address));
        await factory.createPair(kMatic.address, wbnb.address);
        pairkMaticBnb = await DefiPair.attach(await factory.getPair(kMatic.address, wbnb.address));
    };

    const allowRouterToTransferAmount = async () => {
        // Add LP
        await defi.approve(router.address, ethers.utils.parseEther("100000000"));
        await wbnb.approve(router.address, ethers.utils.parseEther("100000000"));
        await busd.approve(router.address, ethers.utils.parseEther("100000000"));
        await usdt.approve(router.address, ethers.utils.parseEther("100000000"));
    };

    const initLPForMasterChef = async (masterChef) => {
        // Add LP to MasterChef
        await masterChef.add(4000, pairDefiBnb.address, 0, 0);
        await masterChef.add(3000, pairDefiBusd.address, 0, 0);
        await masterChef.add(300, pairBnbBusd.address, 80, 200);
        await masterChef.add(200, pairUsdtBusd.address, 80, 200);
        await masterChef.add(100, pairkMaticBnb.address, 80, 200);
        // await masterChef.add(300, pairBnbBusdPancake.address, false);
    };

    const mint = async () => {
        // Mint
        await wbnb.deposit({value: ethers.utils.parseEther("1000")});
        await busd.mint(ethers.utils.parseEther("6000000"));
        await usdt.mint(ethers.utils.parseEther("6000000"));
        await defi.mintTo(owner.address, ethers.utils.parseEther("6000000"));
    };

    const transferOwnership = async (masterChef) => {
        // Transfer owner ship
        await defi.transferOwnership(masterChef.address);
        await kennelClub.transferOwnership(masterChef.address);
    };

    const generateDefaultPairs = () => {
        return {
            [pairDefiBnb.address]: {
                pool: pairDefiBnb,
                token: wbnb,
                quoteToken: defi,
                index: 1,
            },
            [pairDefiBusd.address]: {
                pool: pairDefiBusd,
                token: busd,
                quoteToken: defi,
                index: 2,
            },
            [pairBnbBusd.address]: {
                pool: pairBnbBusd,
                token: busd,
                quoteToken: wbnb,
                index: 3,
            },
            [pairUsdtBusd.address]: {
                pool: pairUsdtBusd,
                token: usdt,
                quoteToken: busd,
                index: 4,
            },
            [pairkMaticBnb.address]: {
                pool: pairkMaticBnb,
                token: kMatic,
                quoteToken: wbnb,
                index: 5,
            },
            // [pair_BNBBUSD_Pancake.address]: {
            //   pool: pair_BNBBUSD_Pancake,
            //   token: wbnb,
            //   quoteToken: busd,
            //   index: 3,
            // },
        };
    };
});

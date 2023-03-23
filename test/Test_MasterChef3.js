const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");
const util = require("./utils/testUtils");

describe("Test MasterChef3", function () {
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

    describe("Test MasterChef3", function () {
        it("LP should be updated", async function () {
            const pid = 1;
            const pool0 = await masterChef.poolInfo(pid);
            const totalAllocPoint0 = await masterChef.totalAllocPoint();
            await masterChef.set(
                pid,
                Number(pool0.allocPoint) + 10,
                Number(pool0.minDepositFeeRate) + 20,
                Number(pool0.maxDepositFeeRate) + 30,
                false
            );
            const pool1 = await masterChef.poolInfo(pid);
            const totalAllocPoint1 = await masterChef.totalAllocPoint();
            expect(Number(pool1.allocPoint)).to.eq(Number(pool0.allocPoint) + 10);
            expect(Number(pool1.minDepositFeeRate)).to.eq(Number(pool0.minDepositFeeRate) + 20);
            expect(Number(pool1.maxDepositFeeRate)).to.eq(Number(pool0.maxDepositFeeRate) + 30);
            expect(pool1.enabled).to.eq(false);
            expect(Number(totalAllocPoint1)).to.eq(Number(totalAllocPoint0) + 10);
        });

        it("Shouldn't add duplicate LP", async function () {
            await expect(masterChef.add(4000, pairDefiBnb.address, 0, 0)).to.be.revertedWith(
                "DefiMasterChef: Duplicated LP Token"
            );
        });

        it("Shouldn't update Min higher than Max DepositFeeRate", async function () {
            await expect(masterChef.set(1, 4000, 20, 10, true)).to.be.revertedWith(
                "DefiMasterChef: Min Fee should Less Than or Equal Max"
            );
        });

        it("Shouldn't update Max DepositFeeRate higher than 100%", async function () {
            await expect(masterChef.set(1, 4000, 10, 10001, true)).to.be.revertedWith(
                "DefiMasterChef: Fee rate is too high"
            );
        });

        it("Shouldn't can't add address 0", async function () {
            await expect(masterChef.add(100, "0x0000000000000000000000000000000000000000", 0, 0)).to.be.revertedWith(
                "DefiMasterChef: Can't add address 0"
            );
        });

        it("Should update Max DepositFeeRate = 100%", async function () {
            const pid = 1;
            await masterChef.set(pid, 4000, 9000, 10000, true);
            const pool = await masterChef.poolInfo(pid);
            expect(Number(pool.minDepositFeeRate)).to.eq(9000);
            expect(Number(pool.maxDepositFeeRate)).to.eq(10000);
        });

        it("Shouldn't add duplicate LP", async function () {
            await expect(masterChef.connect(owner).add(4000, pairDefiBnb.address, 0, 0)).to.be.revertedWith(
                "DefiMasterChef: Duplicated LP Token"
            );
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
});

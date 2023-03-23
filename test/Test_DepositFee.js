const {expect} = require("chai");
const util = require("./utils/testUtils");

describe("Test Deposit Fee", function () {
    let owner, feeCollector, user3;
    let factory, router, masterChef, kennelClub;
    let defi, wbnb, busd, usdt;
    let pairDefiBusd,
        pairDefiBnb,
        // pairDefiUsdt,
        pairBnbBusd,
        pairUsdtBusd,
        pairBnbBusdPancake;

    // const FINIX_PER_BLOCK = new BigNumber(1.08);
    // const BLOCKS_PER_YEAR = new BigNumber(10512000);

    beforeEach(async function () {
        [owner, feeCollector] = await ethers.getSigners();

        const BEP40Token = await ethers.getContractFactory("BEP40Token");
        busd = await BEP40Token.deploy("BUSD Token", "BUSD");
        await busd.deployed();

        usdt = await BEP40Token.deploy("USDT Token", "USDT");
        await usdt.deployed();

        const WBNB = await ethers.getContractFactory("WBNB");
        wbnb = await WBNB.deploy();
        await wbnb.deployed();

        const DefiToken = await ethers.getContractFactory("DefiToken");
        defi = await DefiToken.deploy();
        await defi.deployed();

        const KennelClub = await ethers.getContractFactory("KennelClub");
        kennelClub = await KennelClub.deploy(defi.address);
        await kennelClub.deployed();

        const DefiMasterChef = await ethers.getContractFactory("DefiMasterChef");
        masterChef = await DefiMasterChef.deploy(
            defi.address,
            kennelClub.address,
            owner.address,
            feeCollector.address,
            new ethers.BigNumber.from("10000000000000000000"),
            1
        );
        await masterChef.deployed();

        const DefiFactory = await ethers.getContractFactory("DefiFactory");
        factory = await DefiFactory.deploy(owner.address);
        await factory.deployed();
        // console.log(await factory.INIT_CODE_PAIR_HASH());

        const DefiRouter = await ethers.getContractFactory("DefiRouter");
        router = await DefiRouter.deploy(factory.address, wbnb.address);
        await router.deployed();

        await initPairsForFactory();
    });

    describe("Test Deposit fee", function () {
        it("Deposit BNB-BUSD with 0 DEFI", async function () {
            await mint();
            await transferOwnership();
            await initLPForMasterChef();
            await allowRouterToTransferAmount();

            // Add Liquidity Pool
            const _deadline = Date.now() + 1200;
            await router.addLiquidity(
                wbnb.address,
                busd.address,
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("4000"),
                ethers.utils.parseEther("0"),
                ethers.utils.parseEther("0"),
                owner.address,
                _deadline
            );

            // Begin Farm
            const pairs = generateDefaultPairs();
            const pair = pairs[pairBnbBusd.address];
            const depositFeeRate = (await masterChef.poolInfo(pair.index)).maxDepositFeeRate.toNumber();
            const balance = await pair.pool.balanceOf(owner.address);
            await util.enterFarm(masterChef, owner, pair);
            const userInfo = await masterChef.userInfo(pair.index, owner.address);
            const fee = balance.mul(depositFeeRate).div(10000);
            const expectd = balance.sub(balance.mul(depositFeeRate).div(10000));
            expect(userInfo.amount).to.equal(expectd);

            const feeCollectorBalance = await pairs[pairBnbBusd.address].pool.balanceOf(feeCollector.address);
            expect(feeCollectorBalance).to.equal(fee);
        });

        it("Deposit BNB-BUSD with 100 DEFI", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("100"));
            await mint();
            await transferOwnership();
            await initLPForMasterChef();
            await allowRouterToTransferAmount();

            // Add Liquidity Pool
            const _deadline = Date.now() + 1200;
            await router.addLiquidity(
                wbnb.address,
                busd.address,
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("4000"),
                ethers.utils.parseEther("0"),
                ethers.utils.parseEther("0"),
                owner.address,
                _deadline
            );

            // Begin Farm
            const pairs = generateDefaultPairs();
            const pair = pairs[pairBnbBusd.address];
            const depositFeeRate = (await masterChef.poolInfo(pair.index)).maxDepositFeeRate.toNumber();
            const balance = await pair.pool.balanceOf(owner.address);
            await util.enterFarm(masterChef, owner, pair);
            const userInfo = await masterChef.userInfo(pair.index, owner.address);
            const fee = balance.mul(depositFeeRate).div(10000);
            const expectd = balance.sub(balance.mul(depositFeeRate).div(10000));
            expect(userInfo.amount).to.equal(expectd);

            const feeCollectorBalance = await pairs[pairBnbBusd.address].pool.balanceOf(feeCollector.address);
            expect(feeCollectorBalance).to.equal(fee);
        });

        it("Deposit BNB-BUSD with 200 DEFI", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("200"));
            await mint();
            await transferOwnership();
            await initLPForMasterChef();
            await allowRouterToTransferAmount();

            // Add Liquidity Pool
            const _deadline = Date.now() + 1200;
            await router.addLiquidity(
                wbnb.address,
                busd.address,
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("4000"),
                ethers.utils.parseEther("0"),
                ethers.utils.parseEther("0"),
                owner.address,
                _deadline
            );

            // Begin Farm
            const pairs = generateDefaultPairs();
            const pair = pairs[pairBnbBusd.address];
            const depositFeeRate = (await masterChef.poolInfo(pair.index)).minDepositFeeRate.toNumber();
            const balance = await pair.pool.balanceOf(owner.address);
            await util.enterFarm(masterChef, owner, pair);
            const userInfo = await masterChef.userInfo(pair.index, owner.address);
            const fee = balance.mul(depositFeeRate).div(10000);
            const expectd = balance.sub(balance.mul(depositFeeRate).div(10000));
            expect(userInfo.amount).to.equal(expectd);

            const feeCollectorBalance = await pairs[pairBnbBusd.address].pool.balanceOf(feeCollector.address);
            expect(feeCollectorBalance).to.equal(fee);
        });

        it("Deposit BNB-BUSD with 300 DEFI", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("300"));
            await mint();
            await transferOwnership();
            await initLPForMasterChef();
            await allowRouterToTransferAmount();

            // Add Liquidity Pool
            const _deadline = Date.now() + 1200;
            await router.addLiquidity(
                wbnb.address,
                busd.address,
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("4000"),
                ethers.utils.parseEther("0"),
                ethers.utils.parseEther("0"),
                owner.address,
                _deadline
            );

            // Begin Farm
            const pairs = generateDefaultPairs();
            const pair = pairs[pairBnbBusd.address];
            const depositFeeRate = (await masterChef.poolInfo(pair.index)).minDepositFeeRate.toNumber();
            const balance = await pair.pool.balanceOf(owner.address);
            await util.enterFarm(masterChef, owner, pair);
            const userInfo = await masterChef.userInfo(pair.index, owner.address);
            const fee = balance.mul(depositFeeRate).div(10000);
            const expectd = balance.sub(balance.mul(depositFeeRate).div(10000));
            expect(userInfo.amount).to.equal(expectd);

            const feeCollectorBalance = await pairs[pairBnbBusd.address].pool.balanceOf(feeCollector.address);
            expect(feeCollectorBalance).to.equal(fee);
        });

        it("Deposit DEFI-BUSD with 0 DEFI", async function () {
            await defi.mint(ethers.utils.parseEther("1000"));
            await mint();
            await transferOwnership();
            await initLPForMasterChef();
            await allowRouterToTransferAmount();

            // Add Liquidity Pool
            const _deadline = Date.now() + 1200;
            await router.addLiquidity(
                defi.address,
                busd.address,
                ethers.utils.parseEther("1000"),
                ethers.utils.parseEther("100"),
                ethers.utils.parseEther("0"),
                ethers.utils.parseEther("0"),
                owner.address,
                _deadline
            );

            // Begin Farm
            const pairs = generateDefaultPairs();
            const pair = pairs[pairDefiBusd.address];
            const depositFeeRate = (await masterChef.poolInfo(pair.index)).maxDepositFeeRate.toNumber();
            const balance = await pair.pool.balanceOf(owner.address);
            await util.enterFarm(masterChef, owner, pair);
            const userInfo = await masterChef.userInfo(pair.index, owner.address);
            const expected = balance.sub(balance.mul(depositFeeRate).div(10000));
            expect(userInfo.amount).to.equal(expected);
        });
    });

    const initPairsForFactory = async () => {
        // Create default Pairs
        const DefiPair = await ethers.getContractFactory("DefiPair");

        await factory.createPair(defi.address, busd.address);
        pairDefiBusd = await DefiPair.attach(await factory.getPair(defi.address, busd.address));
        await factory.createPair(defi.address, wbnb.address);
        pairDefiBnb = await DefiPair.attach(await factory.getPair(defi.address, wbnb.address));
        // await factory.createPair(defi.address, usdt.address);
        // pairDefiUsdt = await DefiPair.attach(
        //   await factory.getPair(defi.address, usdt.address)
        // );
        await factory.createPair(wbnb.address, busd.address);
        pairBnbBusd = await DefiPair.attach(await factory.getPair(wbnb.address, busd.address));
        await factory.createPair(usdt.address, busd.address);
        pairUsdtBusd = await DefiPair.attach(await factory.getPair(usdt.address, busd.address));
    };

    const allowRouterToTransferAmount = async () => {
        // Add LP
        await defi.approve(router.address, ethers.utils.parseEther("100000000"));
        await wbnb.approve(router.address, ethers.utils.parseEther("100000000"));
        await busd.approve(router.address, ethers.utils.parseEther("100000000"));
        await usdt.approve(router.address, ethers.utils.parseEther("100000000"));
    };

    const initLPForMasterChef = async () => {
        // Add LP to MasterChef
        await masterChef.add(3000, pairDefiBusd.address, 0, 0);
        await masterChef.add(5000, pairDefiBnb.address, 0, 0);
        // await masterChef.add(2000, pairDefiUsdt.address, false);
        await masterChef.add(1000, pairBnbBusd.address, 50, 200);
        await masterChef.add(500, pairUsdtBusd.address, 50, 200);
        // await masterChef.add(1000, pairBnbBusdPancake.address, false);
    };

    const mint = async () => {
        // Mint
        await wbnb.deposit({value: ethers.utils.parseEther("1000")});
        await busd.mint(ethers.utils.parseEther("6000000"));
        await usdt.mint(ethers.utils.parseEther("6000000"));
    };

    const transferOwnership = async () => {
        // Transfer owner ship
        await defi.transferOwnership(masterChef.address);
        await kennelClub.transferOwnership(masterChef.address);
    };

    const generateDefaultPairs = () => {
        return {
            [pairDefiBusd.address]: {
                pool: pairDefiBusd,
                token1: defi,
                token2: busd,
                index: 1,
            },
            [pairDefiBnb.address]: {
                pool: pairDefiBnb,
                token1: defi,
                token2: wbnb,
                index: 2,
            },
            // [pairDefiUsdt.address]: {
            //   pool: pairDefiUsdt,
            //   token1: defi,
            //   token2: usdt,
            //   index: 3,
            // },
            [pairBnbBusd.address]: {
                pool: pairBnbBusd,
                token1: wbnb,
                token2: busd,
                index: 3,
            },
            [pairUsdtBusd.address]: {
                pool: pairUsdtBusd,
                token1: usdt,
                token2: busd,
                index: 4,
            },
            // [pair_BNBBUSD_Pancake.address]: {
            //   pool: pair_BNBBUSD_Pancake,
            //   token1: wbnb,
            //   token2: busd,
            //   index: 3,
            // },
        };
    };
});

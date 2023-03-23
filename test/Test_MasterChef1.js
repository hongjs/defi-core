const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");
const util = require("./utils/testUtils");

describe("Test MasterChef1", function () {
    beforeEach(async function () {
        [owner, feeCollector, user2] = await ethers.getSigners();

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

    describe("Test MasterChef1", function () {
        it("Test Deposit LP 1,800 DEFI + 1 BNB", async function () {
            // Add Liquidity Pool
            await util.addLPBnb(router, owner, defi, "1800", "1");
            const ownerBalance1 = await pairDefiBnb.balanceOf(owner.address);
            // Begin Farm
            const pairs = generateDefaultPairs();

            await util.enterFarm(masterChef, owner, pairs[pairDefiBnb.address]);

            const mcBalance = await pairDefiBnb.balanceOf(masterChef.address);
            const ownerBalance2 = await pairDefiBnb.balanceOf(owner.address);

            const userBalanceInMC = (await masterChef.userInfo(pairs[pairDefiBnb.address].index, owner.address)).amount;

            expect(mcBalance).to.equal(ownerBalance1);
            expect(userBalanceInMC).to.equal(ownerBalance1);
            expect(ownerBalance2.toNumber()).to.equal(0);
        });

        it("Test Deposit LP 1,800 DEFI + 1 BNB then withdraw half amount of total LP", async function () {
            // Add Liquidity Pool
            await util.addLPBnb(router, owner, defi, "1800", "1");
            const ownerBalance1 = await pairDefiBnb.balanceOf(owner.address);

            // Begin Farm
            const pairs = generateDefaultPairs();

            await util.enterFarm(masterChef, owner, pairs[pairDefiBnb.address]);
            const withdrawAmount = new BigNumber(ownerBalance1._hex).div(2).div(new BigNumber(10).pow(18)).toNumber();
            await util.leaveFarm(masterChef, pairs[pairDefiBnb.address], withdrawAmount.toString());
            const _ownerBalance2 = await pairDefiBnb.balanceOf(owner.address);
            const ownerBalance2 = new BigNumber(_ownerBalance2._hex).div(new BigNumber(10).pow(18)).toNumber();

            expect(ownerBalance2).to.equal(withdrawAmount);
        });

        it("Test Enter Staking 1,000 DEFI", async function () {
            await util.enterStaking(masterChef, defi, "1000");
            const mcBalance = await defi.balanceOf(masterChef.address);

            const userBalanceInMC = (await masterChef.userInfo(0, owner.address)).amount;
            expect(userBalanceInMC).to.equal(ethers.utils.parseEther("1000"));
            expect(mcBalance).to.equal(ethers.utils.parseEther("1000"));
        });

        it("Test Enter Staking 1,000 then Leave Staking 500 DEFI", async function () {
            await util.enterStaking(masterChef, defi, "1000");
            const mcBalance1 = await defi.balanceOf(masterChef.address);

            await util.leaveStaking(masterChef, "500");
            const mcBalance2 = await defi.balanceOf(masterChef.address);

            const userBalanceInMC = (await masterChef.userInfo(0, owner.address)).amount;
            expect(mcBalance1).to.equal(ethers.utils.parseEther("1000"));
            expect(mcBalance2).to.equal(ethers.utils.parseEther("500"));
            expect(userBalanceInMC).to.equal(ethers.utils.parseEther("500"));
        });

        it("Test Defi Price, APR and TVL", async function () {
            // Add Liquidity Pool
            await util.addLPBnb(router, owner, defi, "1800", "1");
            await util.addLP(router, owner, defi, busd, "4", "1");
            await util.addLPBnb(router, owner, busd, "10", "0.022");
            await util.addLP(router, owner, busd, usdt, "1", "1");

            // Begin Farm
            const pairs = generateDefaultPairs();

            await util.enterFarm(masterChef, owner, pairs[pairDefiBnb.address]);
            await util.enterFarm(masterChef, owner, pairs[pairDefiBusd.address]);
            await util.enterFarm(masterChef, owner, pairs[pairBnbBusd.address]);
            await util.enterFarm(masterChef, owner, pairs[pairUsdtBusd.address]);
            await util.enterStaking(masterChef, defi, "10000");

            // Print Defi Price
            const defiPrice = await util.getDefiPrice(pairs);
            console.log("Defi price: $", defiPrice);

            const tvl = await util.getTVL(pairs, masterChef, defi, defiPrice);

            console.log("TVL: $", tvl);
            // Print All APR
            await printAPRForAllPairs(pairs, defiPrice, 400);

            // Test Logic result
            const poolLength = await masterChef.poolLength();
            expect(poolLength).to.equal(6);
        });

        it("Test Farm Defi", async function () {
            // Begin Farm
            const balance = ethers.utils.parseEther("1000");
            await defi.approve(masterChef.address, balance);
            await masterChef.enterStaking(balance);
            const defiAmount1 = await defi.balanceOf(owner.address);
            await masterChef.updatePool(0);

            await masterChef.leaveStaking(balance);
            const defiAmount2 = await defi.balanceOf(owner.address);

            const decimal = new BigNumber(10).pow(18);
            const balanceBefore = new BigNumber(defiAmount1._hex).div(decimal).toNumber();
            const balanceAfter = new BigNumber(defiAmount2._hex).div(decimal).toNumber();
            expect(balanceAfter).to.greaterThan(balanceBefore);
        });
    });

    const printAPRForAllPairs = async (pairs, defiPrice, bnbPrice) => {
        const pairAddresses = Object.keys(pairs);
        for (const address of pairAddresses) {
            const apr = await util.getAPR(masterChef, pairs[address], defiPrice, bnbPrice);
            console.log(
                `${await pairs[address].token.symbol()}-${await pairs[address].quoteToken.symbol()}, APR=${
                    isNaN(apr) ? 0 : apr
                }%`
            );
        }
    };

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

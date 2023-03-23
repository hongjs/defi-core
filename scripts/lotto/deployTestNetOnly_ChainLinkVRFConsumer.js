// const hre = require("hardhat");

async function main() {
    [owner, user1, feeCollector, platformReserve, godfatherPrize, puppyPrize, notOwner, ...accounts] =
        await hre.ethers.getSigners();
    // BEP40Token = await ethers.getContractFactory("BEP40Token");
    // // // coupon = await BEP40Token.deploy("Foodcourt Coupon", "COUPON");

    godfatherStorageAddress = "0x1C7991cEc96383Dc49D70DB23e6DdBe04b60E614";
    puppyStorageAddress = "0xa25644d845cdc4D2e05420C787eeDf0F38Edc60f";
    defiAddress = "0xb64E0710e59ea2A08E65EB2496973F27e818664c";
    // =====================================================================================
    const chainlink_fee = ethers.utils.parseEther("0.1");
    const linkTokenAddress = "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06";
    const vrfCoordinator = "0xa555fC018435bef5A13C6c6870a9d4C11DEC329C";
    const keyHash = "0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186";

    DefiToken = await ethers.getContractFactory("DefiToken");
    // defi = await DefiToken.deploy();
    defi = await DefiToken.attach(defiAddress);

    GodfatherStorage = await ethers.getContractFactory("GodfatherStorage");
    // // gftStorage = await GodfatherStorage.deploy();
    gftStorage = await GodfatherStorage.attach(godfatherStorageAddress);

    PuppyStorage = await ethers.getContractFactory("PuppyStorage");
    // // puppyStorage = await PuppyStorage.deploy();
    puppyStorage = await PuppyStorage.attach(puppyStorageAddress);

    // MiniGame = await ethers.getContractFactory("MiniGame");
    // miniGame = await MiniGame.deploy(gftStorage.address, puppyStorage.address, defi.address, busd.address);
    // AirDropUtil = await ethers.getContractFactory("AirDropUtil");
    // airdropUtil = await AirDropUtil.deploy(gftStorage.address, coupon.address, 0);

    // await gftStorage.addCanMint(airdropUtil.address);
    // await gftStorage.addCanMint(miniGame.address);
    // await puppyStorage.addCanMint(miniGame.address);
    // await miniGame.setDrawWinner(owner.address);

    // feeCollectorRatio = 10;
    // platformReserveRatio = 20;
    // godfatherPrizeRatio = 30;
    // puppyPrizeRatio = 40;
    // await miniGame.setFeeCollectorRatio(feeCollectorRatio, platformReserveRatio, godfatherPrizeRatio, puppyPrizeRatio);
    // await miniGame.setFeeCollectorAddress(
    //     feeCollector.address,
    //     platformReserve.address,
    //     godfatherPrize.address,
    //     puppyPrize.address
    // );

    // Lotto
    // ==============================================================
    // ChainLink on BSC - TESTNET LINK
    // GET LINK Faucet From = https://linkfaucet.protofire.io/bsctest
    // ==============================================================
    // LINK	0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06
    // VRF Coordinator	0xa555fC018435bef5A13C6c6870a9d4C11DEC329C
    // Key Hash	0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186
    // TestNet Fee 0.1 LINK per Random
    // Mainnet Fee 0.2 Link per Random
    // ==============================================================
    // Ethers = 10^18
    // Lotto
    //TEST NET 0.1 LINK, MAINNET 0.2 LINK

    DefiLottoAwardV2 = await ethers.getContractFactory("DefiLottoAwardV2");
    defiLottoAwardV2 = await DefiLottoAwardV2.deploy(
        vrfCoordinator,
        linkTokenAddress,
        keyHash,
        chainlink_fee,
        gftStorage.address,
        puppyStorage.address
    );
    GodfatherLottoCheckV2 = await ethers.getContractFactory("GodfatherLottoCheckV2");
    godfatherLottoCheckV2 = await GodfatherLottoCheckV2.deploy(
        defiLottoAwardV2.address,
        gftStorage.address,
        defi.address
    );
    PuppyLottoCheckV2 = await ethers.getContractFactory("PuppyLottoCheckV2");
    puppyLottoCheckV2 = await PuppyLottoCheckV2.deploy(defiLottoAwardV2.address, puppyStorage.address, defi.address);

    MoyLottoCheckV2 = await ethers.getContractFactory("MoyLottoCheckV2");
    moyLottoCheckV2 = await MoyLottoCheckV2.deploy(defiLottoAwardV2.address, puppyStorage.address, defi.address);

    console.log("const defiLottoAwardAddress = '" + defiLottoAwardV2.address + "';");
    console.log("const godfatherLottoCheckAddress = '" + godfatherLottoCheckV2.address + "';");
    console.log("const puppyLottoCheckAddress = '" + puppyLottoCheckV2.address + "';");
    console.log("const moyLottoCheckAddress = '" + moyLottoCheckV2.address + "';");
    console.log("const GodfatherStorageAddress = '" + gftStorage.address + "';");
    console.log("const PuppyStorageAddress = '" + puppyStorage.address + "';");
    console.log("const DefiAddress = '" + defi.address + "';");
    console.log("const chainLinkFee = '" + chainlink_fee + "';");
    console.log(" !!! DONT FORGET TO TRANSFER 0.1 LINK For TESTNET, 0.2 LINK for MAINNET");

    _1DAY = 1 * 24 * 60 * 60;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

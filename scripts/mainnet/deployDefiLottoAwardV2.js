// const hre = require("hardhat");

async function main() {
    [owner, user1, feeCollector, platformReserve, godfatherPrize, puppyPrize, notOwner, ...accounts] =
        await hre.ethers.getSigners();

    // === Storage Configuration ===========================================================
    godfatherStorageAddress = "0x1ff7F3FeFc10DdF3D827bd8Df109a0885f542114";
    puppyStorageAddress = "0x6515CF06686F8Eed508b880C8e5E8e9Cf9c6b686";
    defiAddress = "0xBdb44DF0A914c290DFD84c1eaf5899d285717fdc";

    // ==== Chainlink Configuration =========================================================
    const chainlink_fee = ethers.utils.parseEther("0.2");
    const linkTokenAddress = "0x404460C6A5EdE2D891e8297795264fDe62ADBB75";
    const vrfCoordinator = "0x747973a5A2a4Ae1D3a8fDF5479f1514F65Db9C31";
    const keyHash = "0xc251acd21ec4fb7f31bb8868288bfdbaeb4fbfec2df3735ddbd4f7dc8d60103c";
    console.log("const chainLinkFee = '" + chainlink_fee + "';");

    // ==== Attach DEFI =========================================================
    DefiToken = await ethers.getContractFactory("DefiToken");
    defi = await DefiToken.attach(defiAddress);
    console.log("const DefiAddress = '" + defi.address + "';");

    // ==== Attach Godfather Storage =========================================================
    GodfatherStorage = await ethers.getContractFactory("GodfatherStorage");
    gftStorage = await GodfatherStorage.attach(godfatherStorageAddress);
    console.log("const GodfatherStorageAddress = '" + gftStorage.address + "';");

    // ==== Attach Puppy Storage =========================================================
    PuppyStorage = await ethers.getContractFactory("PuppyStorage");
    puppyStorage = await PuppyStorage.attach(puppyStorageAddress);
    console.log("const PuppyStorageAddress = '" + puppyStorage.address + "';");

    // ==== Deploy LottoAwardV2 =========================================================
    DefiLottoAwardV2 = await ethers.getContractFactory("DefiLottoAwardV2");
    defiLottoAwardV2 = await DefiLottoAwardV2.deploy(
        vrfCoordinator,
        linkTokenAddress,
        keyHash,
        chainlink_fee,
        gftStorage.address,
        puppyStorage.address
    );
    console.log("const defiLottoAwardAddress = '" + defiLottoAwardV2.address + "';");

    // ==== Deploy GodfatherLottoCheckV2 =========================================================
    GodfatherLottoCheckV2 = await ethers.getContractFactory("GodfatherLottoCheckV2");
    godfatherLottoCheckV2 = await GodfatherLottoCheckV2.deploy(
        defiLottoAwardV2.address,
        gftStorage.address,
        defi.address
    );
    console.log("const godfatherLottoCheckAddress = '" + godfatherLottoCheckV2.address + "';");

    // ==== Deploy PuppyLottoCheckV2 =========================================================
    PuppyLottoCheckV2 = await ethers.getContractFactory("PuppyLottoCheckV2");
    puppyLottoCheckV2 = await PuppyLottoCheckV2.deploy(defiLottoAwardV2.address, puppyStorage.address, defi.address);
    console.log("const puppyLottoCheckAddress = '" + puppyLottoCheckV2.address + "';");

    // ==== Deploy MoyLottoCheckV2 =========================================================
    MoyLottoCheckV2 = await ethers.getContractFactory("MoyLottoCheckV2");
    moyLottoCheckV2 = await MoyLottoCheckV2.deploy(defiLottoAwardV2.address, puppyStorage.address, defi.address);
    console.log("const moyLottoCheckAddress = '" + moyLottoCheckV2.address + "';");

    // console.log(" !!! DONT FORGET TO TRANSFER 0.1 LINK For TESTNET, 0.2 LINK for MAINNET");

    // _1DAY = 1 * 24 * 60 * 60;
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

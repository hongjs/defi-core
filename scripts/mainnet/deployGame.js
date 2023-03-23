const hre = require("hardhat");

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // We get the contract to deploy
    const [owner] = await ethers.getSigners();

    const defiTokenAddress = "0xBdb44DF0A914c290DFD84c1eaf5899d285717fdc";
    const busdTokenAddress = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
    const couponAddress = "0x084bb94e93891D74579B54Ab63ED24C4ef9cd5Ef";

    const feeCollectorAddress = "0x7C8586572397CE08f9A214dDa108574c094031e1";
    const platformReserveAddress = "0xD1a7a10ed0Fca59374021BB02c4C281AF4D29Bf0";
    const godfatherPrizeAddress = "0xC747ed382F8e686b285D36F9d430E5af4f7D582D";
    const puppyPrizeAddress = "0x44ca23bec54c979F33ed41326C7b8F956c4c59fa";
    const botAddress = "0x3e8630d5eD2bE65e612C195836D019A1917aAEAF";
    const airDropTimelock = 10878790;

    const godfatherStorageAddress = "0x1ff7F3FeFc10DdF3D827bd8Df109a0885f542114";
    const puppyStorageAddress = "0x6515CF06686F8Eed508b880C8e5E8e9Cf9c6b686";

    BEP40Token = await ethers.getContractFactory("BEP40Token");
    coupon = await BEP40Token.attach(couponAddress);

    GodfatherStorage = await ethers.getContractFactory("GodfatherStorage");
    gftStorage = await GodfatherStorage.attach(godfatherStorageAddress);

    PuppyStorage = await ethers.getContractFactory("PuppyStorage");
    puppyStorage = await PuppyStorage.attach(puppyStorageAddress);

    MiniGame = await ethers.getContractFactory("MiniGame");
    miniGame = await MiniGame.deploy(gftStorage.address, puppyStorage.address, defiTokenAddress, busdTokenAddress);
    await miniGame.deployed();

    // Set MiniGame
    await gftStorage.addCanMint(miniGame.address);
    await puppyStorage.addCanMint(miniGame.address);

    // // Set AirDropUtil
    // // await gftStorage.addCanMint(airdropUtil.address);
    await miniGame.setFeeCollectorAddress(
        feeCollectorAddress,
        platformReserveAddress,
        godfatherPrizeAddress,
        puppyPrizeAddress
    );
    await miniGame.setDrawWinner(botAddress);

    console.log("owner:", owner.address);
    console.log("miniGame deployed to:", miniGame.address);
    console.log("gftStorage deployed to:", gftStorage.address);
    console.log("puppyStorage deployed to:", puppyStorage.address);
    // console.log("airdropUtil deployed to:", airdropUtil.address);
    console.log("couponToken deployed to:", couponAddress);

    // Don't forget to set bot address
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

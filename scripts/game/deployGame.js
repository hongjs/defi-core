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

    const defiTokenAddress = "0xb64E0710e59ea2A08E65EB2496973F27e818664c";
    const busdTokenAddress = "0xaB3F4ebABFd6898452543454AAE908Df71658801";
    const feeCollectorAddress = "0x7E4DF23577c0833c74a36C9a7DAF7b63BFf438bE";
    const platformReserveAddress = "0x7E4DF23577c0833c74a36C9a7DAF7b63BFf438bE";
    const godfatherPrizeAddress = "0x7E4DF23577c0833c74a36C9a7DAF7b63BFf438bE";
    const puppyPrizeAddress = "0x7E4DF23577c0833c74a36C9a7DAF7b63BFf438bE";
    const couponAddress = "0x53705AFc23AAA8Ea3538D552CEA33d791251238F";
    const botAddress = "0x27801a8eC68d4234Fd4D473Cc6B16Cb214c0643b";
    const airDropTimelock = 12240701;

    BEP40Token = await ethers.getContractFactory("BEP40Token");
    coupon = await BEP40Token.deploy("Foodcourt Coupon", "COUPON");
    await coupon.deployed();

    GodfatherStorage = await ethers.getContractFactory("GodfatherStorage");
    gftStorage = await GodfatherStorage.deploy();
    await gftStorage.deployed();

    PuppyStorage = await ethers.getContractFactory("PuppyStorage");
    puppyStorage = await PuppyStorage.deploy();
    await puppyStorage.deployed();

    MiniGame = await ethers.getContractFactory("MiniGame");
    miniGame = await MiniGame.deploy(gftStorage.address, puppyStorage.address, defiTokenAddress, busdTokenAddress);
    await miniGame.deployed();

    AirDropUtil = await ethers.getContractFactory("AirDropUtil");
    airdropUtil = await AirDropUtil.deploy(gftStorage.address, couponAddress, airDropTimelock);
    await airdropUtil.deployed();

    // Set MiniGame
    await gftStorage.addCanMint(miniGame.address);
    await puppyStorage.addCanMint(miniGame.address);
    // Set AirDropUtil
    await gftStorage.addCanMint(airdropUtil.address);
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
    console.log("airdropUtil deployed to:", airdropUtil.address);
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

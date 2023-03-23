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

    const puppyStorageAddress = "0x6515CF06686F8Eed508b880C8e5E8e9Cf9c6b686";

    BEP40Token = await ethers.getContractFactory("BEP40Token");

    PuppyStorage = await ethers.getContractFactory("PuppyStorage");
    puppyStorage = await PuppyStorage.attach(puppyStorageAddress);

    MintPuppyGame = await ethers.getContractFactory("MintPuppyGame");
    mintPuppyGame = await MintPuppyGame.deploy(puppyStorage.address, defiTokenAddress, busdTokenAddress);
    await mintPuppyGame.deployed();

    console.log("owner:", owner.address);
    console.log("const mintPuppyGameAddress = '" + mintPuppyGame.address + "';");
    console.log("const puppyStorageAddress = '" + puppyStorage.address + "';");
    console.log("const defiTokenAddress = '" + defiTokenAddress + "';");
    console.log("const busdTokenAddress = '" + busdTokenAddress + "';");

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

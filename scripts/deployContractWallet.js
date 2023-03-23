const {ethers} = require("hardhat");
// const hre = require('hardhat');

async function main() {
    const [owner] = await ethers.getSigners();

    const defiAddress = "0xBdb44DF0A914c290DFD84c1eaf5899d285717fdc";
    WalletContract = await ethers.getContractFactory("WalletContract");

    IFO = await WalletContract.deploy("IFO", defiAddress, owner.address);
    await IFO.deployed();

    // puppy = await WalletContract.deploy("Puppy", defiAddress, owner.address);
    // await puppy.deployed();

    // moy = await WalletContract.deploy("Moy", defiAddress, owner.address);
    // await moy.deployed();

    console.log("owner: ", owner.address);
    console.log("defi: ", defiAddress);
    console.log("IFO: ", IFO.address);
    // console.log("puppy: ", puppy.address);
    // console.log("moy: ", moy.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

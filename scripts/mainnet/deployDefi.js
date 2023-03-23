const {ethers} = require("hardhat");

async function main() {
    const [owner] = await ethers.getSigners();

    // const defiTokenAddress = "0xBdb44DF0A914c290DFD84c1eaf5899d285717fdc";

    // const DefiToken = await ethers.getContractFactory("DefiToken");
    // const defiToken = await DefiToken.attach(defiTokenAddress);

    const DefiToken = await ethers.getContractFactory("DefiToken");
    const defiToken = await DefiToken.deploy();
    await defiToken.deployed();

    console.log(`DefiToken: ${defiToken.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

const {ethers} = require("hardhat");

async function main() {
    const [owner] = await ethers.getSigners();

    const DefiFactory = await ethers.getContractFactory("DefiFactory");
    const factory = await DefiFactory.deploy(owner.address);
    await factory.deployed();
    console.log(`factory: ${factory.address}`);
    console.log(`INIT_CODE_PAIR_HASH: ${await factory.INIT_CODE_PAIR_HASH()}`);
    console.log(`## Update INIT_CODE_PAIR_HASH in libraries/DefiLibrary.sol`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

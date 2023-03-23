const {ethers} = require("hardhat");
// const hre = require('hardhat');

async function main() {
    const [owner] = await ethers.getSigners();

    const masterChefAddress = "0x5D21D02378670119453530478288AEe67b807e2a";
    const defiAddress = "0xBdb44DF0A914c290DFD84c1eaf5899d285717fdc";

    const DefiToken = await ethers.getContractFactory("DefiToken");
    const defi = await DefiToken.attach(defiAddress);

    const DefiMasterChef = await ethers.getContractFactory("DefiMasterChef");
    const masterChef = await DefiMasterChef.attach(masterChefAddress);

    const kennelClubAddress = await masterChef.kennel();
    const KennelClub = await ethers.getContractFactory("KennelClub");
    const kennelClub = await KennelClub.attach(kennelClubAddress);

    const _1DAY = 1 * 24 * 60 * 60;
    Timelock = await ethers.getContractFactory("Timelock");
    timelock = await Timelock.deploy(owner.address, _1DAY);
    await timelock.deployed();
    console.log("Timelock: " + timelock.address);

    // await kennelClub.transferOwnership(masterChef.address);
    // await defi.transferOwnership(masterChef.address);
    // await masterChef.transferOwnership(timelock.address);
    // await timelock.connect(owner).setPendingAdmin(owner.address);
    // await timelock.connect(owner).acceptAdmin();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

const {ethers} = require("hardhat");
// const hre = require('hardhat');

async function main() {
    const [owner] = await ethers.getSigners();

    const defiAddress = "0xBdb44DF0A914c290DFD84c1eaf5899d285717fdc";
    const platformReserveWallet = "0xD1a7a10ed0Fca59374021BB02c4C281AF4D29Bf0";
    const feeCollectorWallet = "0x7C8586572397CE08f9A214dDa108574c094031e1";
    const masterChefTimeLock = 10878790;
    const devWalletTimeLock = 16091590;

    const DefiToken = await ethers.getContractFactory("DefiToken");
    const defi = await DefiToken.attach(defiAddress);

    const DevWallet = await ethers.getContractFactory("DevWallet");
    const devWallet = await DevWallet.deploy(defi.address, devWalletTimeLock);
    await devWallet.deployed();

    console.log(`DefiToken: ${defi.address}`);
    console.log(`DevWallet: ${devWallet.address}`);

    const KennelClub = await ethers.getContractFactory("KennelClub");
    const kennelClub = await KennelClub.deploy(defi.address);
    await kennelClub.deployed();

    const DefiMasterChef = await ethers.getContractFactory("DefiMasterChef");
    const masterChef = await DefiMasterChef.deploy(
        defi.address,
        kennelClub.address,
        platformReserveWallet,
        feeCollectorWallet,
        ethers.utils.parseEther("3"),
        masterChefTimeLock
    );
    // 3000000000000000000
    await masterChef.deployed();

    console.log(`MasterChef: ${masterChef.address}`);
    console.log(`KennelClub: ${kennelClub.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

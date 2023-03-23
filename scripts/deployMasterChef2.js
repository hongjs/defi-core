const {ethers} = require("hardhat");
// const hre = require('hardhat');

async function main() {
    const [owner] = await ethers.getSigners();
    const routerAddress = "0x7F1d484f02d59E61AE4eC6FC0128ceCa8DF95C3d";

    const platformReserveWallet = "0x7E4DF23577c0833c74a36C9a7DAF7b63BFf438bE";
    const feeCollectorWallet = "0x7E4DF23577c0833c74a36C9a7DAF7b63BFf438bE";
    const wbnbAddress = "0xCAba8F3ed2493CAC6AbEb493b4F10419d9c37e06";
    const busdAddress = "0xaB3F4ebABFd6898452543454AAE908Df71658801";
    const usdtAddress = "0x26F7A9eED4C7d496926b8FD90Bf51accF3CF8d92";
    const kMaticAddress = "0x582457CE6543597Eb5D913c1CD47d96ba8CFa4C9";
    const defiAddress = "0xb64E0710e59ea2A08E65EB2496973F27e818664c";
    const masterChefTimeLock = 12240701;

    const Router = await ethers.getContractFactory("DefiRouter");
    const router = await Router.attach(routerAddress);

    const factoryAddress = await router.factory();
    const Factory = await ethers.getContractFactory("DefiFactory");
    const factory = await Factory.attach(factoryAddress);

    const DefiToken = await ethers.getContractFactory("DefiToken");
    const defi = await DefiToken.attach(defiAddress);

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
    await masterChef.deployed();

    await kennelClub.transferOwnership(masterChef.address);
    await defi.transferOwnership(masterChef.address);

    console.log(`MasterChef: ${masterChef.address}`);
    console.log(`KennelClub: ${kennelClub.address}`);

    const pairDefiBnb = await factory.getPair(defi.address, wbnbAddress);
    const pairDefiBusd = await factory.getPair(defi.address, busdAddress);
    const pairBnbBusd = await factory.getPair(wbnbAddress, busdAddress);
    const pairUsdtBusd = await factory.getPair(usdtAddress, busdAddress);
    const pairkMaticWbnb = await factory.getPair(kMaticAddress, wbnbAddress);

    await masterChef.add(4000, pairDefiBnb, 0, 0);
    await masterChef.add(3000, pairDefiBusd, 0, 0);
    await masterChef.add(300, pairBnbBusd, 80, 200);
    await masterChef.add(100, pairUsdtBusd, 80, 200);
    await masterChef.add(50, pairkMaticWbnb, 80, 200);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

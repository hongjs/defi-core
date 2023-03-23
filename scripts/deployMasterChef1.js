const {ethers} = require("hardhat");
// const hre = require('hardhat');

async function main() {
    const [owner] = await ethers.getSigners();
    const zero = "0x0000000000000000000000000000000000000000";
    const routerAddress = "0x7F1d484f02d59E61AE4eC6FC0128ceCa8DF95C3d";

    const foodCourtWallet = "0x27801a8eC68d4234Fd4D473Cc6B16Cb214c0643b";
    const privateSellWallet = "0x27801a8eC68d4234Fd4D473Cc6B16Cb214c0643b";
    const lpReserveWallet = "0x27801a8eC68d4234Fd4D473Cc6B16Cb214c0643b";

    const marketingWallet = "0x27801a8eC68d4234Fd4D473Cc6B16Cb214c0643b";
    const puppyPrize = "0x27801a8eC68d4234Fd4D473Cc6B16Cb214c0643b";
    const godfatherPrize = "0x27801a8eC68d4234Fd4D473Cc6B16Cb214c0643b";
    const moysPrize = "0x27801a8eC68d4234Fd4D473Cc6B16Cb214c0643b";

    const wbnbAddress = "0xCAba8F3ed2493CAC6AbEb493b4F10419d9c37e06";
    const busdAddress = "0xaB3F4ebABFd6898452543454AAE908Df71658801";
    const usdtAddress = "0x26F7A9eED4C7d496926b8FD90Bf51accF3CF8d92";
    const kMaticAddress = "0x582457CE6543597Eb5D913c1CD47d96ba8CFa4C9";
    const devWalletTimeLock = 12243101;

    const Router = await ethers.getContractFactory("DefiRouter");
    const router = await Router.attach(routerAddress);

    const factoryAddress = await router.factory();
    const Factory = await ethers.getContractFactory("DefiFactory");
    const factory = await Factory.attach(factoryAddress);

    const DefiToken = await ethers.getContractFactory("DefiToken");
    const defi = await DefiToken.deploy();
    await defi.deployed();

    const DevWallet = await ethers.getContractFactory("DevWallet");
    const devWallet = await DevWallet.deploy(defi.address, devWalletTimeLock);
    await devWallet.deployed();

    await defi.mintTo(devWallet.address, ethers.utils.parseEther("10000000"));
    await defi.mintTo(marketingWallet, ethers.utils.parseEther("3000000"));
    await defi.mintTo(godfatherPrize, ethers.utils.parseEther("200000"));
    await defi.mintTo(puppyPrize, ethers.utils.parseEther("900000"));
    await defi.mintTo(moysPrize, ethers.utils.parseEther("3600000"));

    await defi.mintTo(lpReserveWallet, ethers.utils.parseEther("200000"));
    await defi.mintTo(foodCourtWallet, ethers.utils.parseEther("2000000"));
    await defi.mintTo(privateSellWallet, ethers.utils.parseEther("1200000"));

    if ((await factory.getPair(defi.address, wbnbAddress)) === zero)
        await factory.createPair(defi.address, wbnbAddress);
    if ((await factory.getPair(defi.address, busdAddress)) === zero)
        await factory.createPair(defi.address, busdAddress);
    if ((await factory.getPair(wbnbAddress, busdAddress)) === zero) await factory.createPair(wbnbAddress, busdAddress);
    if ((await factory.getPair(usdtAddress, busdAddress)) === zero) await factory.createPair(usdtAddress, busdAddress);
    if ((await factory.getPair(kMaticAddress, wbnbAddress)) === zero)
        await factory.createPair(kMaticAddress, wbnbAddress);

    console.log(`DefiToken: ${defi.address}`);
    console.log(`DevWallet: ${devWallet.address}`);

    const pairDefiBnb = await factory.getPair(defi.address, wbnbAddress);
    const pairDefiBusd = await factory.getPair(defi.address, busdAddress);
    const pairBnbBusd = await factory.getPair(wbnbAddress, busdAddress);
    const pairUsdtBusd = await factory.getPair(usdtAddress, busdAddress);
    const pairkMaticWbnb = await factory.getPair(kMaticAddress, wbnbAddress);

    console.log("DEFI-BNB", pairDefiBnb);
    console.log("DEFI-BUSD", pairDefiBusd);
    console.log("BNB-BUSD", pairBnbBusd);
    console.log("USDT-BUSD", pairUsdtBusd);
    console.log("kMAITC-BNB", pairkMaticWbnb);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

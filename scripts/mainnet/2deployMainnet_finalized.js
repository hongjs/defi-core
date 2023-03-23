const {ethers} = require("hardhat");
// const hre = require('hardhat');

async function main() {
    const [owner] = await ethers.getSigners();
    const zero = "0x0000000000000000000000000000000000000000";
    const routerAddress = "0x0F4610aB02920a99f639F675085A5d3e24b0D7ae";
    const masterChefAddress = "0x5D21D02378670119453530478288AEe67b807e2a";

    const marketingWallet = "0x88cc3cCce593DAF2C731e1c25f953D081149a496";
    const puppyPrize = "0x44ca23bec54c979F33ed41326C7b8F956c4c59fa";
    const godfatherPrize = "0xC747ed382F8e686b285D36F9d430E5af4f7D582D";
    const moysPrize = "0x64a223F70158F6A94Dd967868E144F07Ea02a205";
    const devWalletAddress = "0x2fC1fe410A2C0d17995D32F43D9748Ff944A1d4c";

    const defiAddress = "0xBdb44DF0A914c290DFD84c1eaf5899d285717fdc";
    const wbnbAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    const busdAddress = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
    const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
    const kMaticAddress = "0x032574B64Bf6fa42951f836CC8c5099d1C5747d3";

    const Router = await ethers.getContractFactory("DefiRouter");
    const router = await Router.attach(routerAddress);

    const factoryAddress = await router.factory();
    const Factory = await ethers.getContractFactory("DefiFactory");
    const factory = await Factory.attach(factoryAddress);

    const DefiToken = await ethers.getContractFactory("DefiToken");
    const defi = await DefiToken.attach(defiAddress);

    // await defi.mintTo(devWalletAddress, ethers.utils.parseEther("10000000"));
    // await defi.mintTo(marketingWallet, ethers.utils.parseEther("3000000"));
    // await defi.mintTo(godfatherPrize, ethers.utils.parseEther("200000"));
    // await defi.mintTo(puppyPrize, ethers.utils.parseEther("900000"));
    // await defi.mintTo(moysPrize, ethers.utils.parseEther("3600000"));

    if ((await factory.getPair(defi.address, wbnbAddress)) === zero)
        await factory.createPair(defi.address, wbnbAddress);
    if ((await factory.getPair(defi.address, busdAddress)) === zero)
        await factory.createPair(defi.address, busdAddress);

    const WAIT = await defi.totalSupply();

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

    const DefiMasterChef = await ethers.getContractFactory("DefiMasterChef");
    const masterChef = await DefiMasterChef.attach(masterChefAddress);

    // on Mainnet, Dont'add LP via script, please use bscscan.com
    // await masterChef.add(4000, pairDefiBnb, 0, 0);
    // await masterChef.add(3000, pairDefiBusd, 0, 0);
    // await masterChef.add(300, pairBnbBusd, 80, 200);
    // await masterChef.add(100, pairUsdtBusd, 80, 200);
    // await masterChef.add(50, pairkMaticWbnb, 80, 200);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

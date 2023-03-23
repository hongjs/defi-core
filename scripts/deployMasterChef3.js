const {ethers} = require("hardhat");
// const hre = require('hardhat');

async function main() {
    const [owner] = await ethers.getSigners();

    const routerAddress = "0x7F1d484f02d59E61AE4eC6FC0128ceCa8DF95C3d";
    const wbnbAddress = "0xCAba8F3ed2493CAC6AbEb493b4F10419d9c37e06";
    const busdAddress = "0xaB3F4ebABFd6898452543454AAE908Df71658801";
    const usdtAddress = "0x26F7A9eED4C7d496926b8FD90Bf51accF3CF8d92";
    const kMaticAddress = "0x582457CE6543597Eb5D913c1CD47d96ba8CFa4C9";
    const defiAddress = "0xb64E0710e59ea2A08E65EB2496973F27e818664c";

    const Router = await ethers.getContractFactory("DefiRouter");
    const router = await Router.attach(routerAddress);

    const DefiToken = await ethers.getContractFactory("DefiToken");
    const defi = await DefiToken.attach(defiAddress);

    const BEP40Token = await ethers.getContractFactory("BEP40Token");
    const wbnbToken = await BEP40Token.attach(wbnbAddress);
    const busdToken = await BEP40Token.attach(busdAddress);
    const usdtToken = await BEP40Token.attach(usdtAddress);
    const kMaticToken = await BEP40Token.attach(kMaticAddress);

    // 1800 DEFI: 1 BNB
    await defi.approve(router.address, ethers.utils.parseEther("500000"));
    await wbnbToken.approve(router.address, ethers.utils.parseEther("100"));
    await router.addLiquidity(
        defi.address,
        wbnbToken.address,
        ethers.utils.parseEther("500000"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        owner.address,
        Date.now() + 1200
    );

    // 4 DEFI: 1 BUSD
    await defi.approve(router.address, ethers.utils.parseEther("300000"));
    await busdToken.approve(router.address, ethers.utils.parseEther("30000"));
    await router.addLiquidity(
        defi.address,
        busdToken.address,
        ethers.utils.parseEther("300000"),
        ethers.utils.parseEther("30000"),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        owner.address,
        Date.now() + 1200
    );

    // 0.0022 BNB = 1 BUSD
    await busdToken.approve(router.address, ethers.utils.parseEther("50000"));
    await wbnbToken.approve(router.address, ethers.utils.parseEther("100"));
    await router.addLiquidity(
        busdToken.address,
        wbnbToken.address,
        ethers.utils.parseEther("50000"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        owner.address,
        Date.now() + 1200
    );

    // 10 USDT = 10 BUSD
    await usdtToken.approve(router.address, ethers.utils.parseEther("10000"));
    await busdToken.approve(router.address, ethers.utils.parseEther("10000"));
    await router.addLiquidity(
        usdtToken.address,
        busdToken.address,
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        owner.address,
        Date.now() + 1200
    );

    await kMaticToken.approve(router.address, ethers.utils.parseEther("100000"));
    await wbnbToken.approve(router.address, ethers.utils.parseEther("300"));
    await router.addLiquidity(
        kMaticToken.address,
        wbnbToken.address,
        ethers.utils.parseEther("100000"),
        ethers.utils.parseEther("300"),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        owner.address,
        Date.now() + 1200
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

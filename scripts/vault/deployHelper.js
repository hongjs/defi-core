const {ethers} = require("hardhat");

async function main() {
    const [owner] = await ethers.getSigners();

    const network = {
        mainnet: {
            wbnb: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
            busd: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
            usdt: "0x55d398326f99059fF775485246999027B3197955",
            link: "0x404460c6a5ede2d891e8297795264fde62adbb75",
            vrfCoordinator: "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f",
            keyHash: "0x114f3da0a805b6a67d6e9cd2ec746f7028f1b7376365af575cfea3550dd1aa04",
            subscriptionId: 50,
            specialPot: "0xadcb42bC2A43F13057D2af5401A03C440C2aad42",
            specialPotHelper: "0xA7eAF122fEB58DE762abCE61C7eA16e73BC1FB28",
        },
        testnet: {
            wbnb: "0xCAba8F3ed2493CAC6AbEb493b4F10419d9c37e06",
            busd: "0xaB3F4ebABFd6898452543454AAE908Df71658801",
            usdt: "0x26F7A9eED4C7d496926b8FD90Bf51accF3CF8d92",
            link: "0x84b9b910527ad5c03a9ca831909e21e236ea7b06",
            vrfCoordinator: "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f",
            keyHash: "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314",
            subscriptionId: 423,
            specialPot: "",
            specialPotHelper: "",
        },
    };

    const testnet = {
        defi: {
            ...network.testnet,
            router: "0x7F1d484f02d59E61AE4eC6FC0128ceCa8DF95C3d",
            specialPot: "0x14c98F453Cd348FA711494550864e169B59aB767",
            specialPotHelper: "0xA7eAF122fEB58DE762abCE61C7eA16e73BC1FB28",
        },
    };

    const n = testnet.defi;

    // GasPrice = await ethers.getContractFactory("GasPrice");
    // gasPrice = await GasPrice.deploy();
    // await gasPrice.deployed();
    // console.log(`### GasPrice = ${gasPrice.address}`);
    // console.log(`npx hardhat verify --network testnet ${gasPrice.address}`);

    DefiVaultHelper = await ethers.getContractFactory("DefiVaultHelper");
    helper = await DefiVaultHelper.deploy(n.router, n.wbnb, n.busd, n.usdt);
    await helper.deployed();
    console.log(`### Helper = ${helper.address}`);
    console.log(`npx hardhat verify --network testnet ${helper.address} ${n.router} ${n.wbnb} ${n.busd} ${n.usdt}`);

    // DefiTokenVaultHelper = await ethers.getContractFactory("DefiTokenVaultHelper");
    // tokenHelper = await DefiTokenVaultHelper.deploy(n.router, n.wbnb);
    // await tokenHelper.deployed();
    // console.log(`### TokenHelper = ${tokenHelper.address}`);
    // console.log(`npx hardhat verify --network testnet ${tokenHelper.address} ${n.router} ${n.wbnb}`);

    // DefiVaultRaffle = await ethers.getContractFactory("DefiVaultRaffle");
    // raffle = await DefiVaultRaffle.deploy(n.vrfCoordinator, n.link, n.keyHash, n.subscriptionId, n.wbnb);
    // await raffle.deployed();
    // console.log(`### Raffle = ${raffle.address}`);
    // console.log(
    //     `npx hardhat verify --network testnet ${raffle.address} ${n.vrfCoordinator} ${n.link} ${n.keyHash} ${n.subscriptionId} ${n.wbnb}`
    // );

    // DefiVaultRaffle = await ethers.getContractFactory("DefiVaultRaffle");
    // const raffle = await DefiVaultRaffle.attach("0x5eCbD57cc697B51C3d913b0bd194c7Cbb4cdaACC");
    // await raffle.setSpecialPot(n.specialPot, n.specialPotHelper);
    // console.log(raffle.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

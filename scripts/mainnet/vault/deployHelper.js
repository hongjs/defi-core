const {ethers} = require("hardhat");

async function main() {
    const [owner] = await ethers.getSigners();

    const network = {
        wbnb: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        busd: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
        usdt: "0x55d398326f99059fF775485246999027B3197955",
        link: "0x404460c6a5ede2d891e8297795264fde62adbb75",
        vrfCoordinator: "0xc587d9053cd1118f25f645f9e08bb98c9712a4ee",
        keyHash: "0xba6e730de88d94a5510ae6613898bfb0c3de5d16e609c5b7da808747125506f7",
        subscriptionId: 50,
        raffle: "0xcF586d88EcA628d2F62791352Fb36DBDA3B0514e",
        specialPot: "0xdB7bE0267de798d39401AbB81f98a13Aad9636c9",
        specialPotHelper: "0x89d7dDcaf8C7d8F4506925b242cfF5b6452f8b55",
    };

    const mainnet = {
        biswap: {
            ...network,
            router: "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8",
        },
        babyswap: {
            ...network,
            router: "0x325E343f1dE602396E256B67eFd1F61C3A6B38Bd",
        },
        killswitch: {
            ...network,
            router: "0x0F4610aB02920a99f639F675085A5d3e24b0D7ae",
        },
    };

    const n = mainnet.babyswap;

    // GasPrice = await ethers.getContractFactory("GasPrice");
    // gasPrice = await GasPrice.deploy();
    // await gasPrice.deployed();
    // console.log(`### GasPrice = ${gasPrice.address}`);
    // console.log(`npx hardhat verify --network mainnet ${gasPrice.address}`);

    // DefiVaultHelperBiswap = await ethers.getContractFactory("DefiVaultHelperBiswap");
    // helper = await DefiVaultHelperBiswap.deploy(n.router, n.wbnb, n.busd, n.usdt);
    // await helper.deployed();
    // console.log(`### Helper = ${helper.address}`);
    // console.log(`npx hardhat verify --network mainnet ${helper.address} ${n.router} ${n.wbnb} ${n.busd} ${n.usdt}`);

    // DefiVaultHelperBaby = await ethers.getContractFactory("DefiVaultHelperBaby");
    // helper = await DefiVaultHelperBaby.deploy(n.router, n.wbnb, n.usdt);
    // await helper.deployed();
    // console.log(`### Helper = ${helper.address}`);
    // console.log(`npx hardhat verify --network mainnet ${helper.address} ${n.router} ${n.wbnb} ${n.usdt}`);

    // DefiVaultHelper = await ethers.getContractFactory("DefiVaultHelper");
    // helper = await DefiVaultHelper.deploy(n.router, n.wbnb, n.busd, n.usdt);
    // await helper.deployed();
    // console.log(`### Helper = ${helper.address}`);
    // console.log(`npx hardhat verify --network mainnet ${helper.address} ${n.router} ${n.wbnb} ${n.busd} ${n.usdt}`);

    // DefiTokenVaultHelper = await ethers.getContractFactory("DefiTokenVaultHelper");
    // tokenHelper = await DefiTokenVaultHelper.deploy(n.router, n.wbnb);
    // await tokenHelper.deployed();
    // console.log(`### TokenHelper = ${tokenHelper.address}`);
    // console.log(`npx hardhat verify --network mainnet ${tokenHelper.address} ${n.router} ${n.wbnb}`);

    DefiVaultRaffle = await ethers.getContractFactory("DefiVaultRaffle");
    raffle = await DefiVaultRaffle.deploy(n.vrfCoordinator, n.link, n.keyHash, n.subscriptionId, n.wbnb);
    await raffle.deployed();
    console.log(`### Raffle = ${raffle.address}`);
    console.log(
        `npx hardhat verify --network mainnet ${raffle.address} ${n.vrfCoordinator} ${n.link} ${n.keyHash} ${n.subscriptionId} ${n.wbnb}`
    );

    // DefiVaultRaffle = await ethers.getContractFactory("DefiVaultRaffle");
    // const raffle = await DefiVaultRaffle.attach(network.raffle);
    await raffle.setSpecialPot(n.specialPot, n.specialPotHelper);
    console.log(raffle.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

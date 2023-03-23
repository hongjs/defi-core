const {ethers} = require("hardhat");

async function main() {
    const factoryContractAddress = "0xBB15644A239232BFD552576d8D75a4571d47Fb8a";
    const wbnbAddress = "0xCAba8F3ed2493CAC6AbEb493b4F10419d9c37e06";

    const [owner] = await ethers.getSigners();

    const DefiFactory = await ethers.getContractFactory("DefiFactory");
    const factory = await DefiFactory.attach(factoryContractAddress);
    console.log(`Factory: ${factory.address}`);

    const DefiRouter = await ethers.getContractFactory("DefiRouter");
    const router = await DefiRouter.deploy(factory.address, wbnbAddress);
    await router.deployed();
    console.log(`Router: ${router.address}`);
    console.log(`WBNB: ${wbnbAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

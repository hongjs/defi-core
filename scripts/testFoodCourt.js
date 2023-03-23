const {ethers} = require("hardhat");
// const hre = require('hardhat');

async function main() {
    const [owner] = await ethers.getSigners();

    const foodCourtRouterAddress = "0x0F4610aB02920a99f639F675085A5d3e24b0D7ae";
    // const defiAddress = "0x861Bea31827313f625c0a60d00e3182B2183125C";
    // const wbnbAddress = "0x094616F0BdFB0b526bD735Bf66Eca0Ad254ca81F";
    // const busdAddress = "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee";
    // const usdtAddress = "0x337610d27c682e347c9cd60bd4b3b107c9d34ddd";

    const Router = await ethers.getContractFactory("DefiRouter");
    router = await Router.attach(foodCourtRouterAddress);

    console.log("router", router.address);

    const factoryAddress = await router.factory();
    const Factory = await ethers.getContractFactory("DefiFactory");
    const factory = await Factory.attach(factoryAddress);
    console.log("Factory.address", factory.address);

    // const _deadline = Date.now() + 1200;
    // await router.addLiquidity(
    //   defiAddress,
    //   busdAddress,
    //   1,
    //   1,
    //   0,
    //   0,
    //   owner.address,
    //   _deadline
    // );

    const INIT_CODE_PAIR_HASH = await factory.INIT_CODE_PAIR_HASH();
    console.log("Factory.INIT_CODE_PAIR_HASH", INIT_CODE_PAIR_HASH);

    const allPairsLength = await factory.allPairsLength();
    console.log("Factory.allPairsLength", allPairsLength.toNumber());

    await printAllFoodCourtPairs(factory, allPairsLength.toNumber());

    // await getTotalBalanceLp("0xD2c3d9A0c51F4b662e195B046880E63cA5Ff7dB8", defiAddress, busdAddress);

    // await getTotalBalanceLp(
    //   "0x5B2C70Bf4cb1F47b695b6aD732238b966F5f3f9A",
    //   defiAddress,
    //   wbnbAddress
    // );

    // await getTotalBalanceLp(
    //   "0x9C6781E26F97052De31AcA53421f807F53C2a7c9",
    //   wbnbAddress,
    //   busdAddress
    // );
}

const getTotalBalanceLp = async (pair, token1Address, token2Address) => {
    const DefiToken = await ethers.getContractFactory("DefiToken");
    const token1 = await DefiToken.attach(token1Address);
    const token2 = await DefiToken.attach(token2Address);

    const token1Balance = await token1.balanceOf(pair);
    const token2Balance = await token2.balanceOf(pair);

    console.log("token1", token1Balance);
    console.log("token2", token2Balance);
};

const printAllFoodCourtPairs = async (factory, allPairsLength) => {
    const ids = [];
    for (let i = 0; i < allPairsLength; i++) {
        ids.push(i);
    }

    const DefiPair = await ethers.getContractFactory("DefiPair");
    const DefiERC20 = await ethers.getContractFactory("DefiToken");

    await Promise.all(
        ids.map(async (id) => {
            const pairAdress = await factory.allPairs(id);
            const pair = await DefiPair.attach(pairAdress);
            const token0Address = await pair.token0();
            const token1Address = await pair.token1();
            const token0 = await DefiERC20.attach(token0Address);
            const token1 = await DefiERC20.attach(token1Address);
            const token0Symbol = await token0.symbol();
            const token1Symbol = await token1.symbol();

            console.log(id, pairAdress, token0.address, token0Symbol, token1.address, token1Symbol);
        })
    );
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

const {ethers} = require("hardhat");
const BigNumber = require("bignumber.js");
// const hre = require('hardhat');

async function main() {
    [owner] = await ethers.getSigners();

    await deployMarketplace();
}

const deployMarketplace = async () => {
    const busdAddress = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
    const puppyAddress = "0x6515CF06686F8Eed508b880C8e5E8e9Cf9c6b686";
    // const busdAddress = "0xaB3F4ebABFd6898452543454AAE908Df71658801";
    // const puppyAddress = "0xa25644d845cdc4D2e05420C787eeDf0F38Edc60f";
    const PuppyStorage = await ethers.getContractFactory("PuppyStorage");
    const puppy = await PuppyStorage.attach(puppyAddress);
    const DefiMarketplace = await ethers.getContractFactory("DefiMarketplace");
    const market = await DefiMarketplace.deploy(busdAddress, puppy.address, 1000);
    await market.deployed();
    await puppy.addCanMint(owner.address);

    console.log("market", market.address);
    console.log(`npx hardhat verify --network testnet ${market.address} ${busdAddress} ${puppy.address} 1000`);
};

const bulkCreateListing = async () => {
    const puppyAddress = "0xa25644d845cdc4D2e05420C787eeDf0F38Edc60f";
    const marketplaceAddress = "0xdE65CF6Ef7bC704d0254D42D10A9E3E062B708ab";

    const PuppyStorage = await ethers.getContractFactory("PuppyStorage");
    const puppy = await PuppyStorage.attach(puppyAddress);
    const DefiMarketplace = await ethers.getContractFactory("DefiMarketplace");
    const market = await DefiMarketplace.attach(marketplaceAddress);

    await puppy.setApprovalForAll(market.address, true);

    const balance = new BigNumber((await puppy.balanceOf(owner.address))._hex).toNumber();
    const indexes = [...Array(balance).keys()];

    for await (const index of indexes) {
        const tokenId = new BigNumber((await puppy.tokenOfOwnerByIndex(owner.address, index))._hex).toNumber();
        const endPrice = Math.round(Math.random() * 100) + 50;
        const startPrice = Math.round(Math.random() * 1000) + endPrice + 200;
        const duration = 80000 + Math.round(Math.random() * 500000);
        const contained = await market.containKey(tokenId);
        if (contained === false) {
            const start = new BigNumber(startPrice.toString()).times(new BigNumber(10).pow(18));
            const end = new BigNumber(endPrice.toString()).times(new BigNumber(10).pow(18));

            await market.createListing(tokenId, start.toFixed(), end.toFixed(), duration);
            console.log(tokenId, start.toFixed(), end.toFixed(), duration);
        }
    }

    console.log("done");
};

const bulkCancelListing = async () => {
    const marketplaceAddress = "0xA613cf461bF13ff2D6fE2F9d1b5c1eDF65812E13";
    const DefiMarketplace = await ethers.getContractFactory("DefiMarketplace");
    const market = await DefiMarketplace.attach(marketplaceAddress);

    await market.pause();

    const keys = (await market.getKeys()).map((i) => {
        return new BigNumber(i._hex).toNumber();
    });

    for await (const key of keys) {
        await market.cancelListingWhenPaused(key);
        console.log("cancelled: ", key);
    }

    console.log("done");
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

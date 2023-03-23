const {ethers} = require("hardhat");
const BigNumber = require("bignumber.js");

async function main() {
    const [owner] = await ethers.getSigners();

    const BEP40Token = await ethers.getContractFactory("BEP40Token");
    const wbnb = await BEP40Token.deploy("WBNB", "WBNB");
    await wbnb.deployed();

    const busd = await BEP40Token.deploy("BUSD", "BUSD");
    await busd.deployed();

    const usdt = await BEP40Token.deploy("USDT", "USDT");
    await usdt.deployed();

    const kmatic = await BEP40Token.deploy("kMATIC", "kMATIC");
    await kmatic.deployed();

    const coupon = await BEP40Token.deploy("COUPON", "COUPON");
    await coupon.deployed();

    await wbnb.mint(ethers.utils.parseEther("10000000"));
    await busd.mint(ethers.utils.parseEther("10000000"));
    await usdt.mint(ethers.utils.parseEther("10000000"));
    await kmatic.mint(ethers.utils.parseEther("10000000"));
    await coupon.mint(ethers.utils.parseEther("10000000"));

    await wbnb.transfer(owner.address, ethers.utils.parseEther("10000000"));
    await busd.transfer(owner.address, ethers.utils.parseEther("10000000"));
    await usdt.transfer(owner.address, ethers.utils.parseEther("10000000"));
    await kmatic.transfer(owner.address, ethers.utils.parseEther("10000000"));
    await coupon.transfer(owner.address, ethers.utils.parseEther("10000000"));

    console.log("WBNB: ", wbnb.address);
    console.log("BUSD: ", busd.address);
    console.log("USDT: ", usdt.address);
    console.log("kMATIC: ", kmatic.address);
    console.log("COUPON: ", coupon.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

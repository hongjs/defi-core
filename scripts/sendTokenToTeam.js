const {default: BigNumber} = require("bignumber.js");
const {ethers} = require("hardhat");
// const hre = require('hardhat');

async function main() {
    const [owner] = await ethers.getSigners();
    const BEP40Token = await ethers.getContractFactory("BEP40Token");

    const members = [
        "0x18C4e4Aa859D459F2BDA187e20C582ac0e6D134d", // Gong
        "0x6Aee1e3Df20AB3C1Fd558d2Bdc8b1BFa2b648E82", // Jan
        "0xc535A106708a6b2A46C22ddB0e8c2E14B6a81b5f", // Pong
        "0xa5b47612680Bb7029f012ec51fEcC4456a788711", // p'pex
    ];

    const defiAddress = "0xb64E0710e59ea2A08E65EB2496973F27e818664c";
    // const busdAddress = "0xaB3F4ebABFd6898452543454AAE908Df71658801";
    // const couponAddress = "0x53705AFc23AAA8Ea3538D552CEA33d791251238F";

    const pairDefiBnbAddress = "0x50d787Bb18dfFd6FA9fC95f62DF827FBE959fd06";
    const pairDefiBusdAddress = "0x2C67AF1f0CBDc2b6116149060Ca1Abf9AC7A0b24";
    const pairBnbBusdAddress = "0x32C14bb8d97Cd18eA3Db715BB4e075b89C3317B3";
    const pairUsdtBusdAddress = "0xfFC5E7c2067e34E396aCD51415AFB60c715C2Bbe";
    const pairkMaticWbnbAddress = "0x365FAB678B57064eFa4F39D0e70BbFF4d6846A8C";

    console.log("## DEFI");
    await sendTokenAmount(BEP40Token, owner, members, defiAddress, 1000000);
    // console.log("## BUSD");
    // await sendTokenAmount(BEP40Token, owner, members, busdAddress, 10000);
    // console.log("## COUPON");
    // await sendTokenAmount(BEP40Token, owner, members, couponAddress, 1000);

    console.log("## DEFI-BNB");
    await sendTokenAmount(BEP40Token, owner, members, pairDefiBnbAddress);
    console.log("## DEFI-BUSD");
    await sendTokenAmount(BEP40Token, owner, members, pairDefiBusdAddress);
    console.log("## BNB-BUSD");
    await sendTokenAmount(BEP40Token, owner, members, pairBnbBusdAddress);
    console.log("## USDT-BUSD");
    await sendTokenAmount(BEP40Token, owner, members, pairUsdtBusdAddress);
    console.log("## kMATIC-BNB");
    await sendTokenAmount(BEP40Token, owner, members, pairkMaticWbnbAddress);
}

const sendTokenAmount = async (BEP40Token, owner, members, tokenAddress, amount) => {
    if (!members || members.length === 0) return;

    const count = members.length + 2;
    const token = await BEP40Token.attach(tokenAddress);
    if (!amount) {
        const balance = await token.balanceOf(owner.address);
        amount = new BigNumber(balance._hex).div(new BigNumber(10).pow(18)).div(count);
        amount = Math.round(amount);
    }

    for (const idx in members) {
        await token.transfer(members[idx], ethers.utils.parseEther(amount.toString()));
        console.log(
            "transfer " + token.address + " to " + members[idx] + " = " + ethers.utils.parseEther(amount.toString())
        );
    }
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

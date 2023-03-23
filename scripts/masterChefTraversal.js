const {default: BigNumber} = require("bignumber.js");
const hre = require("hardhat");

async function main() {
    const [owner] = await ethers.getSigners();

    const masterChefAddress = "0xdfAa0e08e357dB0153927C7EaBB492d1F60aC730";

    const DefiMasterChef = await ethers.getContractFactory("DefiMasterChef");
    const DefiPair = await ethers.getContractFactory("DefiPair");
    const BEP40Token = await ethers.getContractFactory("BEP40Token");
    const masterChef = await DefiMasterChef.attach(masterChefAddress);

    const length = await masterChef.poolLength();
    console.log(length.toNumber());

    const pids = [];
    for (pid = 0; pid < length.toNumber(); pid++) pids.push(pid);

    await Promise.all(
        await pids.map(async (pid) => {
            try {
                const info = await masterChef.poolInfo(pid);
                console.log(123);
                if (pid === 0) {
                    const token0 = await BEP40Token.attach(info.lpToken);
                    const token0Symbol = await token0.symbol();
                    console.log(pid, info.lpToken, token0Symbol);
                } else {
                    const pair = await DefiPair.attach(info.lpToken);

                    const token0Addr = await pair.token0();
                    const token0 = await BEP40Token.attach(token0Addr);
                    const token0Symbol = await token0.symbol();

                    const token1Addr = await pair.token1();
                    const token1 = await BEP40Token.attach(token1Addr);
                    const token1Symbol = await token1.symbol();
                    console.log(pid, info.lpToken, `${token0Symbol}-${token1Symbol}`);
                }
            } catch (error) {
                console.log(pid, "error ");
            }
        })
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

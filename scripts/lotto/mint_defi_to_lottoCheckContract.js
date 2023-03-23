const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");

const {
    printLottoResult,
    printLottoAwardTimeLock,
    printGodfatherTokenOwnedBy,
    getWinnerByRound,
    getTimeFormat,
    awardChainlinkAndForwardTime,
    getPuppyTokenIndex,
    getPuppyWinnerByRound,
    transferETHTo,
} = require("../../test/lotto/utils/lottoUtil.js");

const {_getPuppyValidTokenIndexCounter} = require("../../test/lotto/utils/lottoUtilV2.js");

function sleep(ms) {
    console.log("sleep : ", ms, " ms");
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    const DefiAddress = "0x406e282E2519F203E0f2a708D4289fa4F8ACFE74";
    const godfatherLottoCheckAddress = "0x5993a2603FF71dDfc7F4324A839bD4da45Bc2DeA";
    const puppyLottoCheckAddress = "0x658B334ce996995edb4677e3F820A94928011B6b";
    const moyLottoCheckAddress = "0x08870c2E0B4D946749d389FA4ad88FCe613068ca";
    DefiToken = await ethers.getContractFactory("DefiToken");
    defi = await DefiToken.attach(DefiAddress);
    await defi.mintTo(godfatherLottoCheckAddress, ethers.utils.parseEther("5000000"));
    await defi.mintTo(puppyLottoCheckAddress, ethers.utils.parseEther("5000000"));
    await defi.mintTo(moyLottoCheckAddress, ethers.utils.parseEther("5000000"));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

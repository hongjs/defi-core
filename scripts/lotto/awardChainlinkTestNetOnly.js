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
    const defiLottoAwardAddress = "0x1B22cBf0f40D18DD5Ddda93B5Cf5fa9182b87133";
    const GodfatherStorageAddress = "0x1C7991cEc96383Dc49D70DB23e6DdBe04b60E614";
    const PuppyStorageAddress = "0xa25644d845cdc4D2e05420C787eeDf0F38Edc60f";

    // VRF Lotto Award
    DefiLottoAwardV2 = await ethers.getContractFactory("DefiLottoAwardV2");
    defiLottoAwardV2 = await DefiLottoAwardV2.attach(defiLottoAwardAddress);

    GodfatherStorage = await ethers.getContractFactory("GodfatherStorage");
    gftStorage = await GodfatherStorage.attach(GodfatherStorageAddress);

    PuppyStorage = await ethers.getContractFactory("PuppyStorage");
    puppyStorage = await PuppyStorage.attach(PuppyStorageAddress);

    // award using local Test
    // PUPPY
    await defiLottoAwardV2.awardWinnerByLocalTest(true, 11259174);
    // GODFATHER JACKPOT
    // await defiLottoAwardV2.awardWinnerByLocalTest(true, 2023418);
    // await defiLottoAwardV2.awardWinnerByLocalTest(true, 3311272);

    // // award using chainlink
    // await defiLottoAwardV2.awardWinnerByChainLink();
    sleep(6000);

    let latestRound = 0;
    let latestChainlinkAwardRound = 0;
    let latestCompletedRound = 0;
    let latestAwardTimestamp = 0;

    console.log("waiting for chainlink to fullfill randomness");
    do {
        [latestRound, latestChainlinkAwardRound, latestCompletedRound, latestAwardTimestamp] =
            await defiLottoAwardV2.getAwardCounter();
        console.log("latestCompletedRound: ", latestCompletedRound);
        console.log("latestChainlinkAwardRound: ", latestChainlinkAwardRound);
        await sleep(30000);
    } while (latestCompletedRound >= latestChainlinkAwardRound);

    console.log("latestRound: ", latestRound);
    console.log("latestChainlinkAwardRound: ", latestChainlinkAwardRound);
    console.log("latestCompletedRound: ", latestCompletedRound);

    if (latestCompletedRound < latestChainlinkAwardRound) {
        let chainLinkTimeStamp;
        let chainLinkRandomness;
        try {
            [chainLinkTimeStamp, chainLinkRandomness] = await defiLottoAwardV2.getChainLinkResultObject(
                latestCompletedRound
            );
        } catch (e) {
            throw e;
        }
        chainLinkRandomness = new BigNumber(chainLinkRandomness._hex);

        // Get Godfather, Puppy, Moy Won Number
        // const godfatherWonNumber = chainLinkRandomness.modulo(Math.pow(16, 6));
        // const puppyWonNumber = chainLinkRandomness.modulo(Math.pow(16, 2));
        // const moyWonNumber = chainLinkRandomness.modulo(Math.pow(16, 1));
        // // console.log([
        // //     chainLinkRandomness.toString(16),
        // //     godfatherWonNumber.toString(16),
        // //     puppyWonNumber.toString(16),
        // //     moyWonNumber.toString(16),
        // // ]);
        // // console.log([
        // //     chainLinkRandomness.toString(10),
        // //     godfatherWonNumber.toString(10),
        // //     puppyWonNumber.toString(10),
        // //     moyWonNumber.toString(10),
        // // ]);

        // // Get Valid Token & Sharing Holder (Bot will call pushValidTicket)
        // let godfatherValidToken;
        // let puppyValidToken;
        // let puppySharingHolder;
        // try {
        //     const godfatherBaseTicket = await gftStorage.getBaseTicket(godfatherWonNumber.toNumber(10));
        //     const ownerOfGodfatherWonNumber = await gftStorage.ownerOf(godfatherBaseTicket);
        //     // console.log("ownerOfGodfatherWonNumber: ", ownerOfGodfatherWonNumber);
        //     godfatherValidToken = godfatherWonNumber;
        // } catch (e) {
        //     // console.log("NOT FOUND JACKPOT OWNED");
        //     godfatherValidToken = new BigNumber(0);
        // }
        // [puppyValidToken, puppySharingHolder] = await _getPuppyValidTokenIndexCounter(puppyWonNumber);
        // await defiLottoAwardV2.pushValidTicket(
        //     godfatherValidToken.toNumber(),
        //     puppyValidToken.toNumber(),
        //     puppySharingHolder
        // );

        await defiLottoAwardV2.pushValidTicket();

        await sleep(6000);

        [
            awardRound,
            awardTimestamp,
            awardWonNumber,
            awardGodfatherValidToken,
            awardPuppyValidToken,
            awardWinnerSharingQuantity,
        ] = await defiLottoAwardV2.getAwardResultObject(latestCompletedRound);

        // =======================
        // DEBUG AWARD ROUND
        // =======================
        console.log([
            awardRound,
            awardTimestamp,
            awardWonNumber,
            awardGodfatherValidToken,
            awardPuppyValidToken,
            awardWinnerSharingQuantity,
        ]);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

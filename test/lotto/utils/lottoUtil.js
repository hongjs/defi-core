const {getCurrentTimeStamp} = require("../../../utils/timelockUtil.js");
const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");

const getPuppyWinnerByRound = async (_round) => {
    const DIVISOR = 16;
    const PUPPYDIGIT = 2;
    const result = await defiLottoAward.getAwardInformationByRound(_round);
    return BigNumber(result["chainLinkRandomResult"]._hex).mod(BigNumber(DIVISOR).pow(PUPPYDIGIT));
};

const transferETHTo = async (senderSigner, destinationAddress, amount) => {
    const tx = await senderSigner.sendTransaction({
        to: destinationAddress,
        value: amount,
    });
};

const getWinnerByRound = async (_round) => {
    const DIVISOR = 16;
    const GODFATHERDIGIT = 6;
    const PUPPYDIGIT = 2;
    const MOYDIGIT = 1;
    const result = await defiLottoAward.getAwardInformationByRound(_round);
    const awardTime = new Date(result["awardTimestampUTC"] * 1000);
    const formatTime = getTimeFormat(awardTime);
    // console.log(formatTime);
    tmpString = "0000000000" + result["round"];
    let round = tmpString.substring(tmpString.length - 3);
    tmpString =
        "0000000000000000000000000000000000000000000000000000000000000000" +
        BigNumber(result["chainLinkRandomResult"]._hex).toString(16).toUpperCase();
    chainLinkRandomResult = tmpString.substring(tmpString.length - 64);
    tmpString =
        "0000000000" +
        BigNumber(result["chainLinkRandomResult"]._hex)
            .mod(BigNumber(DIVISOR).pow(GODFATHERDIGIT))
            .toString(16)
            .toUpperCase();
    const godfatherWinner = tmpString.substring(tmpString.length - GODFATHERDIGIT);
    tmpString =
        "0000000000" +
        BigNumber(result["chainLinkRandomResult"]._hex)
            .mod(BigNumber(DIVISOR).pow(PUPPYDIGIT))
            .toString(16)
            .toUpperCase();
    const puppyWinner = tmpString.substring(tmpString.length - PUPPYDIGIT);
    tmpString = BigNumber(result["chainLinkRandomResult"]._hex)
        .mod(BigNumber(DIVISOR).pow(MOYDIGIT))
        .toString(16)
        .toUpperCase();
    const moyWinner = tmpString.substring(tmpString.length - MOYDIGIT);
    return {round, formatTime, chainLinkRandomResult, godfatherWinner, puppyWinner, moyWinner};
};

const getPuppyTokenIndex = (pack, number) => {
    const DIVISOR = 16;
    const PUPPY_EXPONENT = 2;
    const PUPPY_PER_PACK = 256;
    const PUPPY_MAXPACK_ALLOWED = 10;
    return pack * PUPPY_PER_PACK + number;
};

const printLottoResult = async () => {
    const DIVISOR = 16;
    const GODFATHERDIGIT = 6;
    const PUPPYDIGIT = 2;
    const MOYDIGIT = 1;
    const totalAwardRound = await defiLottoAward.currentAwardRound();
    console.log(
        "====  totalAwardRound: " +
            totalAwardRound +
            " ========================================================================================="
    );
    console.log(
        "Round,     DateTime     ,                             ChainLink                           , GFT   ,PP ,M"
    );
    for (let i = 0; i < totalAwardRound; i++) {
        result = await getWinnerByRound(i);
        console.log(
            " " +
                result.round +
                " ," +
                result.formatTime +
                " ," +
                result.chainLinkRandomResult +
                " ," +
                result.godfatherWinner +
                " ," +
                result.puppyWinner +
                " ," +
                result.moyWinner
        );
    }
};

const printLottoAwardTimeLock = async () => {
    const result = await defiLottoAward.awardTimeLockUTC();
    console.log("awardTimeLock : " + getTimeFormat(new Date(result * 1000)));
};

const getTimeFormat = (dateTime) => {
    let ye = new Intl.DateTimeFormat("en-US", {year: "numeric"}).format(dateTime);
    let mo = new Intl.DateTimeFormat("en-US", {month: "2-digit"}).format(dateTime);
    let da = new Intl.DateTimeFormat("en-US", {day: "2-digit"}).format(dateTime);
    let ho = new Intl.DateTimeFormat("en-US", {hour: "2-digit", hourCycle: "h23", hour12: false}).format(dateTime);
    let mi = new Intl.DateTimeFormat("en-US", {minute: "2-digit", hourCycle: "h23", hour12: false}).format(dateTime);
    let se = new Intl.DateTimeFormat("en-US", {second: "2-digit", hourCycle: "h23", hour12: false}).format(dateTime);
    if (mi < 10) {
        mi = "0" + mi;
    }
    if (se < 10) {
        se = "0" + se;
    }
    return ye + mo + da + " " + ho + ":" + mi + ":" + se;
};

const printGodfatherTokenOwnedBy = async (account) => {
    const accountTotalSupply = await gftStorage.connect(account).balanceOf(account.address);
    console.log("==== address: " + account.address + ", ownerAccountTotalSupply: " + accountTotalSupply);
    for (let i = 0; i < accountTotalSupply; i++) {
        const tokenIndex = await gftStorage.connect(account).tokenOfOwnerByIndex(account.address, i);
        const tokenURI = await gftStorage.connect(account).tokenURI(tokenIndex);
        const leadingZeroString = "0000000000" + tokenIndex;
        const ticketObj = JSON.parse(tokenURI);

        console.log(
            leadingZeroString.substring(leadingZeroString.length - 8) +
                " | " +
                tokenURI +
                " | Hex: " +
                ticketObj.n.toString(16)
        );
    }
};

const awardChainlinkAndForwardTime = async (
    account,
    overideRandomProcess,
    injectJackpotNumber,
    timeForwardInterval
) => {
    await defiLottoAward.connect(account).awardWinnerByLocalTest(overideRandomProcess, injectJackpotNumber);
    await setTimeForward(timeForwardInterval);
};

const setTimeForward = async (timeIncrease) => {
    await ethers.provider.send("evm_mine");
    await ethers.provider.send("evm_increaseTime", [timeIncrease ? timeIncrease : _1DAY + 20]);
};

const getPuppyAwardPrizeByRound = (_round) => {
    const defiPrizeArray = [
        ethers.utils.parseEther("9906"),
        ethers.utils.parseEther("9924"),
        ethers.utils.parseEther("9954"),
        ethers.utils.parseEther("9996"),
        ethers.utils.parseEther("10050"),
        ethers.utils.parseEther("10116"),
    ];
    const bnbPrizeArray = [
        ethers.utils.parseEther("0.72"),
        ethers.utils.parseEther("0.78"),
        ethers.utils.parseEther("0.88"),
        ethers.utils.parseEther("1.02"),
        ethers.utils.parseEther("1.2"),
        ethers.utils.parseEther("1.42"),
    ];
    if (_round == 179) {
        let defiPrize = new BigNumber(ethers.utils.parseEther("10116")._hex);
        let bnbPrize = new BigNumber(ethers.utils.parseEther("10.0")._hex);
        return {defiPrize, bnbPrize};
    } else {
        const monthIndex = parseInt(_round / 30);
        let defiPrize = new BigNumber(defiPrizeArray[monthIndex]._hex);
        let bnbPrize = new BigNumber(bnbPrizeArray[monthIndex]._hex);
        return {defiPrize, bnbPrize};
    }
};

const claimMultiplePuppyRewardAndVerify = async (_round, tokenIDArray, account, sharer) => {
    const {defiPrize, bnbPrize} = getPuppyAwardPrizeByRound(_round);
    defiBeforeClaimReward = new BigNumber((await defi.balanceOf(account.address))._hex);
    bnbBeforeClaimReward = new BigNumber((await ethers.provider.getBalance(account.address))._hex);
    await puppyLottoCheck.connect(account).claimMultipleReward(_round, tokenIDArray);
    defiAfterClaimReward = new BigNumber((await defi.balanceOf(account.address))._hex);
    bnbAfterClaimReward = new BigNumber((await ethers.provider.getBalance(account.address))._hex);

    defiDiff = defiAfterClaimReward.minus(defiBeforeClaimReward);
    bnbDiff = bnbAfterClaimReward.minus(bnbBeforeClaimReward);

    const quantity = tokenIDArray.length;

    // console.log("defiprize: " + ethers.utils.formatEther(defiPrize.toString(10)));
    // console.log("bnbPrize: " + ethers.utils.formatEther(bnbPrize.toString(10)));
    // console.log("sharer: " + sharer);

    if (_round % 2 == 0) {
        // console.log("You Got DEFI");
        // console.log("defiDiff: " + ethers.utils.formatEther(defiDiff.toString(10)));
        // console.log(
        //     "sharPrize: " +
        //         ethers.utils.formatEther(defiPrize.multipliedBy(quantity).dividedToIntegerBy(sharer).toString(10))
        // );

        expect(defiDiff.isEqualTo(defiPrize.multipliedBy(quantity).dividedToIntegerBy(sharer))).to.eq(true);
    } else {
        // console.log("You Got BNB");
        // console.log("bnbDiff: " + ethers.utils.formatEther(bnbDiff.toString(10)));
        const lowerBound = bnbPrize.multipliedBy(quantity).dividedToIntegerBy(sharer).multipliedBy(0.99);
        const upperBound = bnbPrize.multipliedBy(quantity).dividedToIntegerBy(sharer);
        // console.log("lowerBound: " + ethers.utils.formatEther(lowerBound.toString(10)));
        // console.log("upperBound: " + ethers.utils.formatEther(upperBound.toString(10)));

        // console.log(bnbDiff.isGreaterThan(lowerBound));
        expect(bnbDiff.isGreaterThan(lowerBound)).to.eq(true);
        expect(bnbDiff.isLessThan(upperBound)).to.eq(true);
    }

    // 10 BNB minus gas greater than 9.999
    // expect(bnbDiff.isGreaterThan("9999000000000000000")).to.eq(true);
    // expect(bnbDiff.isLessThan("10000000000000000000")).to.eq(true);
};

const claimPuppyRewardAndVerify = async (_round, tokenID, account, sharer) => {
    await claimMultiplePuppyRewardAndVerify(_round, tokenID, account, sharer);
};
// const claimPuppyRewardAndVerify = async (_round, tokenID, account, sharer) => {
//     const {defiPrize, bnbPrize} = getPuppyAwardPrizeByRound(_round);
//     defiBeforeClaimReward = new BigNumber((await defi.balanceOf(account.address))._hex);
//     bnbBeforeClaimReward = new BigNumber((await ethers.provider.getBalance(account.address))._hex);
//     await puppyLottoCheck.connect(account).claimReward(_round, tokenID);
//     defiAfterClaimReward = new BigNumber((await defi.balanceOf(account.address))._hex);
//     bnbAfterClaimReward = new BigNumber((await ethers.provider.getBalance(account.address))._hex);

//     defiDiff = defiAfterClaimReward.minus(defiBeforeClaimReward);
//     bnbDiff = bnbAfterClaimReward.minus(bnbBeforeClaimReward);
//     // console.log("defiprize: " + defiPrize);
//     // console.log("bnbPrize: " + bnbPrize);
//     // console.log("sharer: " + sharer);

//     if (_round % 2 == 0) {
//         // console.log("You Got DEFI");
//         // console.log("defiDiff: " + defiDiff);
//         // console.log("sharPrize: " + defiPrize.dividedToIntegerBy(2));
//         // console.log("sharPrize: " + defiPrize.dividedToIntegerBy(sharer));

//         expect(defiDiff.isEqualTo(defiPrize.dividedToIntegerBy(sharer))).to.eq(true);
//     } else {
//         // console.log("You Got BNB");
//         // console.log("bnbDiff: " + bnbDiff);
//         const lowerBound = bnbPrize.dividedToIntegerBy(sharer).multipliedBy(0.99);
//         const upperBound = bnbPrize.dividedToIntegerBy(sharer);
//         // console.log("lowerBound: " + lowerBound);
//         // console.log("upperBound: " + upperBound);

//         // console.log(bnbDiff.isGreaterThan(lowerBound));
//         expect(bnbDiff.isGreaterThan(lowerBound)).to.eq(true);
//         expect(bnbDiff.isLessThan(upperBound)).to.eq(true);
//     }

//     // 10 BNB minus gas greater than 9.999
//     // expect(bnbDiff.isGreaterThan("9999000000000000000")).to.eq(true);
//     // expect(bnbDiff.isLessThan("10000000000000000000")).to.eq(true);
// };
module.exports.getTimeFormat = getTimeFormat;
module.exports.printLottoResult = printLottoResult;
module.exports.printLottoAwardTimeLock = printLottoAwardTimeLock;
module.exports.printGodfatherTokenOwnedBy = printGodfatherTokenOwnedBy;
module.exports.getWinnerByRound = getWinnerByRound;
module.exports.awardChainlinkAndForwardTime = awardChainlinkAndForwardTime;
module.exports.getPuppyTokenIndex = getPuppyTokenIndex;
module.exports.getPuppyWinnerByRound = getPuppyWinnerByRound;
module.exports.transferETHTo = transferETHTo;
module.exports.setTimeForward = setTimeForward;
module.exports.getPuppyAwardPrizeByRound = getPuppyAwardPrizeByRound;
module.exports.claimPuppyRewardAndVerify = claimPuppyRewardAndVerify;
module.exports.claimMultiplePuppyRewardAndVerify = claimMultiplePuppyRewardAndVerify;

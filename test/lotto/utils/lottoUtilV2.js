const {getCurrentTimeStamp} = require("../../../utils/timelockUtil.js");
const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");

const awardChainlinkAndForwardTimeV2 = async (
    account,
    overideRandomProcess,
    injectJackpotNumber,
    timeForwardInterval
) => {
    // Get Latestround
    let latestRound;
    let latestChainlinkAwardRound;
    let latestCompletedRound;
    let latestAwardTimestamp;
    [latestRound, latestChainlinkAwardRound, latestCompletedRound, latestAwardTimestamp] = await defiLottoAwardV2
        .connect(account)
        .getAwardCounter();
    // console.log([latestRound, latestChainlinkAwardRound, latestCompletedRound, latestAwardTimestamp]);

    // Award Lotto
    await defiLottoAwardV2.connect(account).awardWinnerByLocalTest(overideRandomProcess, injectJackpotNumber);

    // Simulate Wait & Get Response From ChainLink
    let chainLinkTimeStamp;
    let chainLinkRandomness;
    try {
        [chainLinkTimeStamp, chainLinkRandomness] = await defiLottoAwardV2
            .connect(account)
            .getChainLinkResultObject(latestCompletedRound);
    } catch (e) {
        throw e;
    }
    chainLinkRandomness = new BigNumber(chainLinkRandomness._hex);
    // console.log([chainLinkTimeStamp, chainLinkRandomness]);

    // Get Godfather, Puppy, Moy Won Number
    const godfatherWonNumber = chainLinkRandomness.modulo(Math.pow(16, 6));
    const puppyWonNumber = chainLinkRandomness.modulo(Math.pow(16, 2));
    const moyWonNumber = chainLinkRandomness.modulo(Math.pow(16, 1));
    // console.log([
    //     chainLinkRandomness.toString(16),
    //     godfatherWonNumber.toString(16),
    //     puppyWonNumber.toString(16),
    //     moyWonNumber.toString(16),
    // ]);
    // console.log([
    //     chainLinkRandomness.toString(10),
    //     godfatherWonNumber.toString(10),
    //     puppyWonNumber.toString(10),
    //     moyWonNumber.toString(10),
    // ]);

    // Get Valid Token & Sharing Holder (Bot will call pushValidTicket)
    let godfatherValidToken;
    let puppyValidToken;
    let puppySharingHolder;
    try {
        const godfatherBaseTicket = await gftStorage.getBaseTicket(godfatherWonNumber.toNumber(10));
        const ownerOfGodfatherWonNumber = await gftStorage.ownerOf(godfatherBaseTicket);
        // console.log("ownerOfGodfatherWonNumber: ", ownerOfGodfatherWonNumber);
        godfatherValidToken = godfatherWonNumber;
    } catch (e) {
        // console.log("NOT FOUND JACKPOT OWNED");
        godfatherValidToken = new BigNumber(0);
    }
    [puppyValidToken, puppySharingHolder] = await _getPuppyValidTokenIndexCounter(puppyWonNumber);
    await defiLottoAwardV2.connect(admin).pushValidTicket();
    // .pushValidTicket(godfatherValidToken.toNumber(), puppyValidToken.toNumber(), puppySharingHolder);
    // await defiLottoAwardV2.connect(admin).pushValidTicket(godfatherWonNumber, puppyWonNumber, puppySharingHolder);

    // Print After Push
    [
        awardRound,
        awardTimestamp,
        awardWonNumber,
        awardGodfatherValidToken,
        awardPuppyValidToken,
        awardWinnerSharingQuantity,
    ] = await defiLottoAwardV2.connect(account).getAwardResultObject(latestCompletedRound);

    // =======================
    // DEBUG AWARD ROUND
    // =======================
    // console.log([
    //     awardRound,
    //     awardTimestamp,
    //     awardWonNumber,
    //     awardGodfatherValidToken,
    //     awardPuppyValidToken,
    //     awardWinnerSharingQuantity,
    // ]);

    await setTimeForward(timeForwardInterval);
};

const _checkGodfatherDuplicateAward = async (account, _inputNumber) => {
    // Get Latestround
    let latestRound;
    let latestChainlinkAwardRound;
    let latestCompletedRound;
    let latestAwardTimestamp;
    [latestRound, latestChainlinkAwardRound, latestCompletedRound, latestAwardTimestamp] = await defiLottoAwardV2
        .connect(account)
        .getAwardCounter();
    // console.log([latestRound, latestChainlinkAwardRound, latestCompletedRound, latestAwardTimestamp]);

    // Print After Push
    [
        awardRound,
        awardTimestamp,
        awardWonNumber,
        awardGodfatherValidToken,
        awardPuppyValidToken,
        awardWinnerSharingQuantity,
    ] = await defiLottoAwardV2.connect(account).getAwardResultObject(latestCompletedRound - 1);

    // =======================
    // DEBUG AWARD ROUND
    // =======================
    // console.log([
    //     awardRound,
    //     awardTimestamp,
    //     awardWonNumber,
    //     awardGodfatherValidToken,
    //     awardPuppyValidToken,
    //     awardWinnerSharingQuantity,
    // ]);
    // console.log("awardGodfatherValidToken: ", awardGodfatherValidToken);
    // console.log("calGodfatherWonNumber: ", awardWonNumber);
    const calGodfatherWonNumber = awardWonNumber % Math.pow(16, 6);
    expect(awardGodfatherValidToken).eq(0);
    expect(calGodfatherWonNumber).eq(_inputNumber);
    //chainLinkRandomness.modulo(Math.pow(16, 6))
};

const _getPuppyValidTokenIndexCounter = async (inputNumber) => {
    PUPPY_PER_PACK = 256;
    // const res = await puppyStorage.puppyCounter();
    // console.log("iRes: " + res);

    // makesure wonNumber must less than 255
    const wonNumber = inputNumber % 256;

    // 1st - Find What is the last puppy tokenId
    [currentPack, nextTicketNumber] = await puppyStorage.puppyCounter();
    currentPack = new BigNumber(currentPack._hex);
    nextTicketNumber = new BigNumber(nextTicketNumber._hex);
    const puppyValidToken = currentPack.multipliedBy(PUPPY_PER_PACK).plus(nextTicketNumber).minus(1);
    if (puppyValidToken == -1) {
        throw "Puppy is not Started, you need to mint 1 token before";
    }

    // console.log("currentPack: ", currentPack.toString(16));
    // console.log("nextTicketNumber: ", nextTicketNumber.toString(16));
    // console.log("puppyValidToken: ", puppyValidToken.toString(16));

    // 2nd - Find How many people won pack , reward is sharing among them
    // Logic - Find Sharing Holder
    // currentPack = number of sharing (winner)
    // nextTicketNumber = latest pack, if wonNumber > latestNumber, sharing should + 1
    let sharingHolder;
    if (wonNumber >= nextTicketNumber) {
        sharingHolder = currentPack;
    } else {
        sharingHolder = currentPack.plus(1);
    }

    return [puppyValidToken, sharingHolder.toNumber()];
};
// const _getPuppyValidTokenIndexCounter = async () => {
//     PUPPY_PER_PACK = 256;
//     // const res = await puppyStorage.puppyCounter();
//     // console.log("iRes: " + res);
//     [currentPack, nextTicketNumber] = await puppyStorage.puppyCounter();
//     currentPack = new BigNumber(currentPack._hex);
//     nextTicketNumber = new BigNumber(nextTicketNumber._hex);
//     const tokenId = currentPack.multipliedBy(PUPPY_PER_PACK).plus(nextTicketNumber);
//     console.log("currentPack: ", currentPack.toString(16));
//     console.log("nextTicketNumber: ", nextTicketNumber.toString(16));
//     console.log("tokenId: ", tokenId.toString(16));

//     if (puppyNumber >= nextTicketNumber) {
//         return currentPack;
//     } else {
//         return uint256(currentPack).add(1);
//     }
//     return tokenId;
// };

const mintPuppy = async (account, quantity) => {
    for (i = 0; i < quantity; i++) {
        // if (
        //     i % 100 == 0 ||
        //     i % 256 == 255
        //     // 1 == 1
        // ) {
        //     res_counter = await puppyStorage.puppyCounter();
        //     const leadingZeroString = "00000000000000" + i;
        //     console.log(
        //         "mint progress : " +
        //             leadingZeroString.substring(leadingZeroString.length - 3) +
        //             " | " +
        //             "currentPack: " +
        //             res_counter["currentPack"] +
        //             ", nextTicketNumber: " +
        //             res_counter["nextTicketNumber"]
        //     );
        // }
        await puppyStorage.mint(account.address);
    }
};

const setTimeForward = async (timeIncrease) => {
    await ethers.provider.send("evm_mine");
    await ethers.provider.send("evm_increaseTime", [timeIncrease ? timeIncrease : _1DAY + 20]);
};

const claimMultiplePuppyRewardAndVerifyV2 = async (_round, tokenIDArray, account, sharer) => {
    const PUPPY_LAST_ROUND = 180;
    const {defiPrize, bnbPrize} = getPuppyAwardPrizeByRound(_round);
    defiBeforeClaimReward = new BigNumber((await defi.balanceOf(account.address))._hex);
    bnbBeforeClaimReward = new BigNumber((await ethers.provider.getBalance(account.address))._hex);
    await puppyLottoCheckV2.connect(account).claimMultipleReward(_round, tokenIDArray);
    defiAfterClaimReward = new BigNumber((await defi.balanceOf(account.address))._hex);
    bnbAfterClaimReward = new BigNumber((await ethers.provider.getBalance(account.address))._hex);

    defiDiff = defiAfterClaimReward.minus(defiBeforeClaimReward);
    bnbDiff = bnbAfterClaimReward.minus(bnbBeforeClaimReward);

    const quantity = tokenIDArray.length;

    // console.log("defiprize: " + ethers.utils.formatEther(defiPrize.toString(10)));
    // console.log("bnbPrize: " + ethers.utils.formatEther(bnbPrize.toString(10)));
    // console.log("sharer: " + sharer);

    // await printBNBnDEFIinPuppyCheck();
    // if (_round > 176) {
    //     await printBNBnDEFIinPuppyCheck();
    // }

    if (_round % 2 === 1 || _round === PUPPY_LAST_ROUND) {
        // console.log("You Got BNB");
        // console.log("bnbDiff: " + ethers.utils.formatEther(bnbDiff.toString(10)));
        const lowerBound = bnbPrize.multipliedBy(quantity).dividedToIntegerBy(sharer).multipliedBy(0.99);
        const upperBound = bnbPrize.multipliedBy(quantity).dividedToIntegerBy(sharer);
        // console.log("lowerBound: " + ethers.utils.formatEther(lowerBound.toString(10)));
        // console.log("upperBound: " + ethers.utils.formatEther(upperBound.toString(10)));

        // console.log(bnbDiff.isGreaterThan(lowerBound));
        expect(bnbDiff.isGreaterThan(lowerBound)).to.eq(true);
        expect(bnbDiff.isLessThan(upperBound)).to.eq(true);
    } else {
        // console.log("You Got DEFI");
        // console.log("defiDiff: " + ethers.utils.formatEther(defiDiff.toString(10)));
        // console.log(
        //     "sharPrize: " +
        //         ethers.utils.formatEther(defiPrize.multipliedBy(quantity).dividedToIntegerBy(sharer).toString(10))
        // );

        expect(defiDiff.isEqualTo(defiPrize.multipliedBy(quantity).dividedToIntegerBy(sharer))).to.eq(true);
    }

    // 10 BNB minus gas greater than 9.999
    // expect(bnbDiff.isGreaterThan("9999000000000000000")).to.eq(true);
    // expect(bnbDiff.isLessThan("10000000000000000000")).to.eq(true);
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
    if (_round == 180) {
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

const printBNBnDEFIinPuppyCheck = async (timeIncrease) => {
    const puppyDEFIBalance = new BigNumber((await defi.balanceOf(puppyLottoCheckV2.address))._hex);
    const puppyBNBBalance = new BigNumber((await ethers.provider.getBalance(puppyLottoCheckV2.address))._hex);
    const puppyDEFI = ethers.utils.formatEther(puppyDEFIBalance.toString(10));
    const puppyBNB = ethers.utils.formatEther(puppyBNBBalance.toString());
    console.log("puppy , BNB: " + puppyBNB + ", DEFI: " + puppyDEFI);
};
module.exports._checkGodfatherDuplicateAward = _checkGodfatherDuplicateAward;
module.exports.printBNBnDEFIinPuppyCheck = printBNBnDEFIinPuppyCheck;
module.exports.claimMultiplePuppyRewardAndVerifyV2 = claimMultiplePuppyRewardAndVerifyV2;
module.exports.setTimeForward = setTimeForward;
module.exports.mintPuppy = mintPuppy;
module.exports.awardChainlinkAndForwardTimeV2 = awardChainlinkAndForwardTimeV2;
module.exports._getPuppyValidTokenIndexCounter = _getPuppyValidTokenIndexCounter;

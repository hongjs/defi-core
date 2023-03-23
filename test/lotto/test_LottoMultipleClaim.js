// test/GameItemProxy.js
// Load dependencies
const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");

const {
    getWinnerByRound,
    awardChainlinkAndForwardTime,
    transferETHTo,
    setTimeForward,
    claimPuppyRewardAndVerify,
    claimMultiplePuppyRewardAndVerify,
} = require("./utils/lottoUtil.js");

const {
    awardChainlinkAndForwardTimeV2,
    _getPuppyValidTokenIndexCounter,
    claimMultiplePuppyRewardAndVerifyV2,
    printBNBnDEFIinPuppyCheck,
} = require("./utils/lottoUtilV2.js");

// let GameItemV2;
// let gameItemV2;
// Start test block
describe("GodfatherStorage", function () {
    var _deployContract = async function () {
        this.timeout(0);

        [
            owner,
            admin,
            user1,
            feeCollector,
            platformReserve,
            godfatherPrize,
            puppyPrize,
            notOwner,
            lottoPrizeWallet,
            ...accounts
        ] = await hre.ethers.getSigners();

        DefiToken = await ethers.getContractFactory("DefiToken");
        defi = await DefiToken.deploy();
        BEP40Token = await ethers.getContractFactory("BEP40Token");
        busd = await BEP40Token.deploy("Binance USD", "BUSD");
        linkToken = await BEP40Token.deploy("ChainLink Token", "LINK");

        GodfatherStorage = await ethers.getContractFactory("GodfatherStorage");
        gftStorage = await GodfatherStorage.deploy();
        PuppyStorage = await ethers.getContractFactory("PuppyStorage");
        puppyStorage = await PuppyStorage.deploy();

        // Lotto
        //TEST NET 0.1 LINK, MAINNET 0.2 LINK
        const chainlink_fee = ethers.utils.parseEther("0.1");
        const vrfCoordinator = "0xa555fC018435bef5A13C6c6870a9d4C11DEC329C";
        const keyHash = "0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186";
        DefiLottoAwardV2 = await ethers.getContractFactory("DefiLottoAwardV2");
        defiLottoAwardV2 = await DefiLottoAwardV2.deploy(
            vrfCoordinator,
            linkToken.address,
            keyHash,
            chainlink_fee,
            gftStorage.address,
            puppyStorage.address
        );
        GodfatherLottoCheckV2 = await ethers.getContractFactory("GodfatherLottoCheckV2");
        godfatherLottoCheckV2 = await GodfatherLottoCheckV2.deploy(
            defiLottoAwardV2.address,
            gftStorage.address,
            defi.address
        );
        PuppyLottoCheckV2 = await ethers.getContractFactory("PuppyLottoCheckV2");
        puppyLottoCheckV2 = await PuppyLottoCheckV2.deploy(
            defiLottoAwardV2.address,
            puppyStorage.address,
            defi.address
        );

        MoyLottoCheckV2 = await ethers.getContractFactory("MoyLottoCheckV2");
        moyLottoCheckV2 = await MoyLottoCheckV2.deploy(defiLottoAwardV2.address, puppyStorage.address, defi.address);
        // await defiLottoAward.setGodfatherLottoCheck(godfatherLottoCheck.address);
        // await defiLottoAward.setPuppyLottoCheck(puppyLottoCheck.address);
        // await defiLottoAward.setMoyLottoCheck(moyLottoCheck.address);
        await defiLottoAwardV2.setAdmin(admin.address);

        _1DAY = 1 * 24 * 60 * 60;

        GODFATHER_DEFI_TOTAL_PRIZE = ethers.utils.parseEther("100000");
        GODFATHER_BNB_TOTAL_PRIZE = ethers.utils.parseEther("10.0");

        PUPPY_DEFI_TOTAL_PRIZE = ethers.utils.parseEther("899190");
        PUPPY_BNB_TOTAL_PRIZE = ethers.utils.parseEther("100.3");

        MOY_DEFI_TOTAL_PRIZE = ethers.utils.parseEther("300000");
        MOY_REWARD_PER_WIN = ethers.utils.parseEther("400");

        PUPPY_PER_PACK = 256;
    };
    beforeEach(async function () {});

    describe("Case : Puppy Lotto Check , ClaimReward : Multiple Winning", function () {
        this.timeout(0);
        before(_deployContract);
        PUPPY_DEFI_TOTAL_PRIZE = ethers.utils.parseEther("899190");
        PUPPY_BNB_TOTAL_PRIZE = ethers.utils.parseEther("98.88");
        it("Should Success, Mint & Transfer Prizes 899,190 DEFI & 98.88 BNB to Contract", async function () {
            await defi.mintTo(puppyLottoCheckV2.address, PUPPY_DEFI_TOTAL_PRIZE);
            await transferETHTo(lottoPrizeWallet, puppyLottoCheckV2.address, PUPPY_BNB_TOTAL_PRIZE);
        });
        it("Should Success, Contract should have 899,190 DEFI & 98.88 BNB", async function () {
            expect(await defi.balanceOf(puppyLottoCheckV2.address)).to.eq(PUPPY_DEFI_TOTAL_PRIZE);
            expect(await ethers.provider.getBalance(puppyLottoCheckV2.address)).to.eq(PUPPY_BNB_TOTAL_PRIZE);
        });
        it("Should Success, Add CanMint Puppy to owner account", async function () {
            await puppyStorage.addCanMint(owner.address);
        });
        it("Should Success, mint puppy [pack 0] from 0-0 to 16-16, tokenId 0-255 to accounts[0]", async function () {
            await mintPuppy(accounts[0], 256);
        });
        it("Should Success, mint puppy [pack 1] from 0-0 to 16-16, tokenId 0-255 to accounts[0]", async function () {
            await mintPuppy(accounts[0], 256);
        });
        it("Should Success, award by using inject 0-0, 0-0 will be the winner on 1th Round (round=0)", async function () {
            injectJackpotNumber = 0;
            await awardChainlinkAndForwardTimeV2(admin, true, injectJackpotNumber, _1DAY + 1);
        });
        it("Should Success, Claim BNB Reward using 0-0,  1st Round (round=0), Reward Sharing : 2", async function () {
            const _round = 0;
            const sharing = 2;
            await expect(
                puppyLottoCheckV2.connect(accounts[0]).claimMultipleReward(_round, [0, 256, 257])
            ).to.be.revertedWith("PuppyLottoCheck: you didn't win");
            await claimMultiplePuppyRewardAndVerifyV2(_round, [256], accounts[0], sharing);
            // puppyLottoCheck.connect(accounts[0]).claimMultipleReward(_round, [0, 256]);
            await expect(puppyLottoCheckV2.connect(owner).claimMultipleReward(_round, [257])).to.be.revertedWith(
                "PuppyLottoCheck: you didn't win"
            );
        });
        it("Should Success, award by using inject 0-0, 0-0 will be the winner on 2nd Round (round=1)", async function () {
            injectJackpotNumber = 0;
            await awardChainlinkAndForwardTimeV2(admin, true, injectJackpotNumber, _1DAY + 1);
        });
        it("Should Success, Claim BNB Reward using 0-0,  2nd Round (round=1), Reward Sharing : 2", async function () {
            const _round = 1;
            const sharing = 2;
            await expect(
                puppyLottoCheckV2.connect(accounts[0]).claimMultipleReward(_round, [0, 256, 257])
            ).to.be.revertedWith("PuppyLottoCheck: you didn't win");
            await claimMultiplePuppyRewardAndVerifyV2(_round, [0], accounts[0], sharing);
            // puppyLottoCheckV2.connect(accounts[0]).claimMultipleReward(_round, [0, 256]);
            await expect(puppyLottoCheckV2.connect(owner).claimMultipleReward(_round, [257])).to.be.revertedWith(
                "PuppyLottoCheck: you didn't win"
            );
        });

        // generatedPack = [...Array(20).keys()];
        // _pack = generatedPack.slice(2, 3);
        // _pack.forEach(async (_pack) => {
        //     it(
        //         "Should Success, mint puppy [pack " +
        //             _pack +
        //             "] from 0-0 to 16-16, tokenId 0-256 to accounts[" +
        //             _pack +
        //             "]",
        //         async function () {
        //             // console.log("mintPack : " + _pack);
        //             await mintPuppy(accounts[_pack], 256);
        //         }
        //     );
        // });

        // generatedRound = [...Array(180).keys()];
        // _round = generatedRound.slice(4, 5);
        // _round.forEach(async (_round) => {
        //     it("Should Success, award & claim reward(round=" + _round + ")", async function () {
        //         await awardChainlinkAndForwardTime(admin, false, 0, _1DAY + 1);
        //         // const {defiPrize, bnbPrize} = getPuppyAwardPrizeByRound(_round);
        //         // console.log("defiPrize: " + defiPrize + " , bnbPrize: " + bnbPrize);
        //         const {round, timestamp, wonNumber, validTokenIndexCounter, winnerSharingQuantity} =
        //             await puppyLottoCheck.awardResultObject(_round);
        //         // console.log(awardResult);
        //         sharer = parseInt(winnerSharingQuantity._hex);
        //         for (i = 0; i < sharer; i++) {
        //             tokenID = 256 * i + parseInt(wonNumber._hex);
        //             await claimPuppyRewardAndVerify(_round, tokenID, accounts[i], sharer);
        //         }
        //     });
        // });
        // it("Should Failed, Award (round==180), No more round left", async function () {
        //     await expect(awardChainlinkAndForwardTime(admin, false, 0, _1DAY + 1)).to.be.revertedWith(
        //         "DefiChainlinkVRFConsumer: No more round lefts"
        //     );
        // });
        // it("Should Success, PuppyLottoCheck contract should have less than 0.01% Prize left, DEFI & BNB", async function () {
        //     const puppyDEFIBalance = new BigNumber((await defi.balanceOf(puppyLottoCheck.address))._hex);
        //     const puppyBNBBalance = new BigNumber((await ethers.provider.getBalance(puppyLottoCheck.address))._hex);
        //     // console.log("puppyDEFIBalance: " + puppyBNBBalance + "puppyBNBBalance: " + puppyBNBBalance);
        //     const expectPuppyDefiPrize = new BigNumber(PUPPY_DEFI_TOTAL_PRIZE._hex).div(100);
        //     const expectPuppyBNBPrize = new BigNumber(PUPPY_BNB_TOTAL_PRIZE._hex).div(100);
        //     expect(puppyDEFIBalance.isLessThan(expectPuppyDefiPrize)).to.eq(true);
        //     expect(puppyBNBBalance.isLessThan(expectPuppyBNBPrize)).to.eq(true);
        // });
        // it("Should Failed, not-owner cannot withdrawn DEFI & BNB From Contract", async function () {
        //     await expect(puppyLottoCheck.connect(notOwner).withdrawAllETH()).to.be.revertedWith(
        //         "Ownable: caller is not the owner"
        //     );
        //     await expect(puppyLottoCheck.connect(notOwner).withdrawAllETH()).to.be.revertedWith(
        //         "Ownable: caller is not the owner"
        //     );
        // });
        // it("Should Success, owner withdrawn all DEFI & BNB Left in Contract", async function () {
        //     await puppyLottoCheck.connect(owner).withdrawAllETH();
        //     await puppyLottoCheck.connect(owner).withdrawAllDEFI();
        //     expect(await defi.balanceOf(puppyLottoCheck.address)).to.eq(0);
        //     expect(await ethers.provider.getBalance(puppyLottoCheck.address)).to.eq(0);
        // });
        // it("Disabled, Print Lotto Result", async function () {
        //     //await printLottoResult();
        // });
    });

    // const getSalt = async (account, amount) => {
    //     const hexString = Array(16)
    //         .fill()
    //         .map(() => Math.round(Math.random() * 0xf).toString(16))
    //         .join("");

    //     const randomBigInt = BigInt(`0x${hexString}`);
    //     return randomBigInt;
    // };

    // const printGodfatherStorage = async (account) => {
    //     const accountTotalSupply = await gftStorage.connect(account).balanceOf(account.address);
    //     console.log("==== address: " + account.address + ", ownerAccountTotalSupply: " + accountTotalSupply);
    //     for (let i = 0; i < accountTotalSupply; i++) {
    //         const tokenIndex = await gftStorage.connect(account).tokenOfOwnerByIndex(account.address, i);
    //         const results = await gftStorage.getTokenInformation(tokenIndex);
    //         console.log(tokenIndex, results);
    //     }
    // };

    // const printPuppyStorage = async (account) => {
    //     const accountTotalSupply = await puppyStorage.connect(account).balanceOf(account.address);
    //     console.log("==== address: " + account.address + ", ownerAccountTotalSupply: " + accountTotalSupply);
    //     for (let i = 0; i < accountTotalSupply; i++) {
    //         const tokenIndex = await puppyStorage.connect(account).tokenOfOwnerByIndex(account.address, i);
    //         const tokenURI = await puppyStorage.connect(account).tokenURI(tokenIndex);
    //         const leadingZeroString = "000000" + tokenIndex;
    //         console.log(leadingZeroString.substring(leadingZeroString.length - 3) + " | " + tokenURI);
    //     }
    // };

    const checkWhoWonThePrice = async () => {
        const _round = (await defiLottoAwardV2.currentRound()) - 1;
        const {round, timestamp, wonNumber, validTokenIndexCounter, winnerSharingQuantity} =
            await puppyLottoCheck.awardResultObject(_round);
        winner = 0x0;
        try {
            winner = await gftStorage.ownerOf(wonNumber);
            if (winner != "0x0000000000000000000000000000000000000000") {
                console.log(" GODFATHER WINNER TokenID: " + wonNumber + " , Round : " + round);
                abc = await getWinnerByRound(round);
                console.log(abc);
            }
        } catch (err) {}
    };

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
});

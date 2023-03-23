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
} = require("./utils/lottoUtil.js");

const {
    awardChainlinkAndForwardTimeV2,
    _getPuppyValidTokenIndexCounter,
    claimMultiplePuppyRewardAndVerifyV2,
    printBNBnDEFIinPuppyCheck,
    _checkGodfatherDuplicateAward,
} = require("./utils/lottoUtilV2.js");

// let GameItemV2;
// let gameItemV2;
// Start test block
describe("GodfatherStorage", function () {
    var _deployContract = async function () {
        this.timeout(0);
        //TEST NET 0.1 LINK, MAINNET 0.2 LINK
        const chainlink_fee = ethers.utils.parseEther("0.1");

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
    describe("Case : Godfather Lotto Check , ClaimReward : Winner is rarity common", function () {
        this.timeout(0);

        describe("Case : Godfather win rarity => Common", function () {
            before(_deployContract);
            it("[Noted!] , mint 1 puppy, if puppyBalance=0, award will not continue", async function () {
                await puppyStorage.addCanMint(owner.address);
                await mintPuppy(owner, 1);
                // console.log("gftStorage: ", gftStorage.address);
            });
            it("Set Variable", async function () {
                rarityIndex = 0;
            });
            it("Should Success, Mint & Transfer Prizes 100,000 DEFI & 10 BNB to Contract", async function () {
                await defi.mintTo(godfatherLottoCheckV2.address, GODFATHER_DEFI_TOTAL_PRIZE);
                await transferETHTo(lottoPrizeWallet, godfatherLottoCheckV2.address, GODFATHER_BNB_TOTAL_PRIZE);
            });
            it("Should Success, Contract should have 100,000 DEFI & 10 BNB", async function () {
                expect(await defi.balanceOf(godfatherLottoCheckV2.address)).to.eq(GODFATHER_DEFI_TOTAL_PRIZE);
                expect(await ethers.provider.getBalance(godfatherLottoCheckV2.address)).to.eq(
                    GODFATHER_BNB_TOTAL_PRIZE
                );
            });
            it("Should Success, Mint More 100,000 DEFI", async function () {
                await defi.mintTo(godfatherLottoCheckV2.address, ethers.utils.parseEther("10000"));
            });
            it("Should Success, Add CanMint Godfather to owner account", async function () {
                await gftStorage.addCanMint(owner.address);
            });
            it("Should Success, mint 1st token to not-owner (Godfather)", async function () {
                await gftStorage.connect(owner).bulkMint(notOwner.address, rarityIndex, 1);
                notOwner_tokenIndex = await gftStorage.connect(notOwner).tokenOfOwnerByIndex(notOwner.address, 0);
                // printGodfatherStorage(notOwner);
            });
            it("Should Success, mint 2nd token to owner (Godfather)", async function () {
                await gftStorage.connect(owner).bulkMint(owner.address, rarityIndex, 1);
                owner_tokenIndex = await gftStorage.connect(owner).tokenOfOwnerByIndex(owner.address, 0);
                // printGodfatherStorage(owner);
            });
            it("Should Success, award by using ChainLink on 1st Round (round=0)", async function () {
                await awardChainlinkAndForwardTimeV2(admin, false, 0, 1);
            });
            it("Should Failed, award by using ChainLink on 2nd Round, Due to Timelock , 1 Award per Day", async function () {
                await expect(awardChainlinkAndForwardTimeV2(admin, false, 0, _1DAY + 1)).to.be.revertedWith(
                    "defiLottoAwardV2: block.timestamp less than timelock"
                );
            });
            it("Should Success, evm_increaseTime, TimeForward by 1 Day", async function () {
                setTimeForward(_1DAY + 1);
            });
            it("Should Success, award by using ChainLink on 2nd Round (round=1)", async function () {
                await awardChainlinkAndForwardTimeV2(admin, false, 0, _1DAY + 1);
            });
            it("Should Failed, owner & not-owner try to Claim Reward , But there is no winner yet", async function () {
                // owner try to claim Lose Ticket
                for (i = 0; i < 2; i++) {
                    await expect(
                        godfatherLottoCheckV2.connect(owner).claimMultipleReward(i, [owner_tokenIndex])
                    ).to.be.revertedWith("GodfatherLottoCheck: No Winner Found when Awarding");
                    // notOwner try to claim Lose Ticket
                    await expect(
                        godfatherLottoCheckV2.connect(notOwner).claimMultipleReward(i, [notOwner_tokenIndex])
                    ).to.be.revertedWith("GodfatherLottoCheck: No Winner Found when Awarding");
                }
            });
            it("Should Success, award by using inject owner 's tokenID, owner will be the winner on 3rd Round (round=2)", async function () {
                const winnerOffset = 0;
                injectJackpotNumber = owner_tokenIndex.add(winnerOffset);
                await awardChainlinkAndForwardTimeV2(admin, true, injectJackpotNumber, _1DAY + 1);
            });
            it("Should Failed, not-owner try to claimReward on 3rd Round using injectJackpotNumber", async function () {
                await expect(
                    godfatherLottoCheckV2.connect(notOwner).claimMultipleReward(i, [injectJackpotNumber])
                ).to.be.revertedWith("GodfatherLottoCheck: You are not the owner of the token");
            });
            it("Should Success, true owner try to claimReward on 3rd Round using injectJackpotNumber", async function () {
                defiBeforeClaimReward = await defi.balanceOf(owner.address);
                expect(defiBeforeClaimReward).to.eq(0);
                bnbBeforeClaimReward = new BigNumber((await ethers.provider.getBalance(owner.address))._hex);
                const round = 2;
                await godfatherLottoCheckV2.connect(owner).claimMultipleReward(round, [injectJackpotNumber]);
            });
            it("Should Success, owner should get jackpot 100,000 DEFI & 10 BNB", async function () {
                defiAfterClaimReward = await defi.balanceOf(owner.address);
                expect(defiAfterClaimReward).to.be.at.least(GODFATHER_DEFI_TOTAL_PRIZE);
                bnbAfterClaimReward = new BigNumber((await ethers.provider.getBalance(owner.address))._hex);
                bnbDiff = bnbAfterClaimReward.minus(bnbBeforeClaimReward);
                // 10 BNB minus gas greater than 9.999
                expect(bnbDiff.isGreaterThan("9999000000000000000")).to.eq(true);
                expect(bnbDiff.isLessThan("10000000000000000000")).to.eq(true);
            });
            it("Should Failed, owner try to claimReward on 3rd Round for the secondTime", async function () {
                const round = 2;
                await expect(
                    godfatherLottoCheckV2.connect(owner).claimMultipleReward(round, [injectJackpotNumber])
                ).to.be.revertedWith("GodfatherLottoCheck: You've got the reward before");
            });
            it("Should Success, GodFatherLottoCheck contract should have 0 DEFI & 0 BNB", async function () {
                const godfatherDEFIBalance = await defi.balanceOf(godfatherLottoCheckV2.address);
                const godfatherBNBBalance = new BigNumber(
                    (await ethers.provider.getBalance(godfatherLottoCheckV2.address))._hex
                );
                expect(godfatherDEFIBalance).to.eq(0);
                expect(godfatherBNBBalance.toString()).to.eq("0");
            });
            it("Should Success, second Winner cannot win jackpot on 4th Round (round=3)", async function () {
                await gftStorage.connect(owner).bulkMint(owner.address, rarityIndex, 1);
                owner_tokenIndex = await gftStorage.connect(owner).tokenOfOwnerByIndex(owner.address, 1);
                const winnerOffset = 0;
                injectJackpotNumber = owner_tokenIndex.add(winnerOffset);
                await awardChainlinkAndForwardTimeV2(admin, true, injectJackpotNumber, _1DAY + 1);
                // Get Award Counter
                await _checkGodfatherDuplicateAward(owner, injectJackpotNumber);
            });
            it("Should Failed, not-owner cannot withdrawn DEFI & BNB From Contract", async function () {
                await expect(godfatherLottoCheckV2.connect(notOwner).withdrawAllETH()).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
                await expect(godfatherLottoCheckV2.connect(notOwner).withdrawAllETH()).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
            });
            it("Should Success, owner withdrawn all DEFI & BNB Left in Contract", async function () {
                await godfatherLottoCheckV2.connect(owner).withdrawAllETH();
                await godfatherLottoCheckV2.connect(owner).withdrawAllDEFI();
                expect(await defi.balanceOf(godfatherLottoCheckV2.address)).to.eq(0);
                expect(await ethers.provider.getBalance(godfatherLottoCheckV2.address)).to.eq(0);
            });
        });

        describe("Case : Godfather win rarity => UnCommon", function () {
            before(_deployContract);
            it("[Noted!] , mint 1 puppy, if puppyBalance=0, award will not continue", async function () {
                await puppyStorage.addCanMint(owner.address);
                await mintPuppy(owner, 1);
                // console.log("gftStorage: ", gftStorage.address);
            });
            it("Set Variable", async function () {
                rarityIndex = 1;
                winnerOffset = 1;
            });
            it("Should Success, Mint & Transfer Prizes 100,000 DEFI & 10 BNB to Contract", async function () {
                await defi.mintTo(godfatherLottoCheckV2.address, GODFATHER_DEFI_TOTAL_PRIZE);
                await transferETHTo(lottoPrizeWallet, godfatherLottoCheckV2.address, GODFATHER_BNB_TOTAL_PRIZE);
            });
            it("Should Success, Contract should have 100,000 DEFI & 10 BNB", async function () {
                expect(await defi.balanceOf(godfatherLottoCheckV2.address)).to.eq(
                    GODFATHER_DEFI_TOTAL_PRIZE.toString()
                );
                expect(await ethers.provider.getBalance(godfatherLottoCheckV2.address)).to.eq(
                    GODFATHER_BNB_TOTAL_PRIZE.toString()
                );
            });
            it("Should Success, Mint More 100,000 DEFI", async function () {
                await defi.mintTo(godfatherLottoCheckV2.address, ethers.utils.parseEther("10000"));
            });
            it("Should Success, Add CanMint Godfather to owner account", async function () {
                await gftStorage.addCanMint(owner.address);
            });
            it("Should Success, mint 1st token to not-owner (Godfather)", async function () {
                await gftStorage.connect(owner).bulkMint(notOwner.address, rarityIndex, 1);
                notOwner_tokenIndex = await gftStorage.connect(notOwner).tokenOfOwnerByIndex(notOwner.address, 0);
                // printGodfatherStorage(notOwner);
            });
            it("Should Success, mint 2nd token to owner (Godfather)", async function () {
                await gftStorage.connect(owner).bulkMint(owner.address, rarityIndex, 1);
                owner_tokenIndex = await gftStorage.connect(owner).tokenOfOwnerByIndex(owner.address, 0);
                // printGodfatherStorage(owner);
            });
            it("Should Success, award by using ChainLink on 1st Round (round=0)", async function () {
                await awardChainlinkAndForwardTimeV2(admin, false, 0, 1);
            });
            it("Should Failed, award by using ChainLink on 2nd Round, Due to Timelock , 1 Award per Day", async function () {
                await expect(awardChainlinkAndForwardTimeV2(admin, false, 0, _1DAY + 1)).to.be.revertedWith(
                    "defiLottoAwardV2: block.timestamp less than timelock"
                );
            });
            it("Should Success, evm_increaseTime, TimeForward by 1 Day", async function () {
                setTimeForward(_1DAY + 1);
            });
            it("Should Success, award by using ChainLink on 2nd Round (round=1)", async function () {
                await awardChainlinkAndForwardTimeV2(admin, false, 0, _1DAY + 1);
            });
            it("Should Failed, owner & not-owner try to Claim Reward , But there is no winner yet", async function () {
                // owner try to claim Lose Ticket
                for (i = 0; i < 2; i++) {
                    await expect(
                        godfatherLottoCheckV2.connect(owner).claimMultipleReward(i, [owner_tokenIndex])
                    ).to.be.revertedWith("GodfatherLottoCheck: No Winner Found when Awarding");
                    // notOwner try to claim Lose Ticket
                    await expect(
                        godfatherLottoCheckV2.connect(notOwner).claimMultipleReward(i, [notOwner_tokenIndex])
                    ).to.be.revertedWith("GodfatherLottoCheck: No Winner Found when Awarding");
                }
            });
            it("Should Success, award by using inject owner 's tokenID, owner will be the winner on 3rd Round (round=2)", async function () {
                injectJackpotNumber = owner_tokenIndex.add(winnerOffset);
                await awardChainlinkAndForwardTimeV2(admin, true, injectJackpotNumber, _1DAY + 1);
            });
            it("Should Failed, not-owner try to claimReward on 3rd Round using injectJackpotNumber", async function () {
                await expect(
                    godfatherLottoCheckV2.connect(notOwner).claimMultipleReward(i, [injectJackpotNumber])
                ).to.be.revertedWith("GodfatherLottoCheck: You are not the owner of the token");
            });
            it("Should Success, true owner try to claimReward on 3rd Round using injectJackpotNumber", async function () {
                defiBeforeClaimReward = await defi.balanceOf(owner.address);
                expect(defiBeforeClaimReward).to.eq(0);
                bnbBeforeClaimReward = new BigNumber((await ethers.provider.getBalance(owner.address))._hex);
                const round = 2;
                await expect(
                    godfatherLottoCheckV2.connect(owner).claimMultipleReward(round, [injectJackpotNumber - 1])
                ).to.be.revertedWith("GodfatherLottoCheck: You didn't win");
                await godfatherLottoCheckV2.connect(owner).claimMultipleReward(round, [injectJackpotNumber]);
            });
            it("Should Success, owner should get jackpot 100,000 DEFI & 10 BNB", async function () {
                defiAfterClaimReward = await defi.balanceOf(owner.address);
                expect(defiAfterClaimReward).to.be.at.least(GODFATHER_DEFI_TOTAL_PRIZE);
                bnbAfterClaimReward = new BigNumber((await ethers.provider.getBalance(owner.address))._hex);
                bnbDiff = bnbAfterClaimReward.minus(bnbBeforeClaimReward);
                // 10 BNB minus gas greater than 9.999
                // console.log("BNB Diff: ", ethers.utils.formatEther(bnbDiff.toString(10)));
                expect(bnbDiff.isGreaterThan("9998000000000000000")).to.eq(true);
                expect(bnbDiff.isLessThan("10000000000000000000")).to.eq(true);
            });
            it("Should Failed, owner try to claimReward on 3rd Round for the secondTime", async function () {
                const round = 2;
                await expect(
                    godfatherLottoCheckV2.connect(owner).claimMultipleReward(round, [injectJackpotNumber])
                ).to.be.revertedWith("GodfatherLottoCheck: You've got the reward before");
            });
            it("Should Success, GodFatherLottoCheck contract should have 0 DEFI & 0 BNB", async function () {
                const godfatherDEFIBalance = await defi.balanceOf(godfatherLottoCheckV2.address);
                const godfatherBNBBalance = new BigNumber(
                    (await ethers.provider.getBalance(godfatherLottoCheckV2.address))._hex
                );
                expect(godfatherDEFIBalance).to.eq(0);
                expect(godfatherBNBBalance.toString()).to.eq("0");
            });
            it("Should Success, second Winner cannot win jackpot on 4th Round (round=3)", async function () {
                await gftStorage.connect(owner).bulkMint(owner.address, rarityIndex, 1);
                owner_tokenIndex = await gftStorage.connect(owner).tokenOfOwnerByIndex(owner.address, 1);
                const winnerOffset = 1;
                injectJackpotNumber = owner_tokenIndex.add(winnerOffset);
                await awardChainlinkAndForwardTimeV2(admin, true, injectJackpotNumber, _1DAY + 1);
                // Get Award Counter
                await _checkGodfatherDuplicateAward(owner, injectJackpotNumber);
            });
            it("Should Failed, not-owner cannot withdrawn DEFI & BNB From Contract", async function () {
                await expect(godfatherLottoCheckV2.connect(notOwner).withdrawAllETH()).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
                await expect(godfatherLottoCheckV2.connect(notOwner).withdrawAllETH()).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
            });
            it("Should Success, owner withdrawn all DEFI & BNB Left in Contract", async function () {
                await godfatherLottoCheckV2.connect(owner).withdrawAllETH();
                await godfatherLottoCheckV2.connect(owner).withdrawAllDEFI();
                expect(await defi.balanceOf(godfatherLottoCheckV2.address)).to.eq(0);
                expect(await ethers.provider.getBalance(godfatherLottoCheckV2.address)).to.eq(0);
            });
            it("Disabled, Print Lotto Result", async function () {
                // await printLottoResult();
            });
        });
    });

    describe("Case : Puppy Lotto Check , ClaimReward : Multiple Winning", function () {
        this.timeout(0);
        before(_deployContract);
        PUPPY_DEFI_TOTAL_PRIZE = ethers.utils.parseEther("899190");
        PUPPY_BNB_TOTAL_PRIZE = ethers.utils.parseEther("100.3");
        it("Should Success, Mint & Transfer Prizes 899,190 DEFI & 100.3 BNB to Contract", async function () {
            await defi.mintTo(puppyLottoCheckV2.address, PUPPY_DEFI_TOTAL_PRIZE);
            await transferETHTo(lottoPrizeWallet, puppyLottoCheckV2.address, PUPPY_BNB_TOTAL_PRIZE);
        });
        it("Should Success, Contract should have 899,190 DEFI & 100.3 BNB", async function () {
            expect(await defi.balanceOf(puppyLottoCheckV2.address)).to.eq(PUPPY_DEFI_TOTAL_PRIZE);
            expect(await ethers.provider.getBalance(puppyLottoCheckV2.address)).to.eq(PUPPY_BNB_TOTAL_PRIZE);
        });
        // it("Should Success, Display BNB & DEFI BALANCE in Contract", async function () {
        //     await printBNBnDEFIinPuppyCheck();
        // });
        it("Should Success, Add CanMint Puppy to owner account", async function () {
            await puppyStorage.addCanMint(owner.address);
        });
        it("Should Success, mint puppy [pack 0] from 0-0 to 16-16, tokenId 0-255 to accounts[0]", async function () {
            await mintPuppy(accounts[0], 256);
        });
        it("Should Success, award by using inject 00-00, 00-00 will be the winner on 1st Round (round=0)", async function () {
            injectJackpotNumber = 0;
            await awardChainlinkAndForwardTimeV2(admin, true, injectJackpotNumber, _1DAY + 1);
        });
        it("Should Failed, Claim DEFI Reward using 00-01 to 16-16 on 1st Round (round=0)", async function () {
            const _round = 0;
            for (i = 1; i < 256; i++) {
                await expect(puppyLottoCheckV2.connect(owner).claimMultipleReward(_round, [i])).to.be.revertedWith(
                    "PuppyLottoCheck: you didn't win"
                );
            }
        });
        it("Should Success, Claim DEFI Reward using 00-00,  1st Round (round=0), Reward Sharing : 1", async function () {
            const _round = 0;
            const tokenID = 0;
            const sharing = 1;
            await claimMultiplePuppyRewardAndVerifyV2(_round, [tokenID], accounts[0], sharing);
        });
        it("Should Success, award by using inject 16-16, 16-16 will be the winner on 2nd Round (round=1)", async function () {
            injectJackpotNumber = 255;
            await awardChainlinkAndForwardTimeV2(admin, true, injectJackpotNumber, _1DAY + 1);
        });
        it("Should Success, Claim BNB Reward using 16-16,  2nd Round (round=1), Reward Sharing : 1", async function () {
            const _round = 1;
            const tokenID = 255;
            const sharing = 1;
            await claimMultiplePuppyRewardAndVerifyV2(_round, [tokenID], accounts[0], sharing);
        });
        it("Should Success, mint puppy [pack 1] 0-0 , tokenId 0-0 to accounts[1]", async function () {
            await mintPuppy(accounts[1], 1);
        });
        it("Should Success, award by using inject 0-0, 0-0 will be the winner on 3rd Round (round=2)", async function () {
            injectJackpotNumber = 0;
            await awardChainlinkAndForwardTimeV2(admin, true, injectJackpotNumber, _1DAY + 1);
        });
        it("Should Success, Claim DEFI Reward using 0-0,  3rd Round (round=2), Reward Sharing : 2", async function () {
            const _round = 2;
            const sharing = 2;
            await claimMultiplePuppyRewardAndVerifyV2(_round, [0], accounts[0], sharing);
            await claimMultiplePuppyRewardAndVerifyV2(_round, [256], accounts[1], sharing);
            await expect(puppyLottoCheckV2.connect(owner).claimMultipleReward(_round, [257])).to.be.revertedWith(
                "PuppyLottoCheck: No Owner Found when Awarding"
            );
        });
        it("Should Success, mint puppy [pack 1] from 0-1 , tokenId 16-16 to accounts[1]", async function () {
            await mintPuppy(accounts[1], 255);
        });
        it("Should Success, award by using inject 0-0, 0-0 will be the winner on 4th Round (round=3)", async function () {
            injectJackpotNumber = 0;
            await awardChainlinkAndForwardTimeV2(admin, true, injectJackpotNumber, _1DAY + 1);
        });
        it("Should Success, Claim BNB Reward using 0-0,  4th Round (round=3), Reward Sharing : 2", async function () {
            const _round = 3;
            const sharing = 2;
            await claimMultiplePuppyRewardAndVerifyV2(_round, [0], accounts[0], sharing);
            await claimMultiplePuppyRewardAndVerifyV2(_round, [256], accounts[1], sharing);
            await expect(puppyLottoCheckV2.connect(owner).claimMultipleReward(_round, [257])).to.be.revertedWith(
                "PuppyLottoCheck: you didn't win"
            );
        });

        generatedPack = [...Array(20).keys()];
        _pack = generatedPack.slice(2, 11);
        _pack.forEach(async (_pack) => {
            it(
                "Should Success, mint puppy [pack " +
                    _pack +
                    "] from 0-0 to 16-16, tokenId 0-256 to accounts[" +
                    _pack +
                    "]",
                async function () {
                    //console.log("mintPack : " + _pack);
                    await mintPuppy(accounts[_pack], 256);
                }
            );
        });

        generatedRound = [...Array(255).keys()];
        _round = generatedRound.slice(4, 181);
        _round.forEach(async (_round) => {
            it("Should Success, award & claim reward(round=" + _round + ")", async function () {
                await awardChainlinkAndForwardTimeV2(admin, false, 0, _1DAY + 1);
                // const {defiPrize, bnbPrize} = getPuppyAwardPrizeByRound(_round);
                // console.log("defiPrize: " + defiPrize + " , bnbPrize: " + bnbPrize);
                const {round, timestamp, wonNumber, godfatherValidToken, puppyValidToken, winnerSharingQuantity} =
                    await defiLottoAwardV2.getAwardResultObject(_round);
                // console.log("round: " + round);
                // console.log("timestamp: " + timestamp);
                // console.log("wonNumber: " + wonNumber);
                // console.log("godfatherValidToken: " + godfatherValidToken);
                // console.log("puppyValidToken: " + puppyValidToken);
                // console.log("winnerSharingQuantity: " + winnerSharingQuantity);
                // console.log(awardResult);
                sharer = winnerSharingQuantity;
                puppyWonNumber = wonNumber % PUPPY_PER_PACK;
                // console.log("wonNumber: ", wonNumber.toString(16));
                // console.log("puppyWonNumber: ", puppyWonNumber.toString(16));
                for (i = 0; i < sharer; i++) {
                    tokenID = 256 * i + puppyWonNumber;
                    // console.log("tokenID: ", tokenID.toString(16));
                    await claimMultiplePuppyRewardAndVerifyV2(_round, [tokenID], accounts[i], sharer);
                }
            });
        });
        it("Should Failed, Award (round==181), No more round left", async function () {
            await expect(awardChainlinkAndForwardTimeV2(admin, false, 0, _1DAY + 1)).to.be.revertedWith(
                "defiLottoAwardV2: No more round lefts"
            );
        });
        it("Should Success, PuppyLottoCheck contract should have less than 0.01% Prize left, DEFI & BNB", async function () {
            const puppyDEFIBalance = new BigNumber((await defi.balanceOf(puppyLottoCheckV2.address))._hex);
            const puppyBNBBalance = new BigNumber((await ethers.provider.getBalance(puppyLottoCheckV2.address))._hex);
            // await printBNBnDEFIinPuppyCheck();
            const expectPuppyDefiPrize = new BigNumber(PUPPY_DEFI_TOTAL_PRIZE._hex).div(100);
            const expectPuppyBNBPrize = new BigNumber(PUPPY_BNB_TOTAL_PRIZE._hex).div(100);
            expect(puppyDEFIBalance.isLessThan(expectPuppyDefiPrize)).to.eq(true);
            expect(puppyBNBBalance.isLessThan(expectPuppyBNBPrize)).to.eq(true);
        });
        it("Should Failed, not-owner cannot withdrawn DEFI & BNB From Contract", async function () {
            await expect(puppyLottoCheckV2.connect(notOwner).withdrawAllETH()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
            await expect(puppyLottoCheckV2.connect(notOwner).withdrawAllETH()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });
        it("Should Success, owner withdrawn all DEFI & BNB Left in Contract", async function () {
            await puppyLottoCheckV2.connect(owner).withdrawAllETH();
            await puppyLottoCheckV2.connect(owner).withdrawAllDEFI();
            expect(await defi.balanceOf(puppyLottoCheckV2.address)).to.eq(0);
            expect(await ethers.provider.getBalance(puppyLottoCheckV2.address)).to.eq(0);
            // await printBNBnDEFIinPuppyCheck();
        });
    });

    describe("Case : Moy Lotto Check , ClaimReward : Multiple Winning", function () {
        this.timeout(0);
        before(_deployContract);
        it("Should Success, Mint & Transfer Prizes 300,000 DEFI to Contract", async function () {
            await defi.mintTo(moyLottoCheckV2.address, MOY_DEFI_TOTAL_PRIZE);
        });
        it("Should Success, Contract should have 300,000 DEFI", async function () {
            expect(await defi.balanceOf(moyLottoCheckV2.address)).to.eq(MOY_DEFI_TOTAL_PRIZE);
        });
        it("Should Success, Add CanMint Puppy to owner account", async function () {
            await puppyStorage.addCanMint(owner.address);
        });
        it("Should Success, mint puppy [pack 0] from 0-0 to 16-16, tokenId 0-255 to accounts[0]", async function () {
            await mintPuppy(accounts[0], 256);
        });

        it("Should Success, award by using inject 00-00, 00-00 will be the winner on 1st Round (round=0)", async function () {
            injectJackpotNumber = 0;
            await awardChainlinkAndForwardTimeV2(admin, true, injectJackpotNumber, _1DAY + 1);
        });
        it("Should Failed, Claim DEFI Reward using 00-00 to 16-16 on 1st Round , Not-Win tokenID (round=0)", async function () {
            const _round = 0;
            for (i = 0; i < 256; i++) {
                if (i % 16 != 0) {
                    await expect(
                        moyLottoCheckV2.connect(accounts[0]).claimMultipleReward(_round, [i])
                    ).to.be.revertedWith("MoyLottoCheck: you didn't win");
                }
            }
        });
        it("Should Success, Claim DEFI Reward using 00-00 to 16-16 on 1st Round , Win tokenID (round=0)", async function () {
            const _round = 0;
            await defi.mintTo(moyLottoCheckV2.address, ethers.utils.parseEther("300000"));
            for (i = 0; i < 16; i++) {
                const tokenID = i * 16;
                // console.log("i : " + i + " , tokenID: " + tokenID);
                defiBeforeClaimReward = new BigNumber((await defi.balanceOf(accounts[0].address))._hex);
                await moyLottoCheckV2.connect(accounts[0]).claimMultipleReward(_round, [tokenID]);
                await expect(
                    moyLottoCheckV2.connect(accounts[0]).claimMultipleReward(_round, [tokenID])
                ).to.be.revertedWith("MoyLottoCheck: You've got the reward before");
                defiAfterClaimReward = new BigNumber((await defi.balanceOf(accounts[0].address))._hex);

                defiDiff = defiAfterClaimReward.minus(defiBeforeClaimReward);
                expect(defiDiff.toString()).to.eq(MOY_REWARD_PER_WIN.toString());
            }
        });
        it("Should Success, mint puppy [pack 1] from 0-0 to 16-16, tokenId 0-255 to accounts[0]", async function () {
            await mintPuppy(accounts[1], 256);
        });
        it("Should Success, award by using inject 00-00, 00-00 will be the winner on 2nd Round (round=1)", async function () {
            injectJackpotNumber = 0;
            await awardChainlinkAndForwardTimeV2(admin, true, injectJackpotNumber, _1DAY + 1);
        });
        it("Should Success, Claim DEFI Reward using 00-00 to 16-16 on 2nd Round , Win tokenID (round=1)", async function () {
            const _round = 1;
            await defi.mintTo(moyLottoCheckV2.address, ethers.utils.parseEther("300000"));
            for (player = 0; player < 2; player++) {
                for (i = 0; i < 16; i++) {
                    const tokenID = 256 * player + i * 16;
                    // console.log("i : " + i + " , tokenID: " + tokenID + ", player: " + player);
                    defiBeforeClaimReward = new BigNumber((await defi.balanceOf(accounts[player].address))._hex);
                    await moyLottoCheckV2.connect(accounts[player]).claimMultipleReward(_round, [tokenID]);
                    await expect(
                        moyLottoCheckV2.connect(accounts[player]).claimMultipleReward(_round, [tokenID])
                    ).to.be.revertedWith("MoyLottoCheck: You've got the reward before");
                    defiAfterClaimReward = new BigNumber((await defi.balanceOf(accounts[player].address))._hex);

                    defiDiff = defiAfterClaimReward.minus(defiBeforeClaimReward);
                    expect(defiDiff.toString()).to.eq(MOY_REWARD_PER_WIN.toString());
                }
            }
        });
    });

    // ====================================================================================================================

    // const getSalt = async (account, amount) => {
    //     const hexString = Array(16)
    //         .fill()
    //         .map(() => Math.round(Math.random() * 0xf).toString(16))
    //         .join("");

    //     const randomBigInt = BigInt(`0x${hexString}`);
    //     return randomBigInt;
    // };

    const printGodfatherStorage = async (account) => {
        const accountTotalSupply = await gftStorage.connect(account).balanceOf(account.address);
        console.log("==== address: " + account.address + ", ownerAccountTotalSupply: " + accountTotalSupply);
        for (let i = 0; i < accountTotalSupply; i++) {
            const tokenIndex = await gftStorage.connect(account).tokenOfOwnerByIndex(account.address, i);
            const results = await gftStorage.getTokenInformation(tokenIndex);
            // console.log(tokenIndex, results);
            console.log(parseInt(results._rarity._hex), " - ", parseInt(results._ticketNumber._hex));
        }
    };

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
        const _round = (await defiLottoAward.currentRound()) - 1;
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

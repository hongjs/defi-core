// test/GameItemProxy.js
// Load dependencies
const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");

// let GameItemV2;
// let gameItemV2;
// Start test block
describe("GodfatherStorage", function () {
    beforeEach(async function () {
        [owner, user1, feeCollector, platformReserve, godfatherPrize, puppyPrize, ...accounts] =
            await hre.ethers.getSigners();
        BEP40Token = await ethers.getContractFactory("BEP40Token");
        coupon = await BEP40Token.deploy("Foodcourt Coupon", "COUPON");

        DefiToken = await ethers.getContractFactory("DefiToken");
        defi = await DefiToken.deploy();
        busd = await BEP40Token.deploy("Binance USD", "BUSD");

        GodfatherStorage = await ethers.getContractFactory("GodfatherStorage");
        gftStorage = await GodfatherStorage.deploy();
        PuppyStorage = await ethers.getContractFactory("PuppyStorage");
        puppyStorage = await PuppyStorage.deploy();
        MiniGame = await ethers.getContractFactory("MiniGame");
        miniGame = await MiniGame.deploy(gftStorage.address, puppyStorage.address, defi.address, busd.address);
        AirDropUtil = await ethers.getContractFactory("AirDropUtil");
        airdropUtil = await AirDropUtil.deploy(gftStorage.address, coupon.address, 0);
        await gftStorage.addCanMint(airdropUtil.address);
        await gftStorage.addCanMint(miniGame.address);
        await puppyStorage.addCanMint(miniGame.address);
        await miniGame.setDrawWinner(owner.address);

        feeCollectorRatio = 10;
        platformReserveRatio = 20;
        godfatherPrizeRatio = 30;
        puppyPrizeRatio = 40;
        await miniGame.setFeeCollectorRatio(
            feeCollectorRatio,
            platformReserveRatio,
            godfatherPrizeRatio,
            puppyPrizeRatio
        );
        await miniGame.setFeeCollectorAddress(
            feeCollector.address,
            platformReserve.address,
            godfatherPrize.address,
            puppyPrize.address
        );
    });

    // =======================================================================================
    // MiniGame
    // =======================================================================================

    it("Should error, user doesn't have enough defi", async function () {
        await expect(miniGame.connect(user1).sitWithDefi(1, [1])).to.be.revertedWith("MiniGame: INSUFFICIENT_BALANCE");
    });

    it("FeeCollector should receive x DEFI from 1 sit", async function () {
        const cost = await miniGame.defiCostPerSeat();
        await mintDefiAndApprove(user1, cost);
        await miniGame.connect(user1).sitWithDefi(1, [1]);

        const userBalance = await defi.balanceOf(user1.address);
        const feeCollectorBalance = await defi.balanceOf(feeCollector.address);
        const platformReserveBalance = await defi.balanceOf(platformReserve.address);
        const godfatherBalance = await defi.balanceOf(godfatherPrize.address);
        const puppyBalance = await defi.balanceOf(puppyPrize.address);

        const _cost = new BigNumber(cost._hex).div(100);
        expect(feeCollectorBalance.toString()).to.eq(_cost.times(feeCollectorRatio).toString());
        expect(platformReserveBalance.toString()).to.eq(_cost.times(platformReserveRatio).toString());
        expect(godfatherBalance.toString()).to.eq(_cost.times(godfatherPrizeRatio).toString());
        expect(puppyBalance.toString()).to.eq(_cost.times(puppyPrizeRatio).toString());
        expect(userBalance.toString()).to.eq("0");
    });

    it("FeeCollector should receive x BUSD from 1 sit", async function () {
        const cost = await miniGame.busdCostPerSeat();
        await mintBusdAndApprove(user1, cost);
        await miniGame.connect(user1).sitWithBUSD(1, [1]);

        const userBalance = await busd.balanceOf(user1.address);
        const feeCollectorBalance = await busd.balanceOf(feeCollector.address);
        const platformReserveBalance = await busd.balanceOf(platformReserve.address);
        const godfatherBalance = await busd.balanceOf(godfatherPrize.address);
        const puppyBalance = await busd.balanceOf(puppyPrize.address);

        const _cost = new BigNumber(cost._hex).div(100);
        expect(feeCollectorBalance.toString()).to.eq(_cost.times(feeCollectorRatio).toString());
        expect(platformReserveBalance.toString()).to.eq(_cost.times(platformReserveRatio).toString());
        expect(godfatherBalance.toString()).to.eq(_cost.times(godfatherPrizeRatio).toString());
        expect(puppyBalance.toString()).to.eq(_cost.times(puppyPrizeRatio).toString());
        expect(userBalance.toString()).to.eq("0");
    });

    it("FeeCollector should receive x DEFI from 2 sit", async function () {
        const cost = await miniGame.defiCostPerSeat();
        const totalCost = new BigNumber(cost._hex).times(2);
        await mintDefiAndApprove(user1, totalCost.toString());
        await miniGame.connect(user1).sitWithDefi(2, [1, 2]);

        const userBalance = await defi.balanceOf(user1.address);
        const feeCollectorBalance = await defi.balanceOf(feeCollector.address);
        const platformReserveBalance = await defi.balanceOf(platformReserve.address);
        const godfatherBalance = await defi.balanceOf(godfatherPrize.address);
        const puppyBalance = await defi.balanceOf(puppyPrize.address);

        expect(feeCollectorBalance.toString()).to.eq(totalCost.div(100).times(feeCollectorRatio).toString());
        expect(platformReserveBalance.toString()).to.eq(totalCost.div(100).times(platformReserveRatio).toString());
        expect(godfatherBalance.toString()).to.eq(totalCost.div(100).times(godfatherPrizeRatio).toString());
        expect(puppyBalance.toString()).to.eq(totalCost.div(100).times(puppyPrizeRatio).toString());
        expect(userBalance.toString()).to.eq("0");
    });

    it("Should error, User doesn't have 400 DEFI for 2 sit", async function () {
        await mintDefiAndApprove(user1, ethers.utils.parseEther("399"));
        await expect(miniGame.connect(user1).sitWithDefi(2, [1, 2])).to.be.revertedWith(
            "MiniGame: INSUFFICIENT_BALANCE"
        );
    });

    it("Should error, incorrect seat length", async function () {
        await mintDefiAndApprove(user1, ethers.utils.parseEther("1000"));
        await expect(miniGame.connect(user1).sitWithDefi(3, [1, 2])).to.be.revertedWith("MiniGame: E2");

        await expect(miniGame.connect(user1).sitWithDefi(1, [1, 2])).to.be.revertedWith("MiniGame: E2");

        await expect(miniGame.connect(user1).sitWithDefi(1, [16])).to.be.revertedWith("MiniGame: GTE16");
    });

    it("Should error, Duplicate seat", async function () {
        await mintDefiAndApprove(user1, ethers.utils.parseEther("400"));
        await miniGame.connect(user1).sitWithDefi(1, [1]);
        await expect(miniGame.connect(user1).sitWithDefi(1, [1])).to.be.revertedWith("MiniGame: DUPLICATE");
    });

    it("Should error, claim prize without permission", async function () {
        await expect(miniGame.connect(accounts[0]).claimWonPrize(0)).to.be.revertedWith("MiniGame: No Seats Found");
    });

    it("Should create a new room & claim prize", async function () {
        await mintDefiAndApprove(user1, ethers.utils.parseEther("3200"));

        await expect(miniGame.connect(owner).drawWinner(getSalt())).to.be.revertedWith(
            "MiniGame: WinnerDraw cannot exceed currentRoomNo"
        );

        await miniGame.connect(user1).sitWithDefi(16, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

        const maxSeat = await miniGame.maxSeat();
        const currentRoomNo = await miniGame.currentRoomNo();
        expect(currentRoomNo).to.eq(2);

        await expect(miniGame.connect(accounts[0]).claimWonPrize(0)).to.be.revertedWith("MiniGame: No Seats Found");

        await expect(miniGame.connect(accounts[0]).drawWinner(getSalt())).to.be.revertedWith(
            "MiniGame: UnAuthorized Drawer"
        );

        miniGame.connect(owner).drawWinner(getSalt());

        await expect(miniGame.connect(owner).drawWinner(getSalt())).to.be.revertedWith(
            "MiniGame: WinnerDraw cannot exceed currentRoomNo"
        );

        const nextWinnerDrawRoomNo = await miniGame.connect(owner).nextWinnerDrawRoomNo();
        expect(nextWinnerDrawRoomNo).to.eq(2);

        const winner = await miniGame.connect(owner).winner(currentRoomNo - 1);
        expect(winner).to.lt(maxSeat);
        const isClaimed1 = await miniGame.isAddressClaimedPrize(currentRoomNo - 1, user1.address);
        expect(isClaimed1).to.eq(false);

        await miniGame.connect(user1).claimWonPrize(currentRoomNo - 1);
        const gftBalance = await gftStorage.balanceOf(user1.address);
        expect(gftBalance).to.eq(15);
        const puppyBalance = await puppyStorage.balanceOf(user1.address);
        expect(puppyBalance).to.eq(1);

        const isClaimed2 = await miniGame.isAddressClaimedPrize(currentRoomNo - 1, user1.address);
        expect(isClaimed2).to.eq(true);
    });

    it("Should Success, call immediatelyBeginRound, Own at least 4 seats", async function () {
        await mintDefiAndApprove(user1, ethers.utils.parseEther("800"));
        await miniGame.connect(user1).sitWithDefi(3, [0, 1, 2]);

        await expect(miniGame.connect(user1).immediatelyBeginRound()).to.be.revertedWith(
            "MiniGame: Need at Least 4 Seats"
        );

        // Sit 1 More Seats, and Begin Round
        await miniGame.connect(user1).sitWithDefi(1, [3]);
        await miniGame.connect(user1).immediatelyBeginRound();

        // drawWinner
        miniGame.connect(owner).drawWinner(getSalt());

        // Current Room Should be 2
        const currentRoomNo = await miniGame.currentRoomNo();
        expect(currentRoomNo).to.eq(2);

        // isClaimed should be false
        const winner = await miniGame.connect(owner).winner(currentRoomNo - 1);
        console.log("winner: " + winner);

        const isClaimed1 = await miniGame.isAddressClaimedPrize(currentRoomNo - 1, user1.address);
        expect(isClaimed1).to.eq(false);

        if (winner < 4) {
            console.log("Winner Case");
            // if user hs won, he should get 1 puppy & 3 godfather
            await miniGame.connect(user1).claimWonPrize(currentRoomNo - 1);
            const gftBalance = await gftStorage.balanceOf(user1.address);
            expect(gftBalance).to.eq(3);
            const puppyBalance = await puppyStorage.balanceOf(user1.address);
            expect(puppyBalance).to.eq(1);
            // console.log("gftBalance: "+gftBalance+", puppyBalance: "+puppyBalance);
            const isClaimed2 = await miniGame.isAddressClaimedPrize(currentRoomNo - 1, user1.address);
            expect(isClaimed2).to.eq(true);
        } else {
            console.log("All Lose Case");
            // if user hs lose, he should get 4 godfather
            await miniGame.connect(user1).claimWonPrize(currentRoomNo - 1);
            const gftBalance = await gftStorage.balanceOf(user1.address);
            expect(gftBalance).to.eq(4);
            const puppyBalance = await puppyStorage.balanceOf(user1.address);
            expect(puppyBalance).to.eq(0);
            // console.log("gftBalance: "+gftBalance+", puppyBalance: "+puppyBalance);
            const isClaimed2 = await miniGame.isAddressClaimedPrize(currentRoomNo - 1, user1.address);
            expect(isClaimed2).to.eq(true);
        }
    });

    it("Fee ratio should be updated", async function () {
        await miniGame.setFeeCollectorRatio(1, 2, 3, 94);
        const feeCollectorRatio = await miniGame.feeCollectorRatio();
        const platformReserveRatio = await miniGame.platformReserveRatio();
        const godfatherPrizeRatio = await miniGame.godfatherPrizeRatio();
        const puppyPrizeRatio = await miniGame.puppyPrizeRatio();

        expect(feeCollectorRatio).to.eq(1);
        expect(platformReserveRatio).to.eq(2);
        expect(godfatherPrizeRatio).to.eq(3);
        expect(puppyPrizeRatio).to.eq(94);
    });

    it("Fee ratio shouldn't be updated", async function () {
        await expect(miniGame.connect(user1).setFeeCollectorRatio(1, 2, 3, 94)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
        await expect(miniGame.setFeeCollectorRatio(1, 2, 3, 4)).to.be.revertedWith(
            "MiniGame: Incorrect Ratio, total must equals 100"
        );
    });

    it("Fee Address should be updated", async function () {
        await miniGame.setFeeCollectorAddress(
            accounts[0].address,
            accounts[1].address,
            accounts[2].address,
            accounts[3].address
        );
        const feeCollectorAddress = await miniGame.feeCollectorAddress();
        const platformReserveAddress = await miniGame.platformReserveAddress();
        const godfatherPrizeAddress = await miniGame.godfatherPrizeAddress();
        const puppyPrizeAddress = await miniGame.puppyPrizeAddress();

        expect(feeCollectorAddress).to.eq(accounts[0].address);
        expect(platformReserveAddress).to.eq(accounts[1].address);
        expect(godfatherPrizeAddress).to.eq(accounts[2].address);
        expect(puppyPrizeAddress).to.eq(accounts[3].address);
    });

    it("Fee Address shouldn't be updated", async function () {
        const addr = user1.address;
        await expect(miniGame.connect(user1).setFeeCollectorAddress(addr, addr, addr, addr)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });

    it("Should withdraw defi and busd from MiniGame", async function () {
        const amount = ethers.utils.parseEther("100");
        // DEFI
        await defi.mintTo(owner.address, amount);
        const defiBalance1 = await defi.balanceOf(owner.address);
        await defi.transfer(miniGame.address, amount);
        const defiBalance2 = await defi.balanceOf(owner.address);
        await miniGame.withdrawDefi(amount);
        const defiBalance3 = await defi.balanceOf(owner.address);

        expect(defiBalance1.toString()).to.eq(defiBalance3.toString());
        expect(defiBalance2.toString()).to.eq("0");

        // BUSD
        await busd.mint(amount);
        await busd.transfer(owner.address, amount);
        const busdBalance1 = await busd.balanceOf(owner.address);
        await busd.transfer(miniGame.address, amount);
        const busdBalance2 = await busd.balanceOf(owner.address);
        await miniGame.withdrawBusd(amount);
        const busdBalance3 = await busd.balanceOf(owner.address);

        expect(busdBalance1.toString()).to.eq(busdBalance3.toString());
        expect(busdBalance2.toString()).to.eq("0");
    });

    it("Test DrawWinner 96 Times", async function () {
        let wonNumberResult = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const looplength = 96;
        console.log("Random : " + looplength + " times, please wait a moment");
        await mintDefiAndApprove(user1, ethers.utils.parseEther("819200"));
        currentRoomNo = await miniGame.currentRoomNo();
        for (let i = 0; i < looplength; i++) {
            await miniGame.connect(user1).sitWithDefi(16, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
            await miniGame.connect(owner).drawWinner(getSalt());
            const wonSlot = await miniGame.connect(owner).winner(currentRoomNo - 1);
            wonNumberResult[wonSlot] = wonNumberResult[wonSlot] + 1;
            currentRoomNo++;
        }
        for (let i = 0; i < wonNumberResult.length; i++) {
            console.log("WonNumber-" + i + " : " + wonNumberResult[i]);
            expect(wonNumberResult[i]).to.greaterThan(0);
        }
    });

    // it("Room 1 , Should sit 16 Person", async function () {
    //   i = 0;
    //   sitPos = [1, 3, 5, 7, 9, 11, 13, 15];
    //   await mintDefiAndApprove(accounts[i], ethers.utils.parseEther("2000"));
    //   await miniGame.connect(accounts[i]).sitWithDefi(8, sitPos);
    //   i = 1;
    //   sitPos = [0, 2, 4, 6, 8, 10, 12, 14];
    //   await mintDefiAndApprove(accounts[i], ethers.utils.parseEther("2000"));
    //   await miniGame.connect(accounts[i]).sitWithDefi(8, sitPos);
    // });

    // it("Room I, ClaimWonPrize Wallet 0 & 1", async function () {
    //   for (i = 0; i < 2; i++) {
    //     await mintDefiAndApprove(accounts[i], ethers.utils.parseEther("2000"));
    //     await expect(
    //       miniGame.connect(accounts[i]).claimWonPrize(1)
    //     ).to.be.revertedWith("MiniGame: E501");
    //   }
    // });

    // it("Room 2 , Should sit 16 Person", async function () {
    //   i = 0;
    //   sitPos = [];
    //   await mintDefiAndApprove(accounts[i], ethers.utils.parseEther("4000"));
    //   await miniGame.connect(accounts[i]).sitWithDefi(16, sitPos);
    // });

    // it("Room 2, ClaimWonPrize Wallet 0", async function () {
    //   for (i = 0; i < 1; i++) {
    //     await mintDefiAndApprove(accounts[i], ethers.utils.parseEther("2000"));
    //     await expect(
    //       miniGame.connect(accounts[i]).claimWonPrize(2)
    //     ).to.be.revertedWith("MiniGame: E501");
    //   }
    // });

    // it("Room 3 , Should sit 16 Person", async function () {
    //   i = 0;
    //   sitPos = [0];
    //   await mintDefiAndApprove(accounts[i], ethers.utils.parseEther("2000"));
    //   await miniGame.connect(accounts[i]).sitWithDefi(1, sitPos);
    // });

    // it("Room 3, ClaimWonPrize Wallet 0", async function () {
    //   for (i = 0; i < 1; i++) {
    //     await mintDefiAndApprove(accounts[i], ethers.utils.parseEther("2000"));
    //     await expect(
    //       miniGame.connect(accounts[i]).claimWonPrize(3)
    //     ).to.be.revertedWith("E501");
    //   }
    // });

    const getSalt = async (account, amount) => {
        const hexString = Array(16)
            .fill()
            .map(() => Math.round(Math.random() * 0xf).toString(16))
            .join("");

        const randomBigInt = BigInt(`0x${hexString}`);
        return randomBigInt;
    };

    const mintBusdAndApprove = async (account, amount) => {
        await busd.mint(amount);
        await busd.transfer(account.address, amount);
        await busd.connect(account).approve(miniGame.address, amount);
    };

    const mintDefiAndApprove = async (account, amount) => {
        await defi.mintTo(account.address, amount);
        await defi.connect(account).approve(miniGame.address, amount);
    };

    const printGodfatherStorage = async (account) => {
        const accountTotalSupply = await gftStorage.connect(account).balanceOf(account.address);
        console.log("==== address: " + account.address + ", ownerAccountTotalSupply: " + accountTotalSupply);
        for (let i = 0; i < accountTotalSupply; i++) {
            const tokenIndex = await gftStorage.connect(account).tokenOfOwnerByIndex(account.address, i);
            const results = await gftStorage.getTokenInformation(tokenIndex);
            console.log(tokenIndex, results);
        }
    };

    const printPuppyStorage = async (account) => {
        const accountTotalSupply = await puppyStorage.connect(account).balanceOf(account.address);
        console.log("==== address: " + account.address + ", ownerAccountTotalSupply: " + accountTotalSupply);
        for (let i = 0; i < accountTotalSupply; i++) {
            const tokenIndex = await puppyStorage.connect(account).tokenOfOwnerByIndex(account.address, i);
            const tokenURI = await puppyStorage.connect(account).tokenURI(tokenIndex);
            const leadingZeroString = "000000" + tokenIndex;
            console.log(leadingZeroString.substring(leadingZeroString.length - 3) + " | " + tokenURI);
        }
    };
});

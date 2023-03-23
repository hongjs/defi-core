const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");

describe("Test Contract Wallet", function () {
    beforeEach(async function () {
        [owner, admin, user1, user2, user3, user4, feeCollector] = await ethers.getSigners();

        BUSDToken = await ethers.getContractFactory("BUSDToken");
        busd = await BUSDToken.deploy();
        await busd.deployed();

        PuppyStorage = await ethers.getContractFactory("PuppyStorage");
        puppy = await PuppyStorage.deploy();
        await puppy.deployed();

        DefiMarketplace = await ethers.getContractFactory("DefiMarketplace");
        market = await DefiMarketplace.deploy(busd.address, puppy.address, 1000);
        await market.deployed();

        await market.updateAdmin(admin.address);
        await market.updateFeeCollector(feeCollector.address);
        await busd.mint(ethers.utils.parseEther("10000000"));
        await busd.transfer(owner.address, ethers.utils.parseEther("1000000"));
        await busd.transfer(user1.address, ethers.utils.parseEther("1000000"));
        await busd.transfer(user2.address, ethers.utils.parseEther("1000000"));
        await busd.transfer(user3.address, ethers.utils.parseEther("1000000"));
        await puppy.addCanMint(owner.address);
    });

    describe("Test Marketplace", function () {
        it("Should pass, User2 buy NFT from user1", async function () {
            await puppy.mint(user1.address);
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 1)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await market
                .connect(user1)
                .createListing(
                    tokenIndex,
                    ethers.utils.parseEther("5000"),
                    ethers.utils.parseEther("5000"),
                    24 * 60 * 60
                );
            const user1Balance1 = new BigNumber((await busd.balanceOf(user1.address))._hex);
            const user2Balance1 = new BigNumber((await busd.balanceOf(user2.address))._hex);
            await busd.connect(user2).approve(market.address, ethers.utils.parseEther("500000"));
            await market.connect(user2).purchase(tokenIndex, ethers.utils.parseEther("5000"));
            const tokenOwner = await puppy.ownerOf(tokenIndex);
            expect(tokenOwner).to.eq(user2.address);
            const listingFee = await busd.balanceOf(market.address);
            expect(listingFee).to.eq(ethers.utils.parseEther("500"));
            const user1Balance2 = new BigNumber((await busd.balanceOf(user1.address))._hex);
            const user1Fee = user1Balance2.minus(user1Balance1);
            expect(user1Fee.toFixed()).to.eq(ethers.utils.parseEther("4500").toString());
            const user2Balance2 = new BigNumber((await busd.balanceOf(user2.address))._hex);
            const user2Paid = user2Balance1.minus(user2Balance2);
            expect(user2Paid.toFixed()).to.eq(ethers.utils.parseEther("5000").toString());

            const purchaseCount = await market.purchaseCount();
            expect(purchaseCount).to.eq("1");

            const purchased = await market.purchaseLogs(0);
            expect(purchased.tokenId.toString()).to.eq("1");
        });
        it("Should fail, Can't create StartPrice lower than EndPrice", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await expect(
                market
                    .connect(user1)
                    .createListing(tokenIndex, ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), 24 * 60 * 60)
            ).to.be.revertedWith("Marketplace: StartPrice must greather or equals EndPrice");
        });
        it("Should fail, Can't sell another user's NFT ", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await expect(
                market
                    .connect(user2)
                    .createListing(
                        tokenIndex,
                        ethers.utils.parseEther("5000"),
                        ethers.utils.parseEther("5000"),
                        24 * 60 * 60
                    )
            ).to.be.revertedWith("ERC721: transfer of token that is not own");
        });
        it("Should fail, create listing's duration < 1 minute", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await expect(
                market
                    .connect(user1)
                    .createListing(tokenIndex, ethers.utils.parseEther("5000"), ethers.utils.parseEther("5000"), 59)
            ).to.be.revertedWith("MarketBase: Minimum duration is 1 minute");
        });
        it("Should fail, User try to buy NFT twice time with same TokenID", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await market
                .connect(user1)
                .createListing(
                    tokenIndex,
                    ethers.utils.parseEther("5000"),
                    ethers.utils.parseEther("5000"),
                    24 * 60 * 60
                );
            await busd.connect(user2).approve(market.address, ethers.utils.parseEther("5000"));
            await busd.connect(user3).approve(market.address, ethers.utils.parseEther("5000"));
            await market.connect(user2).purchase(tokenIndex, ethers.utils.parseEther("5000"));
            const tokenOwner = await puppy.ownerOf(tokenIndex);
            expect(tokenOwner).to.eq(user2.address);
            await expect(
                market.connect(user3).purchase(tokenIndex, ethers.utils.parseEther("5000"))
            ).to.be.revertedWith("MarketBase: TokenId not exists");
        });
        it("Should fail, Users try to buy non-sell NFT", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await busd.connect(user2).approve(market.address, ethers.utils.parseEther("5000"));
            await expect(
                market.connect(user2).purchase(tokenIndex, ethers.utils.parseEther("5000"))
            ).to.be.revertedWith("MarketBase: TokenId not exists");
        });
        it("Should fail, token amount doesnt enough to buy NFT", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await market
                .connect(user1)
                .createListing(
                    tokenIndex,
                    ethers.utils.parseEther("5000"),
                    ethers.utils.parseEther("5000"),
                    24 * 60 * 60
                );
            await busd.connect(user4).approve(market.address, ethers.utils.parseEther("5000"));
            await expect(
                market.connect(user4).purchase(tokenIndex, ethers.utils.parseEther("5000"))
            ).to.be.revertedWith("BEP20: transfer amount exceeds balance");
        });
        it("Should pass, User2 buy NFT from user1 when put over amount", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await market
                .connect(user1)
                .createListing(
                    tokenIndex,
                    ethers.utils.parseEther("5000"),
                    ethers.utils.parseEther("5000"),
                    24 * 60 * 60
                );
            const user1Balance1 = new BigNumber((await busd.balanceOf(user1.address))._hex);
            const user2Balance1 = new BigNumber((await busd.balanceOf(user2.address))._hex);
            await busd.connect(user2).approve(market.address, ethers.utils.parseEther("6000"));
            await market.connect(user2).purchase(tokenIndex, ethers.utils.parseEther("6000"));
            const tokenOwner = await puppy.ownerOf(tokenIndex);
            expect(tokenOwner).to.eq(user2.address);
            const listingFee = await busd.balanceOf(market.address);
            expect(listingFee).to.eq(ethers.utils.parseEther("500"));
            const user1Balance2 = new BigNumber((await busd.balanceOf(user1.address))._hex);
            const user1Fee = user1Balance2.minus(user1Balance1);
            expect(user1Fee.toFixed()).to.eq(ethers.utils.parseEther("4500").toString());
            const user2Balance2 = new BigNumber((await busd.balanceOf(user2.address))._hex);
            const user2Paid = user2Balance1.minus(user2Balance2);
            expect(user2Paid.toFixed()).to.eq(ethers.utils.parseEther("5000").toString());
        });
        it("Should fail, User put amount lower price", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await market
                .connect(user1)
                .createListing(
                    tokenIndex,
                    ethers.utils.parseEther("5000"),
                    ethers.utils.parseEther("5000"),
                    24 * 60 * 60
                );
            await busd.connect(user2).approve(market.address, ethers.utils.parseEther("5000"));
            await expect(
                market.connect(user2).purchase(tokenIndex, ethers.utils.parseEther("4999"))
            ).to.be.revertedWith("MarketBase: OfferPrice too low");
        });
        it("Should pass, User1 cancel his listing", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await market
                .connect(user1)
                .createListing(
                    tokenIndex,
                    ethers.utils.parseEther("5000"),
                    ethers.utils.parseEther("5000"),
                    24 * 60 * 60
                );
            await market.connect(user1).cancelListing(tokenIndex);
            await expect(market.getListing(tokenIndex)).to.be.revertedWith("Marketplace: TokenID is a must on listing");
        });
        it("Should pass, Cant cancel is not in listing", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await expect(market.connect(user1).cancelListing(tokenIndex)).to.be.revertedWith(
                "Marketplace: TokenID is a must on listing"
            );
        });
        it("Should fail, User2/admin try to cancel another user's listing", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await market
                .connect(user1)
                .createListing(
                    tokenIndex,
                    ethers.utils.parseEther("5000"),
                    ethers.utils.parseEther("5000"),
                    24 * 60 * 60
                );
            await expect(market.connect(user2).cancelListing(tokenIndex)).to.be.revertedWith(
                "Marketplace: CancelListing must calls by seller"
            );
            await expect(market.connect(owner).cancelListing(tokenIndex)).to.be.revertedWith(
                "Marketplace: CancelListing must calls by seller"
            );
        });
        it("Should pass, price increase by time pass until EndingPrice", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await market
                .connect(user1)
                .createListing(
                    tokenIndex,
                    ethers.utils.parseEther("5000"),
                    ethers.utils.parseEther("4000"),
                    24 * 60 * 60
                );
            // Time increased by Thanos
            await ethers.provider.send("evm_increaseTime", [12 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            const currentPrice1 = new BigNumber((await market.getCurrentPrice(tokenIndex))._hex)
                .div(new BigNumber(10).pow(18))
                .toNumber();
            expect(currentPrice1).to.eq(4500);
            // Time increased by Thanos
            await ethers.provider.send("evm_increaseTime", [12 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            const currentPrice2 = new BigNumber((await market.getCurrentPrice(tokenIndex))._hex)
                .div(new BigNumber(10).pow(18))
                .toNumber();
            expect(currentPrice2).to.eq(4000);
            // Time increased by Thanos
            await ethers.provider.send("evm_increaseTime", [12 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            const currentPrice3 = new BigNumber((await market.getCurrentPrice(tokenIndex))._hex)
                .div(new BigNumber(10).pow(18))
                .toNumber();
            expect(currentPrice3).to.eq(4000);
        });
        it("Should fail, Admin change fee < 100.00%", async function () {
            await expect(market.updateFee(10001)).to.be.revertedWith("Marketplace: Fee must less than or equals 10000");
        });
        it("Should fail, user1 try to change fee", async function () {
            await expect(market.connect(user1).updateFee(10001)).to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Should pass, admin change feeRate to 20.00%", async function () {
            await market.updateFee(2000);
            const feeRate = (await market.feeRate()).toString();
            expect(feeRate).to.eq("2000");
        });
        it("Should fail, user1 try to pause/unpause the Listing", async function () {
            await expect(market.connect(user1).pause()).to.be.revertedWith("Pausable: caller is not the admin");
            await expect(market.connect(user1).unpause()).to.be.revertedWith("Pausable: caller is not the admin");
        });
        it("Should fail, user1 try to update new admin", async function () {
            await expect(market.connect(user1).updateAdmin(user1.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });
        it("Should pass, new admin try to pause/unpause the Market", async function () {
            await market.connect(owner).updateAdmin(user1.address);

            const newAdmin = await market.admin();
            expect(newAdmin).to.eq(user1.address);

            await market.connect(user1).pause();
            const paused = await market.paused();
            expect(paused).to.eq(true);
        });
        it("Should pass, admin pause/unpause the Market", async function () {
            await market.connect(admin).pause();
            const isPaused1 = (await market.paused()).toString();
            expect(isPaused1).to.eq("true");
            await market.connect(admin).unpause();
            const isPaused2 = (await market.paused()).toString();
            expect(isPaused2).to.eq("false");
        });
        it("Should fail, Can't create listing then Listing is paused", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await market.connect(admin).pause();
            const isPaused1 = (await market.paused()).toString();
            expect(isPaused1).to.eq("true");
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await expect(
                market
                    .connect(user1)
                    .createListing(
                        tokenIndex,
                        ethers.utils.parseEther("5000"),
                        ethers.utils.parseEther("5000"),
                        24 * 60 * 60
                    )
            ).to.be.revertedWith("Pausable: paused");
        });
        it("Should fail, Can't purchase when Listing is paused", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await market
                .connect(user1)
                .createListing(
                    tokenIndex,
                    ethers.utils.parseEther("5000"),
                    ethers.utils.parseEther("5000"),
                    24 * 60 * 60
                );
            await market.connect(admin).pause();
            await busd.connect(user2).approve(market.address, ethers.utils.parseEther("500000"));
            await expect(
                market.connect(user2).purchase(tokenIndex, ethers.utils.parseEther("5000"))
            ).to.be.revertedWith("Pausable: paused");
        });
        it("Should pass, User cancel his listing when Listing is paused", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await market
                .connect(user1)
                .createListing(
                    tokenIndex,
                    ethers.utils.parseEther("5000"),
                    ethers.utils.parseEther("5000"),
                    24 * 60 * 60
                );
            await market.connect(admin).pause();
            await market.connect(user1).cancelListing(tokenIndex);
            await expect(market.getListing(tokenIndex)).to.be.revertedWith("Marketplace: TokenID is a must on listing");
        });
        it("Should pass, Admin must able to cancel another user's listing then Listing is paused", async function () {
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await market
                .connect(user1)
                .createListing(
                    tokenIndex,
                    ethers.utils.parseEther("5000"),
                    ethers.utils.parseEther("5000"),
                    24 * 60 * 60
                );
            await market.connect(admin).pause();
            await market.connect(admin).cancelListingWhenPaused(tokenIndex);
            await expect(market.getListing(tokenIndex)).to.be.revertedWith("Marketplace: TokenID is a must on listing");
        });
        it("Should pass, admin withdraw fee from the Listing", async function () {
            const adminBalance1 = new BigNumber((await busd.balanceOf(feeCollector.address))._hex);
            await puppy.mint(user1.address);
            const tokenIndex = (await puppy.tokenOfOwnerByIndex(user1.address, 0)).toNumber();
            await puppy.connect(user1).setApprovalForAll(market.address, true);
            await market
                .connect(user1)
                .createListing(
                    tokenIndex,
                    ethers.utils.parseEther("5000"),
                    ethers.utils.parseEther("5000"),
                    24 * 60 * 60
                );
            await busd.connect(user2).approve(market.address, ethers.utils.parseEther("5000"));
            await market.connect(user2).purchase(tokenIndex, ethers.utils.parseEther("5000"));
            await market.withdrawBalance();
            const adminBalance2 = new BigNumber((await busd.balanceOf(feeCollector.address))._hex);
            const fee = adminBalance2.minus(adminBalance1).div(new BigNumber(10).pow(18)).toNumber();
            expect(fee).to.eq(500);
        });
        it("Should fail, another user try to calls withdrawBalance", async function () {
            await expect(market.connect(user1).withdrawBalance()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });
        // it("Should pass, test add/remove entries", async function () {
        //     const price = ethers.utils.parseEther("5000");
        //     const _1day = 24 * 60 * 60;
        //     await puppy.mint(user1.address);
        //     await puppy.mint(user1.address);
        //     await puppy.mint(user1.address);
        //     await puppy.mint(user1.address);
        //     await puppy.mint(user1.address);
        //     await puppy.mint(user1.address);
        //     await puppy.mint(user1.address);
        //     await puppy.mint(user1.address);
        //     await puppy.mint(user1.address);
        //     await puppy.mint(user1.address);
        //     let idx = 0;
        //     const tokenId0 = (await puppy.tokenOfOwnerByIndex(user1.address, idx++)).toNumber();
        //     const tokenId1 = (await puppy.tokenOfOwnerByIndex(user1.address, idx++)).toNumber();
        //     const tokenId2 = (await puppy.tokenOfOwnerByIndex(user1.address, idx++)).toNumber();
        //     const tokenId3 = (await puppy.tokenOfOwnerByIndex(user1.address, idx++)).toNumber();
        //     const tokenId4 = (await puppy.tokenOfOwnerByIndex(user1.address, idx++)).toNumber();
        //     const tokenId5 = (await puppy.tokenOfOwnerByIndex(user1.address, idx++)).toNumber();
        //     const tokenId6 = (await puppy.tokenOfOwnerByIndex(user1.address, idx++)).toNumber();
        //     const tokenId7 = (await puppy.tokenOfOwnerByIndex(user1.address, idx++)).toNumber();
        //     const tokenId8 = (await puppy.tokenOfOwnerByIndex(user1.address, idx++)).toNumber();
        //     const tokenId9 = (await puppy.tokenOfOwnerByIndex(user1.address, idx++)).toNumber();
        //     await puppy.connect(user1).setApprovalForAll(market.address, true);
        //     await market.connect(user1).createListing(tokenId0, 0, price, _1day);
        //     await market.connect(user1).createListing(tokenId1, 1, price, _1day);
        //     await market.connect(user1).createListing(tokenId2, 2, price, _1day);
        //     await market.connect(user1).createListing(tokenId3, 3, price, _1day);
        //     await market.connect(user1).createListing(tokenId4, 4, price, _1day);
        //     await market.connect(user1).createListing(tokenId5, 5, price, _1day);
        //     await market.connect(user1).createListing(tokenId6, 6, price, _1day);
        //     await market.connect(user1).createListing(tokenId7, 7, price, _1day);
        //     await market.connect(user1).createListing(tokenId8, 8, price, _1day);
        //     await market.connect(user1).createListing(tokenId9, 9, price, _1day);
        //     const keys = await market.getEntriesByOffset(0, 1);
        //     console.log(keys);
        // });
    });
});

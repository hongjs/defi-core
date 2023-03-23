const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");
const MarketingWalletABI = require("../artifacts/contracts/wallets/MarketingWallet.sol/MarketingWallet.json");
const {callTimelockFunction, getCurrentTimeStamp} = require("../utils/timelockUtil.js");

describe("Test Contract Wallet", function () {
    let owner, user1, user2;
    let defi, devWallet;

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();

        DefiToken = await ethers.getContractFactory("DefiToken");
        defi = await DefiToken.deploy();
        await defi.deployed();

        DevWallet = await ethers.getContractFactory("DevWallet");
        currentBlock = await ethers.provider.getBlockNumber();
        devWallet = await DevWallet.deploy(defi.address, currentBlock - 1);
        await devWallet.deployed();

        MarketingWallet = await ethers.getContractFactory("MarketingWallet");
        marketingWallet = await MarketingWallet.deploy(defi.address, user2.address);
        await marketingWallet.deployed();

        WalletContract = await ethers.getContractFactory("WalletContract");
        walletContract = await WalletContract.deploy("Dummy", defi.address, user3.address);
        await walletContract.deployed();

        _1DAY = 1 * 24 * 60 * 60;
        Timelock = await ethers.getContractFactory("Timelock");
        timelock = await Timelock.deploy(owner.address, _1DAY);
        await timelock.deployed();
    });

    describe("Test DevWallet", function () {
        it("Owner is able to withdraw after timelocked", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("10000000"));
            await defi.transfer(devWallet.address, ethers.utils.parseEther("10000000"));

            devWallet.withdraw(ethers.utils.parseEther("10000000"));

            const userBalance = await defi.balanceOf(owner.address);
            expect(userBalance).to.eq(ethers.utils.parseEther("10000000"));

            const devBalance = await defi.balanceOf(devWallet.address);
            expect(devBalance.toNumber()).to.eq(0);
        });

        it("Owner is unable to withdraw due to timelocked", async function () {
            const devWallet2 = await DevWallet.deploy(defi.address, currentBlock + 1000);
            await devWallet2.deployed();

            await defi.mintTo(owner.address, ethers.utils.parseEther("10000000"));

            await defi.transfer(devWallet2.address, ethers.utils.parseEther("10000000"));
            const balance1 = await defi.balanceOf(owner.address);
            expect(balance1.toNumber()).to.eq(0);

            await expect(devWallet2.withdraw(ethers.utils.parseEther("10000000"))).to.be.revertedWith(
                "DevWallet: Withdraw is timelocked"
            );
        });

        it("Another users are unable to withdraw", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("10000000"));
            await defi.transfer(devWallet.address, ethers.utils.parseEther("10000000"));
            await expect(devWallet.connect(user2).withdraw(ethers.utils.parseEther("10000000"))).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should withdraw full amount", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("10000000"));
            await defi.transfer(devWallet.address, ethers.utils.parseEther("10000000"));

            const balance1 = await defi.balanceOf(owner.address);
            await devWallet.withdraw(ethers.utils.parseEther("10000000"));
            const balance2 = await defi.balanceOf(owner.address);

            expect(balance1.toString()).to.eq("0");
            expect(balance2.toString()).to.eq(ethers.utils.parseEther("10000000").toString());
        });

        it("Should error, withdraw exceed amount", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("10000000"));
            await defi.transfer(devWallet.address, ethers.utils.parseEther("10000000"));

            const balance1 = await defi.balanceOf(owner.address);
            await expect(devWallet.withdraw(ethers.utils.parseEther("10000001"))).to.be.revertedWith(
                "DevWallet: INSUFFICIENT_AMOUNT"
            );
        });

        it("Should withdraw partial amount", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("10000000"));
            await defi.transfer(devWallet.address, ethers.utils.parseEther("10000000"));

            const balance1 = await defi.balanceOf(owner.address);
            await devWallet.withdraw(ethers.utils.parseEther("1000000"));
            const balance2 = await defi.balanceOf(owner.address);
            const devWalletBalance = await defi.balanceOf(devWallet.address);

            expect(balance1.toString()).to.eq("0");
            expect(balance2.toString()).to.eq(ethers.utils.parseEther("1000000").toString());
            expect(devWalletBalance.toString()).to.eq(ethers.utils.parseEther("9000000").toString());
        });
    });

    describe("Test MarketingWallet", function () {
        it("Another users are unable to withdraw", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000000"));
            await defi.transfer(marketingWallet.address, ethers.utils.parseEther("1000000"));
            await expect(
                marketingWallet.connect(user2).withdraw(ethers.utils.parseEther("1000000"))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should withdraw full amount", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000000"));
            await defi.transfer(marketingWallet.address, ethers.utils.parseEther("1000000"));

            const balance1 = await defi.balanceOf(owner.address);
            await marketingWallet.withdraw(ethers.utils.parseEther("1000000"));
            const balance2 = await defi.balanceOf(user2.address);

            expect(balance1.toString()).to.eq("0");
            expect(balance2.toString()).to.eq(ethers.utils.parseEther("1000000").toString());
        });

        it("Should error, withdraw exceed amount", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000000"));
            await defi.transfer(marketingWallet.address, ethers.utils.parseEther("1000000"));

            const balance1 = await defi.balanceOf(owner.address);
            await expect(marketingWallet.withdraw(ethers.utils.parseEther("1000001"))).to.be.revertedWith(
                "MarketingWallet: INSUFFICIENT_AMOUNT"
            );
        });

        it("Should withdraw partial amount", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000000"));
            await defi.transfer(marketingWallet.address, ethers.utils.parseEther("1000000"));

            const balance1 = await defi.balanceOf(owner.address);
            await marketingWallet.withdraw(ethers.utils.parseEther("100000"));
            const balance2 = await defi.balanceOf(user2.address);
            const walletBalance = await defi.balanceOf(marketingWallet.address);

            expect(balance1.toString()).to.eq("0");
            expect(balance2.toString()).to.eq(ethers.utils.parseEther("100000").toString());
            expect(walletBalance.toString()).to.eq(ethers.utils.parseEther("900000").toString());
        });

        it("Shouldn't withdraw due to timelocked", async function () {
            await marketingWallet.transferOwnership(timelock.address);
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000000"));
            await defi.transfer(marketingWallet.address, ethers.utils.parseEther("1000000"));
            await expect(marketingWallet.withdraw(ethers.utils.parseEther("1"))).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should withdraw after with timelocked", async function () {
            await marketingWallet.transferOwnership(timelock.address);
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000000"));
            await defi.transfer(marketingWallet.address, ethers.utils.parseEther("1000000"));

            const balance1 = await defi.balanceOf(marketingWallet.address);
            expect(balance1.toString()).to.eq(ethers.utils.parseEther("1000000").toString());

            const req = {
                target: marketingWallet.address,
                value: 0,
                signature: "withdraw(uint256)",
                data: [ethers.utils.parseEther("1000000")],
                eta: (await getCurrentTimeStamp()) + _1DAY + 1,
            };

            await callTimelockFunction(req, MarketingWalletABI.abi, owner);

            const balance2 = await defi.balanceOf(marketingWallet.address);
            expect(balance2.toString()).to.eq("0");
        });

        it("Shouldn't create contract with address(0)", async function () {
            await expect(
                MarketingWallet.deploy(defi.address, "0x0000000000000000000000000000000000000000")
            ).to.be.revertedWith("MarketingWallet: Recipient must not equals address(0)");
        });
    });

    describe("Test WalletContract", function () {
        it("Another users are unable to withdraw", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000000"));
            await defi.transfer(walletContract.address, ethers.utils.parseEther("1000000"));
            await expect(walletContract.connect(user3).withdraw(ethers.utils.parseEther("1000000"))).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should withdraw full amount", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000000"));
            await defi.transfer(walletContract.address, ethers.utils.parseEther("1000000"));

            const balance1 = await defi.balanceOf(owner.address);
            await walletContract.withdraw(ethers.utils.parseEther("1000000"));
            const balance2 = await defi.balanceOf(user3.address);

            expect(balance1.toString()).to.eq("0");
            expect(balance2.toString()).to.eq(ethers.utils.parseEther("1000000").toString());
        });

        it("Should error, withdraw exceed amount", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000000"));
            await defi.transfer(walletContract.address, ethers.utils.parseEther("1000000"));

            await expect(walletContract.withdraw(ethers.utils.parseEther("1000001"))).to.be.revertedWith(
                "WalletContract: INSUFFICIENT_AMOUNT"
            );
        });

        it("Should withdraw partial amount", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000000"));
            await defi.transfer(walletContract.address, ethers.utils.parseEther("1000000"));

            const balance1 = await defi.balanceOf(owner.address);
            await walletContract.withdraw(ethers.utils.parseEther("100000"));
            const balance2 = await defi.balanceOf(user3.address);
            const walletBalance = await defi.balanceOf(walletContract.address);

            expect(balance1.toString()).to.eq("0");
            expect(balance2.toString()).to.eq(ethers.utils.parseEther("100000").toString());
            expect(walletBalance.toString()).to.eq(ethers.utils.parseEther("900000").toString());
        });

        it("Shouldn't create contract with address(0)", async function () {
            await expect(
                WalletContract.deploy("Dummy", defi.address, "0x0000000000000000000000000000000000000000")
            ).to.be.revertedWith("WalletContract: Recipient must not equals to address(0)");
        });

        it("Shouldn't update recipient with address(0)", async function () {
            await expect(
                walletContract.updateRecipient("0x0000000000000000000000000000000000000000")
            ).to.be.revertedWith("WalletContract: Recipient must not equals to address(0)");
        });
    });
});

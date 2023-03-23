const {default: BigNumber} = require("bignumber.js");
const {expect} = require("chai");

describe("Test DefiToken", function () {
    beforeEach(async function () {
        [owner, user1, masterChef] = await ethers.getSigners();

        DefiToken = await ethers.getContractFactory("DefiToken");
        defi = await DefiToken.deploy();
        await defi.deployed();
    });

    describe("Test DefiToken", function () {
        it("Should mint 100,000,000 DEFI", async function () {
            await defi.mint(ethers.utils.parseEther("100000000"));
            const totalSupply = await defi.totalSupply();
            expect(totalSupply.toString()).to.eq(ethers.utils.parseEther("100000000").toString());
        });

        it("Shouldn't mint 100,000,001 DEFI", async function () {
            await expect(defi.mint(ethers.utils.parseEther("100000001"))).to.be.revertedWith(
                "DefiToken: SupplyCap overflow"
            );
        });

        it("Should mint 1,000 DEFI to owner", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000"));
            const balance = await defi.balanceOf(owner.address);
            expect(balance.toString()).to.eq(ethers.utils.parseEther("1000").toString());
        });

        it("Should transfer 1,000 DEFI to owner", async function () {
            await defi.mint(ethers.utils.parseEther("1000"));
            await defi.transfer(owner.address, ethers.utils.parseEther("1000"));
            const balance = await defi.balanceOf(owner.address);
            expect(balance.toString()).to.eq(ethers.utils.parseEther("1000").toString());
        });

        it("Should transfer 10 DEFI to user1", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000"));
            await defi.transfer(user1.address, ethers.utils.parseEther("10"));

            const balance = await defi.balanceOf(user1.address);
            expect(balance.toString()).to.eq(ethers.utils.parseEther("10").toString());
        });

        it("Shouldn't transfer 10 DEFI to user1", async function () {
            await expect(defi.transfer(user1.address, ethers.utils.parseEther("10"))).to.be.revertedWith(
                "DefiToken: transfer amount exceeds balance"
            );
        });

        it("Should burn 500 DEFI", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000"));
            const totalSupply1 = await defi.totalSupply();
            expect(totalSupply1.toString()).to.eq(ethers.utils.parseEther("1000").toString());

            await defi.burn(ethers.utils.parseEther("500"));
            const balance = await defi.balanceOf(owner.address);
            expect(balance.toString()).to.eq(ethers.utils.parseEther("500").toString());

            const totalSupply2 = await defi.totalSupply();
            expect(totalSupply2.toString()).to.eq(ethers.utils.parseEther("500").toString());
        });

        it("Shouldn't burn 500 DEFI", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1"));
            await expect(defi.burn(ethers.utils.parseEther("500"))).to.be.revertedWith(
                "DefiToken: burn amount exceeds balance"
            );
        });

        it("Should approve 1,000 DEFI to user1", async function () {
            await defi.approve(masterChef.address, ethers.utils.parseEther("1000"));
            const allowance = await defi.allowance(owner.address, masterChef.address);
            expect(allowance.toString()).to.eq(ethers.utils.parseEther("1000").toString());
        });

        it("Should tranfer 1,000 DEFI from owner to user1", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000"));
            await defi.connect(owner).approve(masterChef.address, ethers.utils.parseEther("1000"));
            await defi.connect(masterChef).transferFrom(owner.address, user1.address, ethers.utils.parseEther("1000"));
            const ownerBalance = await defi.balanceOf(owner.address);
            const usre1Balance = await defi.balanceOf(user1.address);

            expect(ownerBalance.toString()).to.eq(ethers.utils.parseEther("0").toString());
            expect(usre1Balance.toString()).to.eq(ethers.utils.parseEther("1000").toString());
        });

        it("Shouldn't tranfer 1,000 DEFI from owner to user1", async function () {
            await defi.connect(owner).approve(masterChef.address, ethers.utils.parseEther("1000"));
            await expect(
                defi.connect(masterChef).transferFrom(owner.address, user1.address, ethers.utils.parseEther("1000"))
            ).to.be.revertedWith("DefiToken: transfer amount exceeds balance");
        });

        it("Should tranfer 900 DEFI from owner to user1", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000"));
            await defi.connect(owner).approve(masterChef.address, ethers.utils.parseEther("1000"));
            await defi.connect(masterChef).transferFrom(owner.address, user1.address, ethers.utils.parseEther("900"));
            const ownerBalance = await defi.balanceOf(owner.address);
            const usre1Balance = await defi.balanceOf(user1.address);
            expect(ownerBalance.toString()).to.eq(ethers.utils.parseEther("100").toString());
            expect(usre1Balance.toString()).to.eq(ethers.utils.parseEther("900").toString());
        });

        it("Shouldn't tranfer 200 DEFI from owner to user1", async function () {
            await defi.mintTo(owner.address, ethers.utils.parseEther("1000"));
            await defi.connect(owner).approve(masterChef.address, ethers.utils.parseEther("100"));
            await expect(
                defi.connect(masterChef).transferFrom(owner.address, user1.address, ethers.utils.parseEther("200"))
            ).to.be.revertedWith("BEP20: transfer amount exceeds allowance");
        });
    });
});

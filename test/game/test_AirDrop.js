// test/GameItemProxy.js
// Load dependencies
const { expect } = require("chai");

// let GameItemV2;
// let gameItemV2;
// Start test block
describe("GodfatherStorage", function () {
  beforeEach(async function () {
    [owner, user1, user2] = await hre.ethers.getSigners();

    BEP40Token = await ethers.getContractFactory("BEP40Token");
    coupon = await BEP40Token.deploy("Foodcourt Coupon", "COUPON");

    GodfatherStorage = await ethers.getContractFactory("GodfatherStorage");
    gftStorage = await GodfatherStorage.deploy();
    AirDropUtil = await ethers.getContractFactory("AirDropUtil");
    airdropUtil = await AirDropUtil.deploy(
      gftStorage.address,
      coupon.address,
      0
    );

    await gftStorage.addCanMint(airdropUtil.address);
    await coupon.mint(ethers.utils.parseEther("1000000"));

    defaultIP = "127.0.0.1";
  });

  // =======================================================================================
  // AirDrop
  // =======================================================================================

  it("Should got 1 NFT from Aidrop.", async function () {
    await airdropUtil.connect(user1).getFreeAirDrop(defaultIP);
    const balance = await gftStorage.connect(user1).balanceOf(user1.address);
    expect(balance.toNumber()).to.eq(1);
    await printAirDrop(user1);
  });

  it("Should error, user claim airdrop twice time.", async function () {
    await airdropUtil.connect(user1).getFreeAirDrop(defaultIP);
    await expect(
      airdropUtil.connect(user1).getFreeAirDrop(defaultIP)
    ).to.be.revertedWith("AirDropUtil: You have got the reward before");
  });

  it("Should error, user has 0 COUPON.", async function () {
    await expect(
      airdropUtil.connect(user1).getAirDrop(defaultIP)
    ).to.be.revertedWith("AirDropUtil: INSUFFICIENT_BALANCE");
  });

  it("Should got 1 NFT from Aidrop (user has 200 COUPON).", async function () {
    await coupon.transfer(user1.address, ethers.utils.parseEther("200"));
    await airdropUtil.connect(user1).getAirDrop(defaultIP);
    const balance = await gftStorage.connect(user1).balanceOf(user1.address);
    expect(balance.toNumber()).to.eq(1);
  });

  it("Should error, user has 200 COUPON but claim airdrop twice time.", async function () {
    await coupon.transfer(user1.address, ethers.utils.parseEther("200"));
    await airdropUtil.connect(user1).getAirDrop(defaultIP);
    await expect(
      airdropUtil.connect(user1).getAirDrop(defaultIP)
    ).to.be.revertedWith("AirDropUtil: You have got the reward before");
  });

  it("Should got 1 NFT from Aidrop (user has 201 COUPON).", async function () {
    await coupon.transfer(user1.address, ethers.utils.parseEther("201"));
    await airdropUtil.connect(user1).getAirDrop(defaultIP);
    const balance = await gftStorage.connect(user1).balanceOf(user1.address);
    expect(balance.toNumber()).to.eq(1);
  });

  it("Should error (require 2,000 COUPON).", async function () {
    await airdropUtil.setMinimumBalance(ethers.utils.parseEther("2000"));
    await coupon.transfer(user1.address, ethers.utils.parseEther("200"));
    await expect(
      airdropUtil.connect(user1).getAirDrop(defaultIP)
    ).to.be.revertedWith("AirDropUtil: INSUFFICIENT_BALANCE");
  });

  it("Should got 1 NFT (require 2,000 COUPON).", async function () {
    await airdropUtil.setMinimumBalance(ethers.utils.parseEther("2000"));
    await coupon.transfer(user1.address, ethers.utils.parseEther("2000"));
    airdropUtil.connect(user1).getAirDrop(defaultIP);
    const balance = await gftStorage.connect(user1).balanceOf(user1.address);
    expect(balance.toNumber()).to.eq(1);
  });

  it("Should error, 2 users claim AirDrop at difference IP Address", async function () {
    airdropUtil.connect(user1).getFreeAirDrop(defaultIP);
    const balance1 = await gftStorage.connect(user1).balanceOf(user1.address);
    expect(balance1.toNumber()).to.eq(1);

    airdropUtil.connect(user2).getFreeAirDrop("127.0.0.2");
    const balance2 = await gftStorage.connect(user2).balanceOf(user2.address);
    expect(balance2.toNumber()).to.eq(1);
  });

  it("Should error, 2 users claim AirDrop at same IP Address", async function () {
    await expect(
      airdropUtil.connect(user2).getFreeAirDrop("")
    ).to.be.revertedWith("AirDropUtil: Invalid parameter");

    airdropUtil.connect(user1).getFreeAirDrop(defaultIP);
    await expect(
      airdropUtil.connect(user2).getFreeAirDrop(defaultIP)
    ).to.be.revertedWith("AirDropUtil: You have got the reward before");

    await coupon.transfer(user1.address, ethers.utils.parseEther("200"));
    await expect(
      airdropUtil.connect(user2).getAirDrop(defaultIP)
    ).to.be.revertedWith("AirDropUtil: You have got the reward before");
  });

  it("Should error, users claim more than quota", async function () {
    await airdropUtil.setQuota(1);
    airdropUtil.connect(user1).getFreeAirDrop(defaultIP);
    await expect(
      airdropUtil.connect(user2).getFreeAirDrop("127.0.0.2")
    ).to.be.revertedWith("AirDropUtil: No Quota Left");
  });

  it("Should error, can't claim while timelock", async function () {
    const currentBlock = await ethers.provider.getBlockNumber();
    const airdropUtil2 = await AirDropUtil.deploy(
      gftStorage.address,
      coupon.address,
      currentBlock * 10
    );
    await gftStorage.addCanMint(airdropUtil2.address);
    await expect(airdropUtil2.getFreeAirDrop(defaultIP)).to.be.revertedWith(
      "AirDropUtil: airdrop is timelocked"
    );
  });

  it("Should error, AirDrop Util doesn't has mint permission", async function () {
    const airdropUtil2 = await AirDropUtil.deploy(
      gftStorage.address,
      coupon.address,
      0
    );
    await expect(airdropUtil2.getFreeAirDrop(defaultIP)).to.be.revertedWith(
      "GodfatherStorage: UnAuthorizeds Minter"
    );
  });

  const printAirDrop = async (account) => {
    const accountTotalSupply = await gftStorage
      .connect(account)
      .balanceOf(account.address);
    console.log(
      "==== address: " +
        account.address +
        ", ownerAccountTotalSupply: " +
        accountTotalSupply
    );
    for (let i = 0; i < accountTotalSupply; i++) {
      const tokenIndex = await gftStorage
        .connect(account)
        .tokenOfOwnerByIndex(account.address, i);
      const tokenURI = await gftStorage.connect(account).tokenURI(tokenIndex);
      const leadingZeroString = "000000" + tokenIndex;
      console.log(
        leadingZeroString.substring(leadingZeroString.length - 3) +
          " | " +
          tokenURI
      );
    }
  };
});

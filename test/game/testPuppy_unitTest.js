// Load dependencies
const { expect } = require("chai");

describe("PuppyStorage", function () {
  beforeEach(async function () {
    // Deploy Contract
    PuppyStorage = await ethers.getContractFactory("PuppyStorage");
    puppyStorage = await PuppyStorage.deploy();
    //console.log("PuppyStorage Address: " + puppyStorage.address);
    // get Accounts Signers Array
    [owner, ...accounts] = await hre.ethers.getSigners();
    // for (i = 0; i < 20; i++) {
    //   console.log("Acc" + i + " : " + accounts[i].address);
    // }
    await puppyStorage.addCanMint(owner.address);
  });

  // MiniGame
  it("Should error, user mint by unautorized.", async function () {
    await expect(
      puppyStorage.connect(accounts[0]).mint(accounts[0].address)
    ).to.be.revertedWith("PuppyStorage: UnAuthorized Minter");
  });
  it("Should Success, mint 1 Puppy to acc0", async function () {
    account = accounts[0]
    await mintPuppy(account, 1);
    expect(
      await puppyStorage
        .connect(account)
        .balanceOf(account.address)
    ).to.be.eq(1);
  });
  it("Should Success, Puppy Share Prize", async function () {
    //console.log("account_0 : " + accounts[0].address);
    //console.log("account_1 : " + accounts[1].address);
    await mintPuppy(accounts[0], 256);
    await mintPuppy(accounts[1], 256);
    await mintPuppy(accounts[1], 256);

    for (i = 0; i < 256; i++) {
      winner_sharer = await puppyStorage.getTicketSharingAddress(i);
      expect(winner_sharer.length).eq(3);
      expect(winner_sharer[0]).eq(accounts[0].address);
      expect(winner_sharer[1]).eq(accounts[1].address);
      expect(winner_sharer[2]).eq(accounts[1].address);

      // Revese Check Pack 0
      pack_and_number = await puppyStorage.getPackAndNumber(0 + i);
      expect(pack_and_number[0]).eq(0);
      expect(pack_and_number[1]).eq(i);
      // Revese Check Pack 1
      pack_and_number = await puppyStorage.getPackAndNumber(256 + i);
      expect(pack_and_number[0]).eq(1);
      expect(pack_and_number[1]).eq(i);
      // Revese Check Pack 2
      pack_and_number = await puppyStorage.getPackAndNumber(512 + i);
      expect(pack_and_number[0]).eq(2);
      expect(pack_and_number[1]).eq(i);
    }

    await mintPuppy(accounts[2], 1);
    winner_sharer = await puppyStorage.getTicketSharingAddress(0);
    expect(winner_sharer.length).eq(4);
    expect(winner_sharer[3]).eq(accounts[2].address);

    // pack_and_number = await puppyStorage.getPackAndNumber(767);
    // console.log(pack_and_number);

  });


  it("Should Error, token 771 is not exist", async function () {
    ticketNumber = 771;
    await expect(
      puppyStorage.tokenURI(ticketNumber)
    ).to.be.revertedWith("PuppyStorage: ERC721URIStorage: URI query for nonexistent token");
  });

  it("Should Success, token 0 - get Information", async function () {
    await mintPuppy(accounts[2], 1);
    ticketNumber = 0;
    resultArray = await puppyStorage.getTokenInformation(ticketNumber);
    expect(resultArray._seasonNumber).eq(1)
    expect(resultArray._ticketType).eq(2)
    expect(resultArray._pack).eq(0)
    expect(resultArray._ticketNumber).eq(0)
    // console.log("resultArray._seasonNumber: " + resultArray._seasonNumber);
    // console.log("resultArray._ticketType: " + resultArray._ticketType);
    // console.log("resultArray._pack: " + resultArray._pack);
    // console.log("resultArray._ticketNumber: " + resultArray._ticketNumber);
  });


  const mintPuppy = async (account, quantity) => {
    for (i = 0; i < quantity; i++) {
      if (
        i % 100 == 0 ||
        i % 256 == 255
        // 1 == 1
      ) {
        res_counter = await puppyStorage.puppyCounter();
        const leadingZeroString = "00000000000000" + i;
        console.log(
          "mint progress : " +
          leadingZeroString.substring(leadingZeroString.length - 3) +
          " | " +
          "currentPack: " +
          res_counter["currentPack"] +
          ", nextTicketNumber: " +
          res_counter["nextTicketNumber"]
        );
      }
      await puppyStorage.mint(account.address);
    }
  }

});

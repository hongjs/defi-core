// Load dependencies
const {expect} = require("chai");
const {default: BigNumber} = require("bignumber.js");

describe("GodfatherStorage", function () {
    beforeEach(async function () {
        // Deploy Contract
        GodfatherStorage = await ethers.getContractFactory("GodfatherStorage");
        godfatherStorage = await GodfatherStorage.deploy();
        //console.log("GodfatherStorage Address: " + godfatherStorage.address);
        // get Accounts Signers Array
        [owner, ...accounts] = await hre.ethers.getSigners();
        // for (i = 0; i < 20; i++) {
        //   console.log("Acc" + i + " : " + accounts[i].address);
        // }
        await godfatherStorage.addCanMint(owner.address);
    });

    // it("Mint Exceed UpperBound Test", async function () {
    //   // Change getMinValue to ===>  return [uint256(10485758), 16777212, 0, 0, 0, 0];

    //   // Common : Cannot Test Due to Random

    //   // UnCommon
    //   console.log("A")
    //   await expect(godfatherStorage.bulkMint(owner.address, 1, 3)).to.be.revertedWith("GodfatherStorage: Cannot Exceed Max Value");
    //   console.log("B")
    //   await godfatherStorage.bulkMint(owner.address, 1, 2);
    //   console.log("C")
    //   await expect(godfatherStorage.bulkMint(owner.address, 1, 1)).to.be.revertedWith("GodfatherStorage: Cannot Exceed Max Value");
    //   await printTokenOwnedBy(owner)

    // });

    // it("Important Note : Should Check Godfather Start Sequence Everytime Season I = 6291456.", async function () {
    //   console.log("")
    //   expect(1).eq(0)
    // });

    it("Should error, minted by unautorized user.", async function () {
        await expect(godfatherStorage.connect(accounts[0]).bulkMint(owner.address, 0, 4)).to.be.revertedWith(
            "GodfatherStorage: UnAuthorizeds Minter"
        );
    });

    it("Should Succes, Mint Rarity : Common x 16", async function () {
        await godfatherStorage.bulkMint(owner.address, 0, 16);
        //await printTokenOwnedBy(owner);
    });

    it("Should Succes, Mint Rarity : UnCommon x 16", async function () {
        await godfatherStorage.bulkMint(owner.address, 1, 16);
        //await printTokenOwnedBy(owner);
    });

    it("Should Failed, Mint Rarity : Rare x 16 (Unsupport in This Season)", async function () {
        await expect(godfatherStorage.connect(owner).bulkMint(owner.address, 2, 16)).to.be.revertedWith(
            "GodfatherStorage: Unsupported Rarity"
        );
    });
    it("Should Failed, Mint Rarity : SR x 16 (Unsupport in This Season)", async function () {
        await expect(godfatherStorage.connect(owner).bulkMint(owner.address, 3, 16)).to.be.revertedWith(
            "GodfatherStorage: Unsupported Rarity"
        );
    });
    it("Should Failed, Mint Rarity : SSR x 16 (Unsupport in This Season)", async function () {
        await expect(godfatherStorage.connect(owner).bulkMint(owner.address, 4, 16)).to.be.revertedWith(
            "GodfatherStorage: Unsupported Rarity"
        );
    });

    it("Should Failed, Mint Rarity : Legendary x 16 (Unsupport in This Season)", async function () {
        await expect(godfatherStorage.connect(owner).bulkMint(owner.address, 5, 16)).to.be.revertedWith(
            "GodfatherStorage: Unsupported Rarity"
        );
        //await printTokenOwnedBy(owner);
    });

    it("Should Falied, Mint Rarity : Unknown Rarity x 16", async function () {
        await expect(godfatherStorage.connect(owner).bulkMint(owner.address, 6, 16)).to.be.reverted;
    });

    it("Should Success, BaseTicket Validation : Common", async function () {
        await baseTicketValidation(owner, 0);
    });
    it("Should Success, BaseTicket Validation : UnCommon", async function () {
        await baseTicketValidation(owner, 1);
    });
});

const baseTicketValidation = async (account, rarity) => {
    const toCheckTokenSlotNumber = 0;
    await godfatherStorage.connect(account).bulkMint(account.address, rarity, 1);
    const tokenIndex = parseInt(
        await godfatherStorage.connect(account).tokenOfOwnerByIndex(account.address, toCheckTokenSlotNumber)
    );
    //await printTokenOwnedBy(account);
    const rarityValue = parseInt(await godfatherStorage.connect(account).getRarityValue(tokenIndex));

    // Minus1 Check , Should Error If baseTicket is Equal
    if (tokenIndex > 0) {
        const baseTicketValue = parseInt(await godfatherStorage.connect(account).getBaseTicket(tokenIndex));
        const baseTicketValueMinus1 = parseInt(await godfatherStorage.connect(account).getBaseTicket(tokenIndex - 1));
        //console.log("LOW  | ticketNumber: "+(tokenIndex-1)+" ,getBaseTicket: "+baseTicketValueMinus1+", rarityValue : "+rarityValue);
        if (baseTicketValue == baseTicketValueMinus1) {
            throw (
                "Ticket Validation Failed, (baseTicketValue == baseTicketValueMinus1) => (" +
                tokenIndex +
                "/" +
                baseTicketValue +
                " == " +
                (tokenIndex - 1) +
                "/" +
                baseTicketValueMinus1 +
                ")"
            );
        }
    }

    // Middle Check
    for (let i = 0; i < rarityValue; i++) {
        const baseTicketValue = parseInt(await godfatherStorage.connect(account).getBaseTicket(tokenIndex + i));
        //console.log("MID  | ticketNumber: "+(tokenIndex+i)+" ,getBaseTicket: "+baseTicketValue+", rarityValue : "+rarityValue);
        if (tokenIndex != baseTicketValue) {
            throw (
                "Ticket Validation Failed, (baseTicket != tokenIndex+rarity) => (" +
                baseTicketValue +
                " != " +
                tokenIndex +
                " + " +
                rarityValue +
                ")"
            );
        }
    }

    // Plus1 Check , Should Error If baseTicket is Equal
    if (tokenIndex < 16777216) {
        const baseTicketValue = parseInt(await godfatherStorage.connect(account).getBaseTicket(tokenIndex));
        const baseTicketValuePlus1 = parseInt(
            await godfatherStorage.connect(account).getBaseTicket(tokenIndex + rarityValue)
        );
        //console.log("HIGH | ticketNumber: "+(tokenIndex+rarityValue)+" ,getBaseTicket: "+baseTicketValuePlus1+", rarityValue : "+rarityValue);
        if (baseTicketValue == baseTicketValuePlus1) {
            throw (
                "Ticket Validation Failed, (baseTicketValue == baseTicketValuePlus1) => (" +
                tokenIndex +
                "/" +
                baseTicketValue +
                " == " +
                (tokenIndex + rarityValue) +
                "/" +
                baseTicketValuePlus1 +
                ")"
            );
        }
    }
};

const printTokenOwnedBy = async (account) => {
    const accountTotalSupply = await godfatherStorage.connect(account).balanceOf(account.address);
    console.log("==== address: " + account.address + ", ownerAccountTotalSupply: " + accountTotalSupply);
    for (let i = 0; i < accountTotalSupply; i++) {
        const tokenIndex = await godfatherStorage.connect(account).tokenOfOwnerByIndex(account.address, i);
        const tokenURI = await godfatherStorage.connect(account).tokenURI(tokenIndex);
        const leadingZeroString = "0000000000" + tokenIndex;
        console.log(leadingZeroString.substring(leadingZeroString.length - 8) + " | " + tokenURI);
    }
};

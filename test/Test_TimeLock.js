// Load dependencies
// Test
const {expect} = require("chai");
const {default: BigNumber} = require("bignumber.js");

const masterChefABI = require("../artifacts/contracts/DefiMasterChef.sol/DefiMasterChef.json");
const timelockABI = require("../artifacts/contracts/libraries/TimeLock.sol/Timelock.json");
const {callTimelockFunction, getCurrentTimeStamp} = require("../utils/timelockUtil.js");

describe("Defi TimeLock Test", function () {
    beforeEach(async function () {
        [owner, feeCollector, user1, ...accounts] = await hre.ethers.getSigners();

        DefiToken = await ethers.getContractFactory("DefiToken");
        defi = await DefiToken.deploy();
        await defi.deployed();

        KennelClub = await ethers.getContractFactory("KennelClub");
        kennelClub = await KennelClub.deploy(defi.address);
        await kennelClub.deployed();

        DefiMasterChef = await ethers.getContractFactory("DefiMasterChef");
        masterChef = await DefiMasterChef.deploy(
            defi.address,
            kennelClub.address,
            owner.address,
            feeCollector.address,
            ethers.utils.parseEther("3"),
            0
        );
        await masterChef.deployed();

        _1DAY = 1 * 24 * 60 * 60;
        Timelock = await ethers.getContractFactory("Timelock");
        timelock = await Timelock.deploy(owner.address, _1DAY);

        await masterChef.transferOwnership(timelock.address);
        await timelock.connect(owner).setPendingAdmin(owner.address);
        await timelock.connect(owner).acceptAdmin();
    });

    it("Should Fail, Owner Cannot Change Admin Again", async function () {
        await expect(timelock.connect(owner).setPendingAdmin(owner.address)).to.be.revertedWith(
            "Timelock::setPendingAdmin: Call must come from Timelock."
        );
        await expect(timelock.connect(owner).acceptAdmin()).to.be.revertedWith(
            "Timelock::acceptAdmin: Call must come from pendingAdmin."
        );
    });

    it("Should Fail, previous Owner cannot execute onlyOwner Function anymore.", async function () {
        await expect(masterChef.connect(owner).updateFeeCollector(user1.address)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });

    it("Should fail, updateFeeCollector", async function () {
        const req = {
            target: masterChef.address,
            value: 0,
            signature: "updateFeeCollector(address)",
            data: [user1.address],
            eta: (await getCurrentTimeStamp()) + _1DAY + 1,
        };

        await expect(callTimelockFunction(req, masterChefABI.abi, owner, 15 * _1DAY)).to.be.revertedWith(
            "Timelock::executeTransaction: Transaction is stale."
        );
    });

    it("Should success, updateFeeCollector", async function () {
        const req = {
            target: masterChef.address,
            value: 0,
            signature: "updateFeeCollector(address)",
            data: [user1.address],
            eta: (await getCurrentTimeStamp()) + _1DAY + 1,
        };

        await callTimelockFunction(req, masterChefABI.abi);

        const newFeeCollectorAddr = await masterChef.feeCollectorAddr();
        expect(newFeeCollectorAddr).to.eq(user1.address);
    });

    it("Should success, update defiPerBlock", async function () {
        const req = {
            target: masterChef.address,
            value: 0,
            signature: "updateDefiPerBlock(uint256)",
            data: [ethers.utils.parseEther("30")],
            eta: (await getCurrentTimeStamp()) + _1DAY + 1,
        };

        await callTimelockFunction(req, masterChefABI.abi);

        const defiPerBlock = await masterChef.defiPerBlock();
        expect(defiPerBlock).to.eq(ethers.utils.parseEther("30"));
    });

    it("Should success, update MinimumDefi", async function () {
        const req = {
            target: masterChef.address,
            value: 0,
            signature: "updateMinimumDefi(uint256)",
            data: [ethers.utils.parseEther("1000")],
            eta: (await getCurrentTimeStamp()) + _1DAY + 1,
        };

        await callTimelockFunction(req, masterChefABI.abi);

        const minimumDefi = await masterChef.minimumDefi();
        expect(minimumDefi).to.eq(ethers.utils.parseEther("1000"));
    });

    it("Should success, update Multiplier", async function () {
        const req = {
            target: masterChef.address,
            value: 0,
            signature: "updateMultiplier(uint256)",
            data: [2],
            eta: (await getCurrentTimeStamp()) + _1DAY + 1,
        };

        await callTimelockFunction(req, masterChefABI.abi);

        const BONUS_MULTIPLIER = await masterChef.BONUS_MULTIPLIER();
        expect(BONUS_MULTIPLIER).to.eq(2);
    });

    it("Should success, add new LP", async function () {
        const pool1Length = await masterChef.poolLength();
        expect(pool1Length).to.eq("1");

        const BEP40Token = await ethers.getContractFactory("BEP40Token");
        const lpToken = await BEP40Token.deploy("LP Token", "LP Token");
        await lpToken.deployed();

        const req = {
            target: masterChef.address,
            value: 0,
            signature: "add(uint256,address,uint256,uint256)",
            data: [4000, lpToken.address, 50, 200],
            eta: (await getCurrentTimeStamp()) + _1DAY + 1,
        };

        await callTimelockFunction(req, masterChefABI.abi);

        const pool2Length = await masterChef.poolLength();
        expect(pool2Length).to.eq("2");

        const pool = await masterChef.poolInfo(1);
        expect(pool.lpToken).to.eq(lpToken.address);
        expect(pool.minDepositFeeRate).to.eq(50);
        expect(pool.maxDepositFeeRate).to.eq(200);
        expect(pool.enabled).to.eq(true);
    });

    it("Should success, update LP info", async function () {
        const req = {
            target: masterChef.address,
            value: 0,
            signature: "set(uint256,uint256,uint256,uint256,bool)",
            data: [0, 100, 200, 300, false],
            eta: (await getCurrentTimeStamp()) + _1DAY + 1,
        };

        await callTimelockFunction(req, masterChefABI.abi);

        const pool = await masterChef.poolInfo(0);
        expect(pool.allocPoint).to.eq("100");
        expect(pool.minDepositFeeRate).to.eq("200");
        expect(pool.maxDepositFeeRate).to.eq("300");
        expect(pool.enabled).to.eq(false);
    });

    it("Should success, transfer Ownership back to original owner", async function () {
        const owner1 = await masterChef.owner();
        expect(owner1).to.eq(timelock.address);

        const req = {
            target: masterChef.address,
            value: 0,
            signature: "transferOwnership(address)",
            data: [owner.address],
            eta: (await getCurrentTimeStamp()) + _1DAY + 1,
        };

        await callTimelockFunction(req, masterChefABI.abi);

        const owner2 = await masterChef.owner();
        expect(owner2).to.eq(owner.address);
    });

    it("Should success, update dev address without timelock", async function () {
        await masterChef.dev(user1.address);
        const devAddr = await masterChef.devAddr();
        expect(devAddr).to.eq(user1.address);
    });

    it("Should fail, update setDelay directly", async function () {
        await expect(timelock.setDelay(2 * _1DAY)).to.be.revertedWith(
            "Timelock::setDelay: Call must come from Timelock."
        );
    });

    it("Should fail, set new Delay less than MINIMUM_DELAY", async function () {
        // Construct Message
        const req = {
            target: timelock.address,
            value: 0,
            signature: "setDelay(uint256)",
            data: [1 * 60 * 60],
            eta: (await getCurrentTimeStamp()) + _1DAY + 1,
        };

        await expect(callTimelockFunction(req, timelockABI.abi)).to.be.revertedWith(
            "Timelock::setDelay: Delay must exceed minimum delay."
        );
    });

    it("Should fail, set new Delay less than MAXIMUM_DELAY", async function () {
        // Construct Message
        const req = {
            target: timelock.address,
            value: 0,
            signature: "setDelay(uint256)",
            data: [31 * _1DAY],
            eta: (await getCurrentTimeStamp()) + _1DAY + 1,
        };

        await expect(callTimelockFunction(req, timelockABI.abi)).to.be.revertedWith(
            "Timelock::setDelay: Delay must not exceed maximum delay."
        );
    });

    it("Should Success, set new Delay", async function () {
        const timestampBefore = await getCurrentTimeStamp();

        const contract_delay = await timelock.connect(owner).delay();
        expect(contract_delay).to.eq(_1DAY);

        // Construct Message
        const req = {
            target: timelock.address,
            value: 0,
            signature: "setDelay(uint256)",
            data: [2 * _1DAY],
            eta: timestampBefore + _1DAY + 1,
        };

        const {queueData, executeData} = await callTimelockFunction(req, timelockABI.abi);

        const newDelay = await timelock.connect(owner).delay();
        expect(newDelay).to.eq(2 * _1DAY);
    });

    it("Should Success, Transfer Pending Admin to user1 and execute onlyAdmin function", async function () {
        const timestampBefore = await getCurrentTimeStamp();

        // Construct Message
        const req = {
            target: timelock.address,
            value: 0,
            signature: "setPendingAdmin(address)",
            data: [user1.address],
            eta: timestampBefore + _1DAY + 20,
        };
        await callTimelockFunction(req, timelockABI.abi);

        await timelock.connect(user1).acceptAdmin();

        // ==== new Account Execute =========================================================
        const timestampBefore2 = await getCurrentTimeStamp();

        const req2 = {
            target: masterChef.address,
            value: 0,
            signature: "updateFeeCollector(address)",
            data: [user1.address],
            eta: timestampBefore2 + _1DAY + 20,
        };

        await callTimelockFunction(req2, masterChefABI.abi, user1);
    });
});

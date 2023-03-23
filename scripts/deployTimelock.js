const {ethers} = require("hardhat");
const {
    getFunctionSignatureCallData,
    getAbiEncodedWithSignature,
    getCurrentTimeStamp,
} = require("../utils/timelockUtil.js");

var MasterChefABI = require("../artifacts/contracts/DefiMasterChef.sol/DefiMasterChef.json");
var TimelockABI = require("../artifacts/contracts/libraries/TimeLock.sol/Timelock.json");

async function main() {
    const [owner] = await ethers.getSigners();

    const timelockAddress = "0xe355bBb2eBc9986B16A42A8748c729Ee849BAf8f";
    const _1DAY = 1 * 24 * 60 * 60;

    /******* Test Call Timelock Contract *******/
    const masterchef = "0x5D21D02378670119453530478288AEe67b807e2a";
    Timelock = await ethers.getContractFactory("Timelock");
    timelock = await Timelock.attach(timelockAddress);

    // const req = {
    //     target: masterchef,
    //     value: 0,
    //     signature: "set(uint256,uint256,uint256,uint256,bool)",
    //     data: [3, 0, 80, 200, false],
    //     // eta: (await getCurrentTimeStamp()) + _1DAY + 20,
    //     eta: 1651674171,
    // };

    // const req = {
    //     target: masterchef,
    //     value: 0,
    //     signature: "set(uint256,uint256,uint256,uint256,bool)",
    //     data: [4, 0, 80, 200, false],
    //     // eta: (await getCurrentTimeStamp()) + _1DAY + 20,
    //     eta: 1651674426,
    // };

    const req = {
        target: masterchef,
        value: 0,
        signature: "set(uint256,uint256,uint256,uint256,bool)",
        data: [5, 0, 80, 200, false],
        // eta: (await getCurrentTimeStamp()) + _1DAY + 20,
        eta: 1651674486,
    };

    const {signatureHex, callDataHex} = getFunctionSignatureCallData(MasterChefABI.abi, req.signature, req.data);
    console.log(owner.address, callDataHex, req);

    // // QUEUE
    // const queueTx = await timelock
    //     .connect(owner)
    //     .queueTransaction(req.target, req.value, req.signature, ethers.utils.arrayify(callDataHex), req.eta);

    // EXECUTE;
    const executeData = await timelock
        .connect(owner)
        .executeTransaction(req.target, req.value, req.signature, ethers.utils.arrayify(callDataHex), req.eta);

    // CANCEL CANCEL CANCEL CANCEL
    // const queueTx = await timelock
    //     .connect(owner)
    //     .cancelTransaction(req.target, req.value, req.signature, ethers.utils.arrayify(callDataHex), req.eta);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

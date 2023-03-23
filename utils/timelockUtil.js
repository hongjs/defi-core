const getAbiEncodedWithSignature = (ABI, functionName, functionParameter) => {
    // Mint
    let iface = new ethers.utils.Interface(ABI);
    // iface.functions.transfer.encode(["0x1234567890123456789012345678901234567890", ethers.utils.parseEther("1.0")]);
    let abiEncodedWithSignature = iface.encodeFunctionData(functionName, functionParameter);
    // console.log(abiEncodedWithSignature);
    return abiEncodedWithSignature;
};

const getFunctionSignatureCallData = (ABI, functionName, functionParameter) => {
    let abiEncodedWithSignature = getAbiEncodedWithSignature(ABI, functionName, functionParameter);
    let array_length = ethers.utils.arrayify(abiEncodedWithSignature).length;
    let functionSignature = ethers.utils.arrayify(abiEncodedWithSignature).slice(0, 4);
    let callData = ethers.utils.arrayify(abiEncodedWithSignature).slice(4, array_length);
    // console.log(ethers.utils.arrayify(abiEncodedWithSignature).length);
    // console.log(functionSignature.length);
    // console.log(callData.length);
    let signatureHex = ethers.utils.hexlify(functionSignature);
    let callDataHex = ethers.utils.hexlify(callData);
    return {signatureHex, callDataHex};
};

const callTimelockFunction = async (req, abi, caller, timeIncrease) => {
    const {signatureHex, callDataHex} = getFunctionSignatureCallData(abi, req.signature, req.data);

    // QueueMessage
    const queueData = await timelock
        .connect(caller ? caller : owner)
        .queueTransaction(req.target, req.value, req.signature, ethers.utils.arrayify(callDataHex), req.eta);

    // Time increased by Thanos
    await ethers.provider.send("evm_mine");
    await ethers.provider.send("evm_increaseTime", [timeIncrease ? timeIncrease : _1DAY + 20]);
    await ethers.provider.send("evm_mine");

    // Execute
    const executeData = await timelock
        .connect(caller ? caller : owner)
        .executeTransaction(req.target, req.value, req.signature, ethers.utils.arrayify(callDataHex), req.eta);

    return {queueData, executeData, signatureHex, callDataHex};
};

const getCurrentTimeStamp = async () => {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    return blockBefore.timestamp;
};

module.exports.getCurrentTimeStamp = getCurrentTimeStamp;
module.exports.callTimelockFunction = callTimelockFunction;
module.exports.getFunctionSignatureCallData = getFunctionSignatureCallData;
module.exports.getAbiEncodedWithSignature = getAbiEncodedWithSignature;

npx hardhat run scripts/lotto/deployTestNetOnly_ChainLinkVRFConsumer.js --network testnet
ChainLink Testnet Fee : 100000000000000000
owner: 0x18C4e4Aa859D459F2BDA187e20C582ac0e6D134d
defiChainlinkVRFConsumer deployed to: 0xEBD019886641d2e6F7ad521BE1A17251923E6067


### Query on Test Net

npx hardhat run scripts/lotto/queryTestNetOnly_ChainLinkVRFConsumer.js --network testnet

### Trasnfer 0.1 LInk to Contract Before Award

GET LINK Faucet From = https://linkfaucet.protofire.io/bsctest

### Query Log

npx hardhat console --network testnet

```
DefiChainlinkVRFConsumer = await ethers.getContractFactory("DefiChainlinkVRFConsumer");
defiChainlinkVRFConsumer = await DefiChainlinkVRFConsumer.attach("0xEBD019886641d2e6F7ad521BE1A17251923E6067");
log = await defiChainlinkVRFConsumer.queryFilter(defiChainlinkVRFConsumer.filters.AwardResponse())
let arrayLength = log.length;
for (let i = 0; i < arrayLength; i++) {
	if ( i== 0 ){
		console.log("round , requestId                                                         , randomResult")
	}
    console.log(log[i].args["round"]._hex+", "+log[i].args["requestId"]+", "+log[i].args["randomResult"]._hex);
}
```

### Award Winner , Fee 0.1 LINK

```
DefiChainlinkVRFConsumer = await ethers.getContractFactory("DefiChainlinkVRFConsumer");
defiChainlinkVRFConsumer = await DefiChainlinkVRFConsumer.attach("0xEBD019886641d2e6F7ad521BE1A17251923E6067");
let currentRound=await defiChainlinkVRFConsumer.currentRound();
let currentAwardRound=await defiChainlinkVRFConsumer.currentAwardRound();
console.log("currentRound: "+currentRound+" , currentAwardRound: "+currentAwardRound);
await defiChainlinkVRFConsumer.awardWinnerByChainLink();
console.log("Award Winner by Chain Link, please wait about 3-5 min");
currentRound=await defiChainlinkVRFConsumer.currentRound();
currentAwardRound=await defiChainlinkVRFConsumer.currentAwardRound();
console.log("currentRound: "+currentRound+" , currentAwardRound: "+currentAwardRound);
```

### Check Room 1

```
DefiChainlinkVRFConsumer = await ethers.getContractFactory("DefiChainlinkVRFConsumer");
defiChainlinkVRFConsumer = await DefiChainlinkVRFConsumer.attach("0xEBD019886641d2e6F7ad521BE1A17251923E6067");
let round=0
await defiChainlinkVRFConsumer.randomResultByRound(round);
await defiChainlinkVRFConsumer.getWinnerByRound(round,6);
await defiChainlinkVRFConsumer.getWinnerByRound(round,5);
await defiChainlinkVRFConsumer.getWinnerByRound(round,4);
await defiChainlinkVRFConsumer.getWinnerByRound(round,3);
await defiChainlinkVRFConsumer.getWinnerByRound(round,2);
await defiChainlinkVRFConsumer.getWinnerByRound(round,1);
```

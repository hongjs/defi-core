#!/bin/bash

export mintPuppyGameAddress='0xf913Ec7d3A2179b7bc46b20a1a0922f861fCEA89';
export puppyStorageAddress='0xa25644d845cdc4D2e05420C787eeDf0F38Edc60f';
export defiTokenAddress='0xb64E0710e59ea2A08E65EB2496973F27e818664c';
export busdTokenAddress='0xaB3F4ebABFd6898452543454AAE908Df71658801';

npx hardhat verify --network testnet "${mintPuppyGameAddress}" "${puppyStorageAddress}" "${defiTokenAddress}" "${busdTokenAddress}" 
# npx hardhat verify --network testnet "${godfatherLottoCheckAddress}" "${defiLottoAwardAddress}" "${GodfatherStorageAddress}" "${DefiAddress}"
# npx hardhat verify --network testnet "${puppyLottoCheckAddress}" "${defiLottoAwardAddress}" "${PuppyStorageAddress}" "${DefiAddress}"
# npx hardhat verify --network testnet "${moyLottoCheckAddress}" "${defiLottoAwardAddress}" "${PuppyStorageAddress}" "${DefiAddress}"

# npx hardhat verify --network mainnet "${defiLottoAwardAddress}" "${vrfCoordinator}" "${linkTokenAddress}" "${keyHash}" "${chainLinkFee}" "${GodfatherStorageAddress}" "${PuppyStorageAddress}"



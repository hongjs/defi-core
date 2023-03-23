#!/bin/bash
export chainLinkFee='200000000000000000';
export linkTokenAddress="0x404460C6A5EdE2D891e8297795264fDe62ADBB75";
export vrfCoordinator="0x747973a5A2a4Ae1D3a8fDF5479f1514F65Db9C31";
export keyHash="0xc251acd21ec4fb7f31bb8868288bfdbaeb4fbfec2df3735ddbd4f7dc8d60103c";


export defiLottoAwardAddress='0xcA8316F147B2fC0BB362984884EaDdbf0cDccae1';
export godfatherLottoCheckAddress='0xbA207E6aAB7ee6bfd995723A068aF5AF542efd63'
export puppyLottoCheckAddress='0x04dC8C8D35A521451bdcEE53786ca603BF133FA4';
export moyLottoCheckAddress='0x1e9716eE9B5EF89bA1FcA2a34b701316643E8096';
export GodfatherStorageAddress='0x1ff7F3FeFc10DdF3D827bd8Df109a0885f542114';
export PuppyStorageAddress='0x6515CF06686F8Eed508b880C8e5E8e9Cf9c6b686';
export DefiAddress='0xBdb44DF0A914c290DFD84c1eaf5899d285717fdc';



# npx hardhat verify --network testnet "${defiLottoAwardAddress}" "${vrfCoordinator}" "${linkTokenAddress}" "${keyHash}" "${chainLinkFee}" "${GodfatherStorageAddress}" "${PuppyStorageAddress}"
# npx hardhat verify --network testnet "${godfatherLottoCheckAddress}" "${defiLottoAwardAddress}" "${GodfatherStorageAddress}" "${DefiAddress}"
# npx hardhat verify --network testnet "${puppyLottoCheckAddress}" "${defiLottoAwardAddress}" "${PuppyStorageAddress}" "${DefiAddress}"
# npx hardhat verify --network testnet "${moyLottoCheckAddress}" "${defiLottoAwardAddress}" "${PuppyStorageAddress}" "${DefiAddress}"

npx hardhat verify --network mainnet "${defiLottoAwardAddress}" "${vrfCoordinator}" "${linkTokenAddress}" "${keyHash}" "${chainLinkFee}" "${GodfatherStorageAddress}" "${PuppyStorageAddress}"
npx hardhat verify --network mainnet "${godfatherLottoCheckAddress}" "${defiLottoAwardAddress}" "${GodfatherStorageAddress}" "${DefiAddress}"
npx hardhat verify --network mainnet "${puppyLottoCheckAddress}" "${defiLottoAwardAddress}" "${PuppyStorageAddress}" "${DefiAddress}"
npx hardhat verify --network mainnet "${moyLottoCheckAddress}" "${defiLottoAwardAddress}" "${PuppyStorageAddress}" "${DefiAddress}"



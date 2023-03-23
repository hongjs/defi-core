#!/bin/bash

export mintPuppyGameAddress='--- main net contract address----------------------';
export puppyStorageAddress='0x6515CF06686F8Eed508b880C8e5E8e9Cf9c6b686';
export defiTokenAddress='0xBdb44DF0A914c290DFD84c1eaf5899d285717fdc';
export busdTokenAddress='0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';

# npx hardhat verify --network testnet "${mintPuppyGameAddress}" "${puppyStorageAddress}" "${defiTokenAddress}" "${busdTokenAddress}" 
npx hardhat verify --network mainnet "${mintPuppyGameAddress}" "${puppyStorageAddress}" "${defiTokenAddress}" "${busdTokenAddress}" 

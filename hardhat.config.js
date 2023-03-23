require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");

// require("hardhat-gas-reporter");
// require("solidity-coverage");

const {PRIVATE_KEY_TESTNET, PRIVATE_KEY_MAINNET, ETHERSCAN_API_KEY} = process.env;

// https://hardhat.org/tutorial/
module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.9",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000,
                    },
                },
            },
        ],
    },
    networks: {
        testnet: {
            url: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
            accounts: [PRIVATE_KEY_TESTNET],
            gas: 7000000,
        },
        mainnet: {
            url: `https://bsc-dataseed1.defibit.io/`,
            accounts: [PRIVATE_KEY_MAINNET],
            gas: 9000000,
        },
    },
    // https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
};

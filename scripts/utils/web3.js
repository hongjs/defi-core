const Web3 = require("web3");

const RPC_URL = "https://bsc-dataseed.binance.org";
const httpProvider = new Web3.providers.HttpProvider(RPC_URL, {timeout: 10000});

const getWeb3 = () => {
    const web3 = new Web3(httpProvider);
    return web3;
};

module.exports.getWeb3 = getWeb3;
module.exports.httpProvider = httpProvider;

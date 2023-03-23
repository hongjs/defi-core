const {ethers} = require("hardhat");
const {default: BigNumber} = require("bignumber.js");
const {multicall} = require("../utils/multicall");
const calc = require("../utils/calc");
const erc20ABI = require("../abi/erc20.json");
const vaultABI = require("../abi/vaultLP.json");
const strategyABI = require("../abi/vaultStrategy.json");
const kswStrategyABI = require("../abi/kswStrategy.json");
const bswMasterChefABI = require("../abi/bswMasterChef.json");
const babyMasterChefABI = require("../abi/babyMasterChef.json");
const kswMasterchefABI = require("../abi/kswMasterchef.json");
const defiMasterChefABI = require("../abi/defiMasterChef.json");
const lpABI = require("../abi/pancakePair.json");
const kswIzludeABI = require("../abi/kswIzlude.json");
const defiByalanABI = require("../abi/defiByalan.json");

const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const busd = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
const usdt = "0x55d398326f99059fF775485246999027B3197955";

async function main() {
    [owner] = await ethers.getSigners();

    const bnbPrice = await getBNBPrice();

    const raffleAddress = "0xcF586d88EcA628d2F62791352Fb36DBDA3B0514e";
    const token = {
        BUSD: "BUSD",
        USDT: "USDT",
        BNB: "BNB",
    };

    const platform = {
        biswap: {
            platform: "BISWAP",
            rewardPerBlock: "BSWPerBlock",
            rewardTokenPriceLP: "0xB22Bc4DB1DCd0B45680b4D831F8C06CFf50Ee4D6",
            quoteTokenOfRewardLP: token.BUSD,
        },
        // babyswap: {
        //     platform: "BABYSWAP",
        //     rewardTokenPriceLP: "0x36aE10A4d16311959b607eE98Bc4a8A653A33b1F",
        //     quoteTokenOfRewardLP: token.BNB,
        //     rewardPerBlock: "cakePerBlock",
        // },
        killswitch: {
            platform: "KILLSWITCH",
            rewardTokenPriceLP: "0x2be28Dbf88DaFD390b4A07f5DD1FC80244AA84C6",
            quoteTokenOfRewardLP: token.BNB,
            rewardPerBlock: "kswPerSecond",
        },
        defi: {
            platform: "DEFI",
            rewardTokenPriceLP: "0x0c48e28Ce5D06D13DD790D7568b06498aEEC48b5",
            quoteTokenOfRewardLP: token.BUSD,
            rewardPerBlock: "defiPerBlock",
        },
    };

    const mainnetVaults = [
        {
            ...platform.biswap,
            symbol: "BiSwap x BNB-BUSD",
            vault: "0xa8E648AC383F29b536343E174156328faeA83f57",
        },
        {
            ...platform.biswap,
            symbol: "BiSwap x AVAX-BNB",
            vault: "0x34e1665aaF0A31B34c1316F0D93816a92E26a210",
        },
        {
            ...platform.biswap,
            symbol: "BiSwap x USDT-BUSD",
            vault: "0x06B550AA18266a17B4c9A541E5FDb3A40a561Fe6",
        },
        {
            ...platform.biswap,
            symbol: "BiSwap x GALA-BNB",
            vault: "0x0e229A28772347dD86D7b4f04d23b16126ee7343",
        },
        {
            ...platform.biswap,
            symbol: "BiSwap x MATIC-BNB",
            vault: "0x6434ed4bE521B6CD1c79469baFA21B60276ae1F9",
        },
        {
            ...platform.killswitch,
            symbol: "KillSwitch x DEFI",
            vault: "0xE03c88742Bfe833CcE16f5eB069eA8F1B52327fE",
            defi: platform.defi,
        },
    ];

    await getAPY(mainnetVaults, bnbPrice);
}

const getAPY = async (vaults, bnbPrice) => {
    for (const i of vaults) {
        try {
            const [strategy, want] = await getVaultInfo(i.vault);

            if (i.platform === "KILLSWITCH") {
                const [masterchef, izlude] = await getStrategyInfo(i, strategy);
                const [kswPerYear, defiPerYear, depositedDefi] = await getKswMasterChefInfo(
                    i,
                    masterchef,
                    want,
                    izlude,
                    strategy,
                    bnbPrice
                );
                const kswPriceUSD = await getRewardTokenPrice(i.quoteTokenOfRewardLP, i.rewardTokenPriceLP, bnbPrice);
                const defiPriceUSD = await getRewardTokenPrice(
                    i.defi.quoteTokenOfRewardLP,
                    i.defi.rewardTokenPriceLP,
                    bnbPrice
                );

                const rewardPerYear = new BigNumber(kswPerYear)
                    .times(kswPriceUSD)
                    .plus(new BigNumber(defiPerYear).times(defiPriceUSD));
                const lpTVL = depositedDefi.div(1e18).times(defiPriceUSD);

                const apr = lpTVL.gt(0) ? rewardPerYear.times(100).div(lpTVL).toNumber() : 0;
                const apy = calc.calcAPY(apr, 365);
                console.log(`${i.symbol}: APR = ${Math.round(apr * 100) / 100}% APY = ${Math.round(apy * 100) / 100}%`);
                // console.log(rewardPerYear.toFixed(), lpTVL.toFixed());
            } else {
                const [masterchef, token0, token1, poolId] = await getStrategyInfo(i, strategy);
                const [rewardPerYear, lpTVL] = await getMasterChefInfo(
                    i,
                    masterchef,
                    want,
                    new BigNumber(poolId).toNumber(),
                    token0,
                    token1,
                    strategy,
                    bnbPrice
                );
                const rewardTokenPriceUSD = await getRewardTokenPrice(
                    i.quoteTokenOfRewardLP,
                    i.rewardTokenPriceLP,
                    bnbPrice
                );
                const apr = lpTVL.gt(0) ? rewardPerYear.times(rewardTokenPriceUSD).times(100).div(lpTVL).toNumber() : 0;
                const apy = calc.calcAPY(apr, 365);
                console.log(`${i.symbol}: APR = ${Math.round(apr * 100) / 100}% APY = ${Math.round(apy * 100) / 100}%`);

                // console.log(rewardPerYear.toFixed(), rewardTokenPriceUSD.toString(), lpTVL.toFixed());
            }
            // console.log("");
        } catch (ex) {
            console.log(i.symbol, ex);
        }
    }
};

const getRewardTokenPrice = async (quoteTokenOfRewardLP, rewardTokenPriceLP, bnbPrice) => {
    let quoteTokenAddress = null;
    switch (quoteTokenOfRewardLP) {
        case "BUSD":
            quoteTokenAddress = busd;
            break;
        case "USDT":
            quoteTokenAddress = usdt;
            break;
        case "BNB":
            quoteTokenAddress = wbnb;
            break;
    }

    const [_balance, _token0, _token1] = await multicall(lpABI, [
        {address: rewardTokenPriceLP, name: "balanceOf", params: [quoteTokenAddress]},
        {address: rewardTokenPriceLP, name: "token0"},
        {address: rewardTokenPriceLP, name: "token1"},
    ]);

    const tokenAddress = quoteTokenAddress === _token0.toString() ? _token1.toString() : _token0.toString();
    const [_quoteTokenBalanceOfLP, _tokenBalanceOfLP] = await multicall(erc20ABI, [
        {address: quoteTokenAddress, name: "balanceOf", params: [rewardTokenPriceLP]},
        {address: tokenAddress, name: "balanceOf", params: [rewardTokenPriceLP]},
    ]);

    if (["BNB", "WBNB"].includes(quoteTokenOfRewardLP)) {
        return new BigNumber(_quoteTokenBalanceOfLP).times(bnbPrice).div(new BigNumber(_tokenBalanceOfLP)).toNumber();
    } else {
        return new BigNumber(_quoteTokenBalanceOfLP).div(new BigNumber(_tokenBalanceOfLP)).toNumber();
    }
};

const getKswMasterChefInfo = async (vault, masterchef, want, izlude, strategy, bnbPrice) => {
    const [_kswPerSecond, _totalAllocPoint, _poolInfo] = await multicall(kswMasterchefABI, [
        {address: masterchef, name: "kswPerSecond"},
        {address: masterchef, name: "totalAllocPoint"},
        {address: masterchef, name: "poolInfo", params: [izlude]},
    ]);
    const kswPerSecond = new BigNumber(_kswPerSecond).div(1e18).toNumber();
    const allocPoint = new BigNumber(_poolInfo.allocPoint._hex).toNumber();
    const totalAllocPoint = new BigNumber(_totalAllocPoint).toNumber();

    const secondPerYear = 60 * 60 * 24 * 365;
    const poolWeight = allocPoint / totalAllocPoint;
    const kswPerYear = kswPerSecond * secondPerYear * poolWeight;

    const [_kswStrategy] = await multicall(kswIzludeABI, [{address: izlude, name: "byalan"}]);
    const [_finalMasterChef, _pid] = await multicall(defiByalanABI, [
        {address: _kswStrategy.toString(), name: "MASTERCHEF"},
        {address: _kswStrategy.toString(), name: "pid"},
    ]);
    const pid = new BigNumber(_pid).toNumber();
    const [_defiPerBlock, _totalAllocPoint2, _poolInfo2, _userInfo2] = await multicall(defiMasterChefABI, [
        {address: _finalMasterChef.toString(), name: "defiPerBlock"},
        {address: _finalMasterChef.toString(), name: "totalAllocPoint"},
        {address: _finalMasterChef.toString(), name: "poolInfo", params: [pid]},
        {address: _finalMasterChef.toString(), name: "userInfo", params: [pid, _kswStrategy.toString()]},
    ]);

    const [_wantInMasterChef] = await multicall(erc20ABI, [
        {address: want, name: "balanceOf", params: [_finalMasterChef.toString()]},
    ]);

    const defiPerBlock = new BigNumber(_defiPerBlock).div(1e18).toNumber();
    const allocPoint2 = new BigNumber(_poolInfo2.allocPoint._hex).toNumber();
    const totalAllocPoint2 = new BigNumber(_totalAllocPoint2).toNumber();
    const depositedDefi = new BigNumber(_wantInMasterChef);

    const poolWeight2 = allocPoint2 / totalAllocPoint2;
    const defiPerYear = defiPerBlock * (secondPerYear / 3) * poolWeight2;

    return [kswPerYear, defiPerYear, depositedDefi];
};

const getMasterChefInfo = async (vault, masterchef, want, pid, token0, token1, strategy, bnbPrice) => {
    let masterchefABI;
    switch (vault.platform) {
        case "BISWAP":
            masterchefABI = bswMasterChefABI;
            break;
        case "BABYSWAP":
            masterchefABI = babyMasterChefABI;
            break;
    }
    const [_wantBalance, _wantTotalSupply, _token0Symbol, _token1Symbol] = await multicall(erc20ABI, [
        {address: want, name: "balanceOf", params: [masterchef]},
        {address: want, name: "totalSupply"},
        {address: token0, name: "symbol"},
        {address: token1, name: "symbol"},
    ]);

    const wantBalanceOfMC = new BigNumber(_wantBalance);
    const wantTotalSupply = new BigNumber(_wantTotalSupply);
    const wantRatio = wantBalanceOfMC.div(wantTotalSupply);
    const token0Symbol = _token0Symbol.toString();
    const token1Symbol = _token1Symbol.toString();

    const quoteToken = ["BUSD", "USDT"].includes(token0Symbol)
        ? {symbol: token0Symbol, address: token0}
        : ["BNB", "WBNB"].includes(token0Symbol)
        ? {symbol: token0Symbol, address: token0}
        : {symbol: token1Symbol, address: token1};
    const token =
        quoteToken.symbol === token0Symbol
            ? {symbol: token1Symbol, address: token1}
            : {symbol: token0Symbol, address: token0};

    const [_quoteTokenBalance, _tokenBalance] = await multicall(erc20ABI, [
        {address: quoteToken.address, name: "balanceOf", params: [want]},
        {address: token.address, name: "balanceOf", params: [want]},
    ]);

    const quoteTokenBalanceOfMC = new BigNumber(_quoteTokenBalance).times(wantRatio);

    let tvl = new BigNumber(0);
    if (["BUSD", "USDT"].includes(quoteToken.symbol)) {
        tvl = quoteTokenBalanceOfMC.times(2);
    } else if (["BNB", "WBNB"].includes(quoteToken.symbol)) {
        tvl = quoteTokenBalanceOfMC.times(2).times(bnbPrice);
    }

    const [_totalAllocPoint, _rewardPerBlock, _poolInfo, _userInfo] = await multicall(masterchefABI, [
        {address: masterchef, name: "totalAllocPoint"},
        {address: masterchef, name: vault.rewardPerBlock},
        {address: masterchef, name: "poolInfo", params: [pid]},
        {address: masterchef, name: "userInfo", params: [pid, strategy]},
    ]);
    const totalAllocPoint = new BigNumber(_totalAllocPoint);
    const rewardPerBlock = new BigNumber(_rewardPerBlock);
    const allocPoint = new BigNumber(_poolInfo.allocPoint._hex);
    const blockPerYear = (60 * 60 * 24 * 365) / 3;

    const rewardPerYear = rewardPerBlock.times(blockPerYear).times(allocPoint).div(totalAllocPoint);
    return [rewardPerYear, tvl];
};
const getVaultInfo = async (vaultAddress) => {
    const [strategy, want] = await multicall(vaultABI, [
        {address: vaultAddress, name: "strategy"},
        {address: vaultAddress, name: "want"},
    ]);
    return [strategy.toString(), want.toString()];
};

const getStrategyInfo = async (vault, strategyAddress) => {
    if (vault.platform === "KILLSWITCH") {
        const [masterchef, kswIzlude] = await multicall(kswStrategyABI, [
            {address: strategyAddress, name: "masterchef"},
            {address: strategyAddress, name: "kswIzlude"},
        ]);

        return [masterchef.toString(), kswIzlude.toString()];
    } else {
        const [masterchef, token0, token1, poolId] = await multicall(strategyABI, [
            {address: strategyAddress, name: "masterchef"},
            {address: strategyAddress, name: "lpToken0"},
            {address: strategyAddress, name: "lpToken1"},
            {address: strategyAddress, name: "poolId"},
        ]);

        return [masterchef.toString(), token0.toString(), token1.toString(), new BigNumber(poolId).toNumber()];
    }
};

const getBNBPrice = async () => {
    const pancakeBnbBusdLP = "0x1B96B92314C44b159149f7E0303511fB2Fc4774f";
    const [wbnbBalance, busdBalance] = await multicall(erc20ABI, [
        {address: wbnb, name: "balanceOf", params: [pancakeBnbBusdLP]},
        {address: busd, name: "balanceOf", params: [pancakeBnbBusdLP]},
    ]);

    const bnbPrice = new BigNumber(busdBalance).div(new BigNumber(wbnbBalance)).toNumber();
    return bnbPrice;
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

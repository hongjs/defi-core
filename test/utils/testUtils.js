const BigNumber = require("bignumber.js");
const {ethers} = require("hardhat");
const {getFarmApr} = require("./apr");

const addLPBnb = async (router, owner, tokenA, amountA, amountBnb) => {
    const _deadline = Date.now() + 1200;
    await router.addLiquidityETH(
        tokenA.address,
        ethers.utils.parseEther(amountA),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        owner.address,
        _deadline,
        {value: ethers.utils.parseEther(amountBnb)}
    );
};

const addLP = async (router, owner, tokenA, tokenB, amountA, amountB) => {
    const _deadline = Date.now() + 1200;
    await router.addLiquidity(
        tokenA.address,
        tokenB.address,
        ethers.utils.parseEther(amountA),
        ethers.utils.parseEther(amountB),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        owner.address,
        _deadline
    );
};

const enterFarm = async (masterChef, owner, pair, amount) => {
    const balance = amount ? ethers.utils.parseEther(amount) : await pair.pool.balanceOf(owner.address);
    await pair.pool.approve(masterChef.address, balance);
    await masterChef.deposit(pair.index, balance);
};

const leaveFarm = async (masterChef, pair, amount) => {
    await masterChef.withdraw(pair.index, ethers.utils.parseEther(amount));
};

const enterStaking = async (masterChef, defiToken, amount) => {
    await defiToken.approve(masterChef.address, ethers.utils.parseEther(amount));
    await masterChef.enterStaking(ethers.utils.parseEther(amount));
};

const leaveStaking = async (masterChef, amount) => {
    await masterChef.leaveStaking(ethers.utils.parseEther(amount));
};

const getPoolWeight = async (masterChef, pair) => {
    const poolInfo = await masterChef.poolInfo(pair.index);
    const allocPoint = toBigNumber(poolInfo.allocPoint);
    const totalAllocPoint = toBigNumber(await masterChef.totalAllocPoint());
    const poolWeight = allocPoint.div(totalAllocPoint);
    return poolWeight;
};

const getAPR = async (masterChef, pair, defiPrice, bnbPrice) => {
    const poolWeight = await getPoolWeight(masterChef, pair);
    const _defiPrice = new BigNumber(defiPrice);

    const lpTotalSupply = await pair.pool["totalSupply()"]();
    const lpTokenBalanceMC = await pair.pool["balanceOf(address)"](masterChef.address);
    const lpTokenRatio = toBigNumber(lpTokenBalanceMC).div(toBigNumber(lpTotalSupply));

    const quoteTokenBlanceLP = toBigNumber(await pair.quoteToken.balanceOf(pair.pool.address));

    const quoteTokenSymbol = await pair.quoteToken.symbol();
    const lpTotalInQuoteToken = quoteTokenBlanceLP
        .div(new BigNumber(10).pow(18))
        .times(new BigNumber(2))
        .times(lpTokenRatio);

    let poolLiquidityUsd = new BigNumber(0);
    switch (quoteTokenSymbol) {
        case "DEFI":
            poolLiquidityUsd = lpTotalInQuoteToken.times(defiPrice);
            break;
        case "BNB":
        case "WBNB":
            poolLiquidityUsd = lpTotalInQuoteToken.times(bnbPrice);
            break;
        default:
            poolLiquidityUsd = lpTotalInQuoteToken;
    }

    const apr = getFarmApr(poolWeight, _defiPrice, poolLiquidityUsd);
    return apr;
};

const getDefiPrice = async (pairs) => {
    const addresses = Object.keys(pairs);

    const [totalBnbInDefiBnbPair, totalDefiInDefiBnbPair] = await getTotalBalanceLp(
        pairs[addresses[0]].pool,
        pairs[addresses[0]].token,
        pairs[addresses[0]].quoteToken
    );
    const [totalBusdInDefiBusdPair, totalDefiInDefiBusdPair] = await getTotalBalanceLp(
        pairs[addresses[1]].pool,
        pairs[addresses[1]].token,
        pairs[addresses[1]].quoteToken
    );
    const [totalBusdInBnbBusdPair, totalBnbInBnbBusdPair] = await getTotalBalanceLp(
        pairs[addresses[2]].pool,
        pairs[addresses[2]].token,
        pairs[addresses[2]].quoteToken
    );

    // const [totalUsdtInUsdtBusdPair, totalBusdInUsdtBusdPair] = await getTotalBalanceLp(
    //     pairs[addresses[3]].pool,
    //     pairs[addresses[3]].token,
    //     pairs[addresses[3]].quoteToken
    // );

    const pancakeBnbPrice = totalBnbInBnbBusdPair !== 0 ? totalBusdInBnbBusdPair / totalBnbInBnbBusdPair : 0;
    const totalDefiInAllPair = totalDefiInDefiBusdPair + totalDefiInDefiBnbPair;
    const totalUsdInAllPair =
        totalBusdInDefiBusdPair +
        totalBusdInBnbBusdPair +
        (totalBnbInDefiBnbPair + totalBnbInBnbBusdPair) * pancakeBnbPrice;

    const averageDefiPrice = totalUsdInAllPair / totalDefiInAllPair;

    return averageDefiPrice;
};

const getTVL = async (pairs, masterChef, defiToken, defiPriceUsd) => {
    const addresses = Object.keys(pairs);
    const fetchPromise = [];

    const _totalStaked = await defiToken.balanceOf(masterChef.address);
    const totalStaked = new BigNumber(_totalStaked._hex).div(new BigNumber(10).pow(18)).toNumber();

    fetchPromise.push(
        getTotalQuote({
            lpAddress: pairs[addresses[0]].pool,
            qouteToken: pairs[addresses[0]].quoteToken,
            masterChefAddress: masterChef.address,
        })
    );
    fetchPromise.push(
        getTotalQuote({
            lpAddress: pairs[addresses[1]].pool,
            qouteToken: pairs[addresses[1]].quoteToken,
            masterChefAddress: masterChef.address,
        })
    );
    fetchPromise.push(
        getTotalQuote({
            lpAddress: pairs[addresses[2]].pool,
            qouteToken: pairs[addresses[2]].quoteToken,
            masterChefAddress: masterChef.address,
        })
    );
    fetchPromise.push(
        getTotalQuote({
            lpAddress: pairs[addresses[3]].pool,
            qouteToken: pairs[addresses[3]].quoteToken,
            masterChefAddress: masterChef.address,
        })
    );
    fetchPromise.push(
        getTotalQuote({
            lpAddress: pairs[addresses[4]].pool,
            qouteToken: pairs[addresses[4]].quoteToken,
            masterChefAddress: masterChef.address,
        })
    );

    fetchPromise.push(
        getTotalBalanceLp(pairs[addresses[2]].pool, pairs[addresses[2]].token, pairs[addresses[2]].quoteToken)
    );

    const [
        defiWbnbQuote,
        defiBusdQuote,
        wbnbBusdQuote,
        usdtBusdQuote,
        kMaticWbnbQuote,
        [totalBnbInBnbBusdPair, totalBusdInBnbBusdPair],
    ] = await Promise.all(fetchPromise);

    const pancakeBnbPrice = totalBnbInBnbBusdPair !== 0 ? totalBusdInBnbBusdPair / totalBnbInBnbBusdPair : 0;

    const totalDefi = new BigNumber(totalStaked).times(defiPriceUsd);
    const defiBusdPrice = new BigNumber(defiBusdQuote);
    const defiWbnbPrice = new BigNumber(defiWbnbQuote).times(defiPriceUsd);
    const wbnbBusdPrice = new BigNumber(wbnbBusdQuote);
    const usdtBusdPrice = new BigNumber(usdtBusdQuote);
    const kMaticWbnbPrice = new BigNumber(kMaticWbnbQuote).times(pancakeBnbPrice);

    return BigNumber.sum
        .apply(null, [
            defiBusdPrice,
            defiWbnbPrice,
            wbnbBusdPrice,
            usdtBusdPrice,
            kMaticWbnbPrice,
            new BigNumber(totalDefi),
        ])
        .toNumber();
};

const getTotalBalanceLp = async (pool, token, quoteToken) => {
    let tokenAmount = 0;
    let quoteTokenAmount = 0;
    try {
        const tokenBalanceLP = toBigNumber(await token.balanceOf(pool.address));
        let tokenDecimals = new BigNumber(await token.decimals());
        tokenDecimals = !isNaN(tokenDecimals) ? tokenDecimals : new BigNumber(18);
        const quoteTokenBalanceLP = toBigNumber(await quoteToken.balanceOf(pool.address));
        let quoteTokenDecimals = new BigNumber(await quoteToken.decimals());
        quoteTokenDecimals = !isNaN(quoteTokenDecimals) ? quoteTokenDecimals : new BigNumber(18);

        tokenAmount = tokenBalanceLP.div(new BigNumber(10).pow(tokenDecimals));
        quoteTokenAmount = quoteTokenBalanceLP.div(new BigNumber(10).pow(quoteTokenDecimals));
    } catch (err) {
        console.error(err);
    }
    return [tokenAmount.toNumber(), quoteTokenAmount.toNumber()];
};

const getTotalQuote = async ({lpAddress, qouteToken, masterChefAddress}) => {
    let lpTotalInQuoteToken = 0;
    try {
        const quoteTokenBlanceLP = await qouteToken.balanceOf(lpAddress.address);
        const lpTokenBalanceMC = await lpAddress.balanceOf(masterChefAddress);
        const lpTotalSupply = await lpAddress.totalSupply();

        const lpTokenRatio = new BigNumber(lpTotalSupply._hex).isZero()
            ? new BigNumber(0)
            : new BigNumber(lpTokenBalanceMC._hex).div(new BigNumber(lpTotalSupply._hex));

        // const lpTokenRatio = 1
        lpTotalInQuoteToken = new BigNumber(quoteTokenBlanceLP._hex)
            .div(new BigNumber(10).pow(18))
            .times(new BigNumber(2))
            .times(lpTokenRatio)
            .toNumber();
    } catch (error) {
        console.error("getTotalQuote", error);
    }
    return lpTotalInQuoteToken;
};

const toBigNumber = (number) => {
    return new BigNumber(number._hex);
};

const toBigNumberDiv1e18 = (number) => {
    return new BigNumber(number._hex).div(1e18).toNumber();
};

const initMasterChef = async ({owner, masterChef, router, factory, kennelClub, defi, wbnb, busd, usdt}) => {
    const DefiPair = await ethers.getContractFactory("DefiPair");
    let txCreatePair = await factory.createPair(defi.address, wbnb.address);
    await txCreatePair.wait();
    const lpDefiBnb = await DefiPair.attach(await factory.getPair(defi.address, wbnb.address));
    txCreatePair = await factory.createPair(defi.address, busd.address);
    await txCreatePair.wait();
    const lpDefiBusd = await DefiPair.attach(await factory.getPair(defi.address, busd.address));
    txCreatePair = await factory.createPair(wbnb.address, busd.address);
    await txCreatePair.wait();
    const lpBnbBusd = await DefiPair.attach(await factory.getPair(wbnb.address, busd.address));
    txCreatePair = await factory.createPair(usdt.address, busd.address);
    await txCreatePair.wait();
    const lpUsdtBusd = await DefiPair.attach(await factory.getPair(usdt.address, busd.address));

    // Add LP
    await masterChef.add(4000, lpDefiBnb.address, 0, 0);
    await masterChef.add(3000, lpDefiBusd.address, 0, 0);
    await masterChef.add(300, lpBnbBusd.address, 80, 200);
    await masterChef.add(300, lpUsdtBusd.address, 80, 200);

    // Mint
    await wbnb.deposit({value: ethers.utils.parseEther("1000")});
    await busd.mint(ethers.utils.parseEther("6000000"));
    await defi.mintTo(owner.address, ethers.utils.parseEther("6000000"));
    await usdt.mint(ethers.utils.parseEther("6000000"));

    // Approve
    await defi.approve(router.address, ethers.utils.parseEther("100000000"));
    await wbnb.approve(router.address, ethers.utils.parseEther("100000000"));
    await busd.approve(router.address, ethers.utils.parseEther("100000000"));
    await usdt.approve(router.address, ethers.utils.parseEther("100000000"));

    // transferOwnership
    await defi.transferOwnership(masterChef.address);
    await kennelClub.transferOwnership(masterChef.address);

    // add LP
    await addLPBnb(router, owner, defi, "500000", "100");
    await addLP(router, owner, defi, busd, "1000", "100");
    await addLPBnb(router, owner, busd, "50000", "100");
    await addLP(router, owner, usdt, busd, "1000", "1000");

    return [lpDefiBnb, lpDefiBusd, lpBnbBusd, lpUsdtBusd];
};

const increaseBlock = async (numberBlockOfBlock) => {
    const blocks = [];
    for (i = 0; i < numberBlockOfBlock; i++) {
        blocks.push(i);
    }

    for (const block of blocks) {
        await ethers.provider.send("evm_mine");
    }
};

module.exports.getDefiPrice = getDefiPrice;
module.exports.getAPR = getAPR;
module.exports.enterFarm = enterFarm;
module.exports.leaveFarm = leaveFarm;
module.exports.enterStaking = enterStaking;
module.exports.leaveStaking = leaveStaking;
module.exports.addLP = addLP;
module.exports.addLPBnb = addLPBnb;
module.exports.getTVL = getTVL;
module.exports.initMasterChef = initMasterChef;
module.exports.increaseBlock = increaseBlock;
module.exports.toBigNumber = toBigNumber;

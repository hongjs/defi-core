const BigNumber = require("bignumber.js");
const {BLOCKS_PER_YEAR, DEFI_PER_YEAR} = require("./config");

/**
 * Get the APR value in %
 * @param stakingTokenPrice Token price in the same quote currency
 * @param rewardTokenPrice Token price in the same quote currency
 * @param totalStaked Total amount of stakingToken in the pool
 * @param tokenPerBlock Amount of new defi allocated to the pool for each new block
 * @returns Null if the APR is NaN or infinite.
 */
const getPoolApr = (stakingTokenPrice, rewardTokenPrice, totalStaked, tokenPerBlock) => {
    const totalRewardPricePerYear = new BigNumber(rewardTokenPrice).times(tokenPerBlock).times(BLOCKS_PER_YEAR);
    const totalStakingTokenInPool = new BigNumber(stakingTokenPrice).times(totalStaked);
    const apr = totalRewardPricePerYear.div(totalStakingTokenInPool).times(100);
    return apr.isNaN() || !apr.isFinite() ? null : apr.toNumber();
};

/**
 * Get farm APR value in %
 * @param poolWeight allocationPoint / totalAllocationPoint
 * @param defiPriceUsd Defi price in USD
 * @param poolLiquidityUsd Total pool liquidity in USD
 * @returns
 */
const getFarmApr = (poolWeight, defiPriceUsd, poolLiquidityUsd) => {
    const yearlyRewardAllocation = DEFI_PER_YEAR.times(poolWeight);
    const apr = yearlyRewardAllocation.times(defiPriceUsd).div(poolLiquidityUsd).times(100);
    return apr.isNaN() || !apr.isFinite() ? null : apr.toNumber();
};

module.exports.getPoolApr = getPoolApr;
module.exports.getFarmApr = getFarmApr;

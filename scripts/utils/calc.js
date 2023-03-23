const MAX_APR = 1000000;

const calcAPY = (apr, numberOfcompounding) => {
    if (numberOfcompounding === 0) return 0;
    const apy = ((1 + (apr * 0.01) / numberOfcompounding) ** numberOfcompounding - 1) * 100.0;
    if (apy > MAX_APR) return MAX_APR;
    return apy;
};

module.exports.calcAPY = calcAPY;

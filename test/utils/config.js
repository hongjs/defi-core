const BigNumber = require("bignumber.js");

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

const BSC_BLOCK_TIME = 3;
const BLOCKS_PER_YEAR = new BigNumber((60 / BSC_BLOCK_TIME) * 60 * 24 * 365); // 10512000
const DEFI_PER_BLOCK = new BigNumber(5);
const DEFI_PER_YEAR = DEFI_PER_BLOCK.times(BLOCKS_PER_YEAR);

module.exports.BSC_BLOCK_TIME = BSC_BLOCK_TIME;
module.exports.BLOCKS_PER_YEAR = BLOCKS_PER_YEAR;
module.exports.DEFI_PER_BLOCK = DEFI_PER_BLOCK;
module.exports.DEFI_PER_YEAR = DEFI_PER_YEAR;

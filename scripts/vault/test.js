const {ethers} = require("hardhat");
const {default: BigNumber} = require("bignumber.js");

async function main() {
    [owner] = await ethers.getSigners();

    const raffleAddress = "0xcF586d88EcA628d2F62791352Fb36DBDA3B0514e";
    // const testnetVaults = [
    //     "0x14c98F453Cd348FA711494550864e169B59aB767",
    //     "0xAA9DA44D33FaAC86fE1b6c050BAc2A5660BeeB7D",
    //     "0x05b6e04B975d3Cd34b5c119B7599cB1bf8306Dc1",
    //     "0xDdb88f55Cc0A49171D4c8ca31dfEcB4739A56a33",
    // ];

    const mainnetVaults = [
        "0xdB7bE0267de798d39401AbB81f98a13Aad9636c9",
        "0xa99226CfaECD2160C73969d1058284CF1358884f",
        "0xD257a7F57378c4fB733e395E7B8Cd1D4330A8878",
        "0x4C13a203bD6de8D5DbE0B82E6C9EB9cfA168d8FF",
        "0x0e229A28772347dD86D7b4f04d23b16126ee7343",
        "0x6434ed4bE521B6CD1c79469baFA21B60276ae1F9",
    ];

    const vaults = mainnetVaults;

    // await viewVaultInfo(vaults, raffleAddress);
    // await updateDevWallet(vaults);
    // await updateWithdrawLock(vaults, 10 * 24 * 60 * 60);
    // await harvest(vaults);
    await getWinner(raffleAddress);
    // await getCandidates(raffleAddress);
    // await updateNewRaffle(vaults, raffleAddress);
    // await getDefixKillSwitch();
}

const viewVaultInfo = async (vaults, raffleAddress) => {
    const DefiVault = await ethers.getContractFactory("DefiVault");
    const DefiCommonStrategy = await ethers.getContractFactory("DefiCommonStrategy");
    const DefiVaultRaffle = await ethers.getContractFactory("DefiVaultRaffle");
    const WBNB = await ethers.getContractFactory("BEP40Token");

    const wbnbAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    const wbnb = await WBNB.attach(wbnbAddress);
    const raffle = await DefiVaultRaffle.attach(raffleAddress);
    const specialPot = await raffle.specialPot();
    console.log("specialPot:", specialPot);
    console.log("##########");
    console.log("symbol", "raffle", "devWallet", "paused?", "approve?", "withdrawLock");
    for (const addr of vaults) {
        const vault = await DefiVault.attach(addr);
        const symbol = await vault.symbol();
        const strategyAddr = await vault.strategy();
        const strategy = await DefiCommonStrategy.attach(strategyAddr);
        const withdrawLock = new BigNumber((await strategy.withdrawLock())._hex).div(60 * 60 * 24).toNumber();

        const raffleAddr = await strategy.raffle();
        const devWallet = await strategy.devWallet();
        const paused = await strategy.paused();
        const approved = await wbnb.allowance(strategyAddr, raffleAddr);
        const isApprove = new BigNumber(approved._hex).gt(0);
        console.log(
            symbol,
            raffleAddr,
            devWallet,
            paused ? "paused" : "!paused",
            isApprove ? "approved" : "!approved",
            `${withdrawLock}d`
        );
    }
    console.log("");
};

const updateWithdrawLock = async (vaults, seconds) => {
    const DefiVault = await ethers.getContractFactory("DefiVault");
    const DefiCommonStrategy = await ethers.getContractFactory("DefiCommonStrategy");

    for (const addr of vaults) {
        const vault = await DefiVault.attach(addr);
        const strategyAddr = await vault.strategy();
        const strategy = await DefiCommonStrategy.attach(strategyAddr);

        try {
            const withdrawLock = await strategy.withdrawLock();
            console.log(addr, "done", withdrawLock.toString());
            // const tx = await strategy.setWithdrawLock(seconds);
            // await tx.wait();
            // console.log(addr, "done", tx.toString());
        } catch (error) {
            console.log(addr, "error, tx.hash:", error.transactionHash);
        }
    }
};

const updateNewRaffle = async (vaults, newRaffleAddress) => {
    const DefiVault = await ethers.getContractFactory("DefiVault");
    const DefiCommonStrategy = await ethers.getContractFactory("DefiCommonStrategy");

    for (const addr of vaults) {
        const vault = await DefiVault.attach(addr);
        const strategyAddr = await vault.strategy();
        const strategy = await DefiCommonStrategy.attach(strategyAddr);

        try {
            const tx = await strategy.setRaffle(newRaffleAddress);
            await tx.wait();
            await strategy.pause();
            await strategy.unpause();
            console.log(addr, strategyAddr, "done");
        } catch (error) {
            console.log(addr, strategyAddr, "error, tx.hash:", error.transactionHash);
        }
    }
};

const updateDevWallet = async (vaults) => {
    const DefiVault = await ethers.getContractFactory("DefiVault");
    const DefiCommonStrategy = await ethers.getContractFactory("DefiCommonStrategy");

    for (const addr of vaults) {
        const vault = await DefiVault.attach(addr);
        const strategyAddr = await vault.strategy();
        const strategy = await DefiCommonStrategy.attach(strategyAddr);

        try {
            const tx = await strategy.setDevWallet("0x72c3453FF01E733F5b87B23E5A8F909548C52da8");
            await tx.wait();
            console.log(strategyAddr, "done");
        } catch (error) {
            console.log(strategyAddr, "error, tx.hash:", error.transactionHash);
        }
    }
};

const harvest = async (vaults) => {
    const DefiVault = await ethers.getContractFactory("DefiVault");
    const DefiCommonStrategy = await ethers.getContractFactory("DefiCommonStrategy");

    for (const addr of vaults) {
        const vault = await DefiVault.attach(addr);
        const strategyAddr = await vault.strategy();
        const strategy = await DefiCommonStrategy.attach(strategyAddr);
        try {
            const tx = await strategy.harvest();
            await tx.wait();
            console.log(strategyAddr, "done");
        } catch (error) {
            console.log(strategyAddr, "error, tx.hash:", error.transactionHash);
        }
    }
};

const getWinner = async (raffleAddress) => {
    try {
        const DefiVaultRaffle = await ethers.getContractFactory("DefiVaultRaffle");
        const DefiVault = await ethers.getContractFactory("DefiVault");
        const raffle = await DefiVaultRaffle.attach(raffleAddress);

        const winner = await raffle.getWinner();

        const winnerVault = await DefiVault.attach(winner[0].value.vault);
        const symbol = await winnerVault.symbol();

        console.log("Winner is ", symbol);
        console.log("Award = ", new BigNumber(winner[1].toString()).div(1e18).toNumber());
        console.log("Candidate = ", winner[2]);
    } catch (error) {
        console.log(error.error ? error.error : error);
    }
};

const getCandidates = async (raffleAddress) => {
    try {
        const DefiVaultRaffle = await ethers.getContractFactory("DefiVaultRaffle");
        const raffle = await DefiVaultRaffle.attach(raffleAddress);
        const keys = await raffle.getKeys();
        const minVaultAmount = new BigNumber((await raffle.minVaultAmount()).toString());
        const minRaffleAmount = new BigNumber((await raffle.minRaffleAmount()).toString());
        const totalBalance = new BigNumber((await raffle.totalBalance()).toString());
        const minVaultCount = await raffle.minVaultCount();

        const candidates = [];
        if (keys.length > 0) {
            await Promise.all(
                keys.map(async (key) => {
                    const entry = await raffle.getEntryByKey(key);
                    const balance = new BigNumber(entry.balance.toString());
                    const valid = balance.gte(minVaultAmount);
                    candidates.push({
                        vault: entry.vault,
                        balanceNumber: balance.div(1e18).toNumber(),
                        balance: balance,
                        valid,
                    });
                })
            );
        }

        const validAmount = candidates.some((i) => i.valid)
            ? BigNumber.sum.apply(
                  null,
                  candidates.filter((i) => i.valid).map((i) => i.balance)
              )
            : new BigNumber(0);
        console.log({
            validAmount: validAmount.div(1e18).toNumber(),
            totalBalance: totalBalance.div(1e18).toNumber(),
            isValidAmount: validAmount.gte(minRaffleAmount),
            validCount: candidates.filter((i) => i.valid).length,
            isValidCount: candidates.filter((i) => i.valid).length >= minVaultCount,
            candidates,
        });
    } catch (error) {
        console.log(error.error ? error.error : error);
    }
};

const getDefixKillSwitch = async () => {
    const byalan = "0x2f4b6b1355827a8dc179feef4f867be0c2b46835";

    const DefiVault = await ethers.getContractFactory("DefiVault");
    const vault = await DefiVault.attach("0xE44BE2393C273C759def073d04153D9B9240CA37");
    const strategyAddress = await vault.strategy();

    const DefiToken = await ethers.getContractFactory("DefiToken");
    const defi = DefiToken.attach("0xBdb44DF0A914c290DFD84c1eaf5899d285717fdc");
    const ksw = DefiToken.attach("0x270178366a592bA598C2e9d2971DA65f7bAa7C86");
    const DefiMasterChef = await ethers.getContractFactory("DefiMasterChef");
    const defiMasterChef = await DefiMasterChef.attach("0x5D21D02378670119453530478288AEe67b807e2a");

    const byalanAtDefiMasterchef = await defiMasterChef.userInfo(0, byalan);
    const byalanBalanceOfDefi = new BigNumber((await defi.balanceOf(byalan)).toString()).div(1e18).toNumber();
    const ownerBalanceOfDefi = new BigNumber((await defi.balanceOf(owner.address)).toString()).div(1e18).toNumber();
    const ownerBalanceOfVault = new BigNumber((await vault.balanceOf(owner.address)).toString()).div(1e18).toNumber();
    const strategyBalanceOfKSW = new BigNumber((await ksw.balanceOf(strategyAddress)).toString()).div(1e18).toNumber();

    console.log("vault.balanceOf(owner)", ownerBalanceOfVault);
    console.log("ksw.balanceOf(strategy)", strategyBalanceOfKSW);
    console.log("defi.balanceOf(owner)", ownerBalanceOfDefi);
    console.log("defi.balanceOf(byalan)", byalanBalanceOfDefi);
    console.log("DefiMC.userInfo(0,byalan)", new BigNumber(byalanAtDefiMasterchef.amount._hex).div(1e18).toNumber());
};

const withdrawDefiFromKillSwitch = async () => {
    const DefiVault = await ethers.getContractFactory("DefiVault");
    const vault = await DefiVault.attach("0xE44BE2393C273C759def073d04153D9B9240CA37");
    let tx = null;
    try {
        // tx = await vault.withdraw(ethers.utils.parseEther("1"));
        tx = await vault.withdrawAll();
        console.log("done!");
    } catch (error) {
        console.log(error);
    } finally {
        if (tx) await tx.wait();
    }
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

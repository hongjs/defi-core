const {ethers} = require("hardhat");

async function main() {
    const [owner] = await ethers.getSigners();

    const mainnet = {
        keeper: "0xBC080CB8588E4A946c4c5F98acd039426839e9C8",
        devWallet: "0x72c3453FF01E733F5b87B23E5A8F909548C52da8",
        feeRecipient: "0xD1a7a10ed0Fca59374021BB02c4C281AF4D29Bf0",

        gasPrice: "0x9f21E647439ae8107cE3B02cEBf5da9bf317961e",
        raffle: "0xcF586d88EcA628d2F62791352Fb36DBDA3B0514e",

        defi: "0xBdb44DF0A914c290DFD84c1eaf5899d285717fdc",
        wbnb: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        usdt: "0x55d398326f99059fF775485246999027B3197955",
        bsw: "0x965F527D9159dCe6288a2219DB51fc6Eef120dD1",
        baby: "0x53E562b9B7E5E94b81f10e96Ee70Ad06df3D2657",
        banana: "0x603c7f932ED1fc6575303D8Fb018fDCBb0f39a95",
        ksw: "0x270178366a592bA598C2e9d2971DA65f7bAa7C86",
    };

    const platform = {
        biswap: {
            mastetChef: "0xdbc1a13490deef9c3c12b44fe77b503c1b061739",
            router: "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8",
            rewardToken: mainnet.bsw,
            name: "BiSwap",
            helper: "0x85ACfa6EFe7d536c19A30fD154F1f8BA02bAc5fB",

            bnbBusd: {
                lpAddress: "0xaCAac9311b0096E04Dfe96b6D87dec867d3883Dc",
                name: "BNB-BUSD",
                poolId: 3,
            },
            avaxBnb: {
                lpAddress: "0x2f3899fFB9FdCf635132F7bb94c1a3A0F906cc6f",
                name: "AVAX-BNB",
                poolId: 76,
            },
            usdtBusd: {
                lpAddress: "0xDA8ceb724A06819c0A5cDb4304ea0cB27F8304cF",
                name: "USDT-BUSD",
                poolId: 1,
            },
            galaBnb: {
                lpAddress: "0x4F00ADEED60FCba76e58a5d067b6A4b9Daf8e30f",
                name: "GALA-BNB",
                poolId: 92,
            },
            maticBnb: {
                lpAddress: "0x3B09e13Ca9189FBD6a196cfE5FbD477C885afBf3",
                name: "MATIC-BNB",
                poolId: 70,
            },
        },
        // babyswap: {
        //     mastetChef: "0xdfAa0e08e357dB0153927C7EaBB492d1F60aC730",
        //     router: "0x325E343f1dE602396E256B67eFd1F61C3A6B38Bd",
        //     rewardToken: mainnet.baby,
        //     name: "BabySwap",
        //     helper: "0xc367d1d2E16fB597684BCd24Dc81a66332631FdB",

        //     galaUsdt: {
        //         lpAddress: "0xb91c780792EB5168263A21b583FDCdE50446Ff1C",
        //         name: "GALA-USDT",
        //         poolId: 110,
        //     },
        //     maticUsdt: {
        //         lpAddress: "0xAB8C7Ef18a51fb865FCEEb8773Fd801fBF89DDA7",
        //         name: "MATIC-USDT",
        //         poolId: 17,
        //     },
        // },
        killSwitch: {
            mastetChef: "0x0d0A09bc1D1a9fec8901Ddf03aBCA488eC78F9A3",
            router: "0x0F4610aB02920a99f639F675085A5d3e24b0D7ae",
            rewardToken: mainnet.ksw,
            name: "KillSwitch",
            helper: "0x89d7dDcaf8C7d8F4506925b242cfF5b6452f8b55",

            defi: {
                lpAddress: mainnet.defi,
                name: "DEFI",
                poolId: 52,
                izlude: "0x5E09E6df7c5486e504af49D1793D254C2D1827De",
                isSingle: true,
            },
        },
    };

    const n = mainnet;

    // await deployContract(n, platform.biswap, platform.biswap.bnbBusd);
    // await deployContract(n, platform.biswap, platform.biswap.avaxBnb);
    // await deployContract(n, platform.biswap, platform.biswap.usdtBusd);
    // await deployContract(n, platform.biswap, platform.biswap.galaBnb);
    await deployContract(n, platform.biswap, platform.biswap.maticBnb);

    // await deployContract(n, platform.babyswap, platform.babyswap.galaUsdt);
    // await deployContract(n, platform.babyswap, platform.babyswap.maticUsdt);

    // await deployContract(n, platform.killSwitch, platform.killSwitch.defi);
}

const deployContract = async (n, p, lp) => {
    const name = `DEFIx${p.name}-${lp.name} Vault LP`;
    const symbol = `DEFIx${p.name}-${lp.name} VAULT`;
    console.log("#### LP:", name);

    let strategy;
    if (lp.isSingle === true) {
        const DefiKSWStrategy = await ethers.getContractFactory("DefiKSWStrategy");
        strategy = await DefiKSWStrategy.deploy(
            lp.lpAddress,
            p.mastetChef,
            p.router,
            n.wbnb,
            p.rewardToken,
            n.keeper,
            n.devWallet,
            n.feeRecipient,
            n.gasPrice,
            n.raffle,
            lp.izlude
        );
        await strategy.deployed();

        console.log("## strategy:", strategy.address);
        console.log(
            `npx hardhat verify --network mainnet ${strategy.address} ${lp.lpAddress} ${p.mastetChef} ${p.router} ${n.wbnb} ${p.rewardToken} ${n.keeper} ${n.devWallet} ${n.feeRecipient} ${n.gasPrice} ${n.raffle} ${lp.izlude}`
        );
    } else if (p.name === "BabySwap") {
        const DefiBabyStrategy = await ethers.getContractFactory("DefiBabyStrategy");
        strategy = await DefiBabyStrategy.deploy(
            lp.lpAddress,
            p.mastetChef,
            lp.poolId,
            p.router,
            n.wbnb,
            n.usdt,
            p.rewardToken,
            n.keeper,
            n.devWallet,
            n.feeRecipient,
            n.gasPrice,
            n.raffle
        );
        await strategy.deployed();
        console.log("## strategy:", strategy.address);
        console.log(
            `npx hardhat verify --network mainnet ${strategy.address} ${lp.lpAddress} ${p.mastetChef} ${lp.poolId} ${p.router} ${n.wbnb} ${n.usdt} ${p.rewardToken} ${n.keeper} ${n.devWallet} ${n.feeRecipient} ${n.gasPrice} ${n.raffle}`
        );
    } else {
        const DefiCommonStrategy = await ethers.getContractFactory("DefiCommonStrategy");
        strategy = await DefiCommonStrategy.deploy(
            lp.lpAddress,
            p.mastetChef,
            lp.poolId,
            p.router,
            n.wbnb,
            p.rewardToken,
            n.keeper,
            n.devWallet,
            n.feeRecipient,
            n.gasPrice,
            n.raffle
        );
        await strategy.deployed();

        console.log("## strategy:", strategy.address);
        console.log(
            `npx hardhat verify --network mainnet ${strategy.address} ${lp.lpAddress} ${p.mastetChef} ${lp.poolId} ${p.router} ${n.wbnb} ${p.rewardToken} ${n.keeper} ${n.devWallet} ${n.feeRecipient} ${n.gasPrice} ${n.raffle}`
        );
    }

    const DefiVault = await ethers.getContractFactory("DefiVault");
    const vault = await DefiVault.deploy(strategy.address, name, symbol, 21600);
    await vault.deployed();

    await strategy.setVault(vault.address);

    console.log("## vault:", vault.address);
    console.log(
        `npx hardhat verify --network mainnet ${vault.address} ${strategy.address} "${name}" "${symbol}" ${21600}`
    );
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

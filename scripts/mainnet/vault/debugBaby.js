const {BigNumber} = require("ethers");
const {ethers} = require("hardhat");

async function main() {
    const [owner] = await ethers.getSigners();

    const mainnet = {
        keeper: "0xBC080CB8588E4A946c4c5F98acd039426839e9C8",
        devWallet: "0xC27Ac1F5C585fb49A07683e6Ab86aECf50c572CC",
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
        babyswap: {
            mastetChef: "0xdfAa0e08e357dB0153927C7EaBB492d1F60aC730",
            router: "0x325E343f1dE602396E256B67eFd1F61C3A6B38Bd",
            rewardToken: mainnet.baby,
            name: "BabySwap",
            helper: "0xc367d1d2E16fB597684BCd24Dc81a66332631FdB",

            galaUsdt: {
                lpAddress: "0xb91c780792EB5168263A21b583FDCdE50446Ff1C",
                name: "GALA-USDT",
                poolId: 110,
            },
            maticUsdt: {
                lpAddress: "0xAB8C7Ef18a51fb865FCEEb8773Fd801fBF89DDA7",
                name: "MATIC-USDT",
                poolId: 17,
            },
        },
    };

    const n = mainnet;
    const p = platform.babyswap;
    const lp = platform.babyswap.maticUsdt;

    // const name = `Defi-${p.name}-${lp.name} Vault LP`;
    // const symbol = `Defi-${p.name}-${lp.name} VAULT`;
    // console.log("#### LP:", name);

    // const DefiBabyStrategy = await ethers.getContractFactory("DefiBabyStrategy");
    // const strategy = await DefiBabyStrategy.deploy(
    //     lp.lpAddress,
    //     p.mastetChef,
    //     lp.poolId,
    //     p.router,
    //     n.wbnb,
    //     n.usdt,
    //     p.rewardToken,
    //     n.keeper,
    //     n.devWallet,
    //     n.feeRecipient,
    //     n.gasPrice,
    //     n.raffle
    // );
    // await strategy.deployed();

    // console.log("## strategy:", strategy.address);
    // console.log(
    //     `npx hardhat verify --network mainnet ${strategy.address} ${lp.lpAddress} ${p.mastetChef} ${lp.poolId} ${p.router} ${n.wbnb} ${n.usdt} ${p.rewardToken} ${n.keeper} ${n.devWallet} ${n.feeRecipient} ${n.gasPrice} ${n.raffle}`
    // );

    // const DefiVault = await ethers.getContractFactory("DefiVault");
    // const vault = await DefiVault.deploy(strategy.address, name, symbol, 21600);
    // await vault.deployed();

    // await strategy.setVault(vault.address);

    // console.log("## vault:", vault.address);
    // console.log(
    //     `npx hardhat verify --network mainnet ${vault.address} ${strategy.address} "${name}" "${symbol}" ${21600}`
    // );

    try {
        const DefiVault = await ethers.getContractFactory("DefiVault");
        const DefiCommonStrategy = await ethers.getContractFactory("DefiCommonStrategy");
        const BEP40Token = await ethers.getContractFactory("BEP40Token");

        const vault = await DefiVault.attach("0x3aC9007A92DD08094fEb6a15cb6FDCd8436D197c");
        const strategyAddr = await vault.strategy();
        const strategy = await DefiCommonStrategy.attach(strategyAddr);
        const wantAddr = await vault.want();
        const want = await BEP40Token.attach(wantAddr);

        const allowance = BigNumber.from((await want.allowance(owner.address, vault.address)).toString());
        if (allowance.eq(0)) {
            const _tx = await want.approve(vault.address, ethers.utils.parseEther("100000"));
            await _tx.wait();
            console.log("approve done!");
        }

        const amount = ethers.utils.parseEther("0.1");
        const tx1 = await vault.deposit(amount);
        await tx1.wait();
        console.log("deposit done!");

        const tx2 = await strategy.harvest();
        await tx2.wait();
        console.log("harvest done!");
    } catch (ex) {
        console.log(ex);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

const {ethers} = require("hardhat");

async function main() {
    const [owner] = await ethers.getSigners();

    const testnet = {
        keeper: "0x7E4DF23577c0833c74a36C9a7DAF7b63BFf438bE",
        devWallet: "0x7E4DF23577c0833c74a36C9a7DAF7b63BFf438bE",
        feeRecipient: "0x7E4DF23577c0833c74a36C9a7DAF7b63BFf438bE",

        gasPrice: "0x060C737Bad608D3Eb104642427fAE92C46cC7a9B",
        raffle: "0x5eCbD57cc697B51C3d913b0bd194c7Cbb4cdaACC",
        helper: "0xEAef554111Ad167af6C9B4fEA91DB228b74AE198",
        specialPotHelper: "0xA7eAF122fEB58DE762abCE61C7eA16e73BC1FB28",

        wbnb: "0xCAba8F3ed2493CAC6AbEb493b4F10419d9c37e06",
        defi: "0xb64E0710e59ea2A08E65EB2496973F27e818664c",
    };

    const mainnet = {
        keeper: "0xBC080CB8588E4A946c4c5F98acd039426839e9C8",
        devWallet: "0xC27Ac1F5C585fb49A07683e6Ab86aECf50c572CC",
        feeRecipient: "0xD1a7a10ed0Fca59374021BB02c4C281AF4D29Bf0",

        gasPrice: "0x9f21E647439ae8107cE3B02cEBf5da9bf317961e",
        raffle: "",
        helper: "",
        specialPotHelper: "",

        wbnb: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        defi: "0xBdb44DF0A914c290DFD84c1eaf5899d285717fdc",
    };

    const defi = {
        mastetChef: "0xecABdE9d04506663c749D9B432b422Cb1dA3A3cB",
        router: "0x7F1d484f02d59E61AE4eC6FC0128ceCa8DF95C3d",
        rewardToken: testnet.defi,
        name: "Defi",

        defi: {
            lpAddress: testnet.defi,
            name: "DEFI",
            poolId: 0,
            isSpecialPot: true,
        },
        defiBnb: {
            lpAddress: "0x50d787Bb18dfFd6FA9fC95f62DF827FBE959fd06",
            name: "DEFI-BNB",
            poolId: 1,
        },
        defiBusd: {
            lpAddress: "0x2C67AF1f0CBDc2b6116149060Ca1Abf9AC7A0b24",
            name: "DEFI-BUSD",
            poolId: 2,
        },
        bnbBusd: {
            lpAddress: "0x32C14bb8d97Cd18eA3Db715BB4e075b89C3317B3",
            name: "BNB-BUSD",
            poolId: 3,
        },
    };

    const n = testnet;
    const p = defi;
    const lp = defi.bnbBusd;

    const name = `Defi-${p.name}-${lp.name} Vault LP`;
    const symbol = `Defi-${p.name}-${lp.name} VAULT`;
    console.log("#### LP:", name);

    let strategy;
    if (lp.isSpecialPot === true) {
        const DefiTokenStrategy = await ethers.getContractFactory("DefiTokenStrategy");
        strategy = await DefiTokenStrategy.deploy(
            lp.lpAddress,
            p.mastetChef,
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
            `npx hardhat verify --network testnet ${strategy.address} ${lp.lpAddress} ${p.mastetChef} ${p.router} ${n.wbnb} ${p.rewardToken} ${n.keeper} ${n.devWallet} ${n.feeRecipient} ${n.gasPrice} ${n.raffle}`
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
            `npx hardhat verify --network testnet ${strategy.address} ${lp.lpAddress} ${p.mastetChef} ${lp.poolId} ${p.router} ${n.wbnb} ${p.rewardToken} ${n.keeper} ${n.devWallet} ${n.feeRecipient} ${n.gasPrice} ${n.raffle}`
        );
    }

    const DefiVault = await ethers.getContractFactory("DefiVault");
    const vault = await DefiVault.deploy(strategy.address, name, symbol, 21600);
    await vault.deployed();

    await strategy.setVault(vault.address);

    console.log("## vault:", vault.address);
    console.log(
        `npx hardhat verify --network testnet ${vault.address} ${strategy.address} "${name}" "${symbol}" ${21600}`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

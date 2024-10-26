// Import necessary modules
import { JsonRpcProvider, RawSigner } from '@mysten/sui.js/providers/json-rpc-provider';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";

// Load private keys from file
function loadPrivateKeys() {
    const data = fs.readFileSync('data.txt', 'utf-8');
    return data.split('\n').filter(line => line.trim() !== '');
}

const privateKeys = loadPrivateKeys();
const privateKey = privateKeys[0];
const decodedPrivateKey = decodeSuiPrivateKey(privateKey);
const wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
const derivedAddress = wallet.getPublicKey().toSuiAddress();
console.log("Derived Address:", derivedAddress);

// Configuration
const config = {
    STAKENODEOPERATOR: "0xcf4b9402e7f156bc75082bc07581b0829f081ccfc8c444c71df4536ea33d094a",
    WAL: "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL",
    RPC: { NETWORK: "testnet", EXPLORER: "https://testnet.suivision.xyz/" },
    WALRUS_POOL_OBJECT_ID: "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914",
    STAKE_AMOUNT: 1,
};

// Set up JsonRpcProvider and RawSigner
const provider = new JsonRpcProvider(`https://fullnode.${config.RPC.NETWORK}.sui.io`);
const signer = new RawSigner(wallet, provider);

async function getWalBalance(address) {
    try {
        console.log(`Fetching WAL balance for address: ${address}`);
        const balance = await provider.getBalance({
            owner: address,
            coinType: config.WAL
        });
        console.log("Balance Retrieved:", balance);
        return parseInt(balance.totalBalance, 10);
    } catch (error) {
        console.error("Error getting balance:", error.message);
        return null;
    }
}

async function stakeWal() {
    try {
        const walBalance = await getWalBalance(derivedAddress);
        console.log("WAL Balance:", walBalance);
        if (walBalance === null || walBalance < config.STAKE_AMOUNT) {
            console.log("Insufficient WAL balance for staking.");
            return;
        }

        console.log(`Staking ${config.STAKE_AMOUNT} WAL to node ${config.STAKENODEOPERATOR}...`);

        const transaction = {
            packageObjectId: config.WAL,
            module: 'staking',
            function: 'stake',
            typeArguments: [],
            arguments: [
                config.WALRUS_POOL_OBJECT_ID,
                config.STAKENODEOPERATOR,
                config.STAKE_AMOUNT,
            ],
            gasBudget: 2000,
        };

        const result = await signer.signAndExecuteTransactionBlock({
            transactionBlock: transaction,
        });

        console.log("Transaction Status:", result.success ? "Success" : "Failed");
        console.log("Transaction Hash:", result.digest);
        console.log(`Explorer: ${config.RPC.EXPLORER}tx/${result.digest}`);
    } catch (error) {
        console.error("Error during staking:", error.message);
    }
}

// Execute staking
stakeWal();

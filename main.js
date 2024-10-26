// Import required modules
import fs from 'fs';
import { SuiClient } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Configuration
const config = {
    STAKENODEOPERATOR: "0xcf4b9402e7f156bc75082bc07581b0829f081ccfc8c444c71df4536ea33d094a",
    WAL: "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL",
    RPC: {
        NETWORK: "testnet",
        EXPLORER: "https://testnet.suivision.xyz/",
    },
    WALRUS_POOL_OBJECT_ID: "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914",
    STAKE_AMOUNT: 1,
};

// Load and decode the private key from data.txt
function loadPrivateKey() {
    const data = fs.readFileSync('data.txt', 'utf-8');
    return data.trim();
}

// Create Sui client
const client = new SuiClient({ network: config.RPC.NETWORK });

// Function to decode and derive the wallet address
function getWalletDetails() {
    const privateKey = loadPrivateKey();
    const decodedPrivateKey = decodeSuiPrivateKey(privateKey);
    const wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
    return wallet.getPublicKey().toSuiAddress();
}

// Function to get WAL balance
async function getWalBalance(address) {
    console.log(`Fetching balance for address: ${address}`);
    try {
        const balance = await client.getBalance(address, config.WAL);
        return balance;
    } catch (error) {
        console.error("Error getting balance:", error.message);
        return null;
    }
}

// Function to perform staking
async function stakeWal() {
    try {
        const address = getWalletDetails();
        console.log("Derived Address:", address);

        const walBalance = await getWalBalance(address);
        console.log("WAL Balance:", walBalance);

        if (walBalance === null || walBalance < config.STAKE_AMOUNT) {
            console.log("Insufficient WAL balance for staking.");
            return;
        }

        console.log(`Staking ${config.STAKE_AMOUNT} WAL to node ${config.STAKENODEOPERATOR}...`);
        const tx = await client.stake({
            amount: config.STAKE_AMOUNT,
            stakeNodeOperator: config.STAKENODEOPERATOR,
            poolObjectId: config.WALRUS_POOL_OBJECT_ID,
            privateKey: loadPrivateKey(),
        });

        const txStatus = await client.getTransactionStatus(tx.hash);
        console.log("Transaction Status:", txStatus.success ? "Success" : "Failed");
        console.log("Transaction Hash:", tx.hash);
        console.log(`Explorer: ${config.RPC.EXPLORER}tx/${tx.hash}`);
    } catch (error) {
        console.error("Error during staking:", error.message);
    }
}

// Execute staking
stakeWal();

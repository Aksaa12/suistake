// Import required modules
import fs from 'fs';
import { SuiClient } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

// Load private keys from file
function loadPrivateKeys() {
    const data = fs.readFileSync('data.txt', 'utf-8');
    return data.split('\n').filter(line => line.trim() !== ''); // Remove empty lines
}

// Load and decode private key
const privateKeys = loadPrivateKeys();
const privateKey = privateKeys[0];  // Use the first private key

// Decode private key and derive address
const decodedPrivateKey = decodeSuiPrivateKey(privateKey);
const wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
const derivedAddress = wallet.getPublicKey().toSuiAddress();

console.log("Derived Address:", derivedAddress);

// Validate the address
if (!isValidSuiAddress(derivedAddress)) {
    console.error("Invalid Sui Address format:", derivedAddress);
    return;
}

// Configuration
const config = {
    STAKENODEOPERATOR: "0xcf4b9402e7f156bc75082bc07581b0829f081ccfc8c444c71df4536ea33d094a",
    WAL: "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL", // Check format
    RPC: {
        NETWORK: "testnet",
        EXPLORER: "https://testnet.suivision.xyz/",
    },
    WALRUS_POOL_OBJECT_ID: "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914",
    STAKE_AMOUNT: 1,
};

// Create Sui client with specified RPC URL
const client = new SuiClient({ url: "https://fullnode.testnet.sui.io" });

// Function to get WAL balance
async function getWalBalance(address) {
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
        console.log("Derived Address:", derivedAddress);

        const walBalance = await getWalBalance(derivedAddress);
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
            privateKey: decodedPrivateKey.secretKey, // Pass the decoded private key for signing
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

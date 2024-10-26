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
const privateKey = privateKeys[0]; // Use the first private key

// Decode private key and derive address
const decodedPrivateKey = decodeSuiPrivateKey(privateKey);
const wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
const derivedAddress = wallet.getPublicKey().toSuiAddress();

console.log("Derived Address:", derivedAddress);

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

// Set up the SuiClient
const client = new SuiClient({ url: `https://fullnode.${config.RPC.NETWORK}.sui.io` });

// Function to get WAL balance with enhanced error logging
async function getWalBalance(address) {
    try {
        console.log(`Fetching WAL balance for address: ${address}`);
        const balance = await client.getBalance({
            owner: address,
            coinType: config.WAL
        });
        console.log("Balance Retrieved:", balance);
        return balance.totalBalance;
    } catch (error) {
        console.error("Error getting balance:", error.message);
        return null;
    }
}
// Function to get the list of coin objects
async function getCoinObjects(address) {
    try {
        const coinObjects = await client.getCoinObjects({
            owner: address,
            coinType: config.WAL
        });
        return coinObjects;
    } catch (error) {
        console.error("Error fetching coin objects:", error.message);
        return [];
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

        // Fetch the coin objects
        const coinObjects = await getCoinObjects(derivedAddress);

        if (coinObjects.length === 0) {
            console.error("No coin object found to stake.");
            return;
        }

        // Use the first coin object ID for staking
        const coinObjectId = coinObjects[0].id; // Adjust based on the actual structure of the object

        // Build the transaction
        const transaction = {
            kind: 'moveCall',
            packageObjectId: config.WALRUS_POOL_OBJECT_ID,
            module: 'wal',
            function: 'stake',
            typeArguments: [],
            arguments: [
                coinObjectId, // Pass the coin object ID
                config.STAKENODEOPERATOR, // Node operator
            ],
            gasBudget: 10000,
        };

        // Log the transaction object for debugging
        console.log("Transaction to be sent:", JSON.stringify(transaction, null, 2));

        // Execute the transaction
        const txBlock = await client.executeTransactionBlock({
            transaction,
            options: {
                sender: derivedAddress,
                gasBudget: 10000,
            },
        });

        const txStatus = await client.waitForTransaction(txBlock.digest);
        console.log("Transaction Status:", txStatus ? "Success" : "Failed");
        console.log("Transaction Hash:", txBlock.digest);
        console.log(`Explorer: ${config.RPC.EXPLORER}tx/${txBlock.digest}`);
    } catch (error) {
        console.error("Error during staking:", error.message);
        if (error.response) {
            console.error("Staking Error Response Data:", error.response.data);
        }
    }
}

// Execute staking
stakeWal();

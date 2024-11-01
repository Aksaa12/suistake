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
    GAS_BUDGET_MIN: 5000,
    GAS_BUDGET_MAX: 10000
};

// Set up the SuiClient
const client = new SuiClient({ url: `https://fullnode.${config.RPC.NETWORK}.sui.io` });

// Function to get WAL balance
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

// Function to determine gas budget within a range
function determineGasBudget() {
    const gasBudget = Math.floor(Math.random() * (config.GAS_BUDGET_MAX - config.GAS_BUDGET_MIN + 1)) + config.GAS_BUDGET_MIN;
    console.log("Chosen Gas Budget:", gasBudget);
    return gasBudget;
}

// Function to perform staking
async function stakeWal() {
    try {
        console.log("Derived Address:", derivedAddress);

        const walBalance = await getWalBalance(derivedAddress);
        console.log("WAL Balance:", walBalance);

        if (walBalance === null || walBalance < config.STAKE_AMOUNT) {
            console.log("Saldo WAL tidak cukup untuk dipertaruhkan.");
            return;
        }

        console.log(`Mempertaruhkan ${config.STAKE_AMOUNT} WAL ke node ${config.STAKENODEOPERATOR}...`);

        // Get coin objects
        const coinObjectsResponse = await client.getCoins({
            owner: derivedAddress,
            coinType: config.WAL
        });

        if (!coinObjectsResponse || !coinObjectsResponse.data || !Array.isArray(coinObjectsResponse.data) || coinObjectsResponse.data.length === 0) {
            console.error("No coin objects found for staking, or response format is unexpected.");
            console.log("Full coin objects response:", JSON.stringify(coinObjectsResponse, null, 2)); // Log the full response for debugging
            return;
        }

        const coinObjectId = coinObjectsResponse.data[0].coinObjectId;
        console.log("Coin Object ID:", coinObjectId);

        // Determine gas budget within the range
        const gasBudget = determineGasBudget();

        // Create transaction
        const transaction = {
            kind: 'move Call',
            packageObjectId: config.WALRUS_POOL_OBJECT_ID,
            module: 'wal',
            function: 'stake',
            typeArguments: [],
            arguments: [
                coinObjectId,
                config.STAKENODEOPERATOR,
            ],
            gasBudget
        };

        console.log("Transaction to be sent:", JSON.stringify(transaction, null, 2));

        // Execute transaction
        const txBlock = await client.executeTransactionBlock({
            transaction,
            options: {
                sender: derivedAddress,
                gasBudget
            },
        });

        // Log the response of txBlock for debugging
        console.log("Transaction Block Response:", JSON.stringify(txBlock, null, 2));

        // Check if txBlock and txBlock.digest are defined
        if (!txBlock || !txBlock.digest) {
            console.error("Transaction execution failed or digest is missing.");
            return;
        }

        const txStatus = await client.waitForTransaction(txBlock.digest);
        console.log("Transaction Status:", txStatus ? "Success" : "Failed");
        console.log("Transaction Hash:", txBlock.digest);
        console.log(`Explorer: ${config.RPC.EXPLORER}tx/${txBlock.digest}`);
    } catch (error) {
        console.error("Error staking:", error.message);
        if (error.response) {
            console.error("Error response:", error.response.data);
        }
    }
}

stakeWal();

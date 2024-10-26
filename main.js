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
        if (error.response) {
            console.error("Error Response Data:", error.response.data);
        }
        return null;
    }
}

// Set up the SuiClient
const client = new SuiClient({ url: `https://fullnode.${config.RPC.NETWORK}.sui.io` });

// Print available methods on the client
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
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

        // Membangun transaksi staking
        const transaction = {
            kind: 'moveCall',
            packageObjectId: config.WAL_PACKAGE_ID, // Sesuaikan dengan ID paket yang benar
            module: 'wal', // Modul yang sesuai
            function: 'stake', // Nama fungsi untuk staking
            typeArguments: [],
            arguments: [
                config.STAKE_AMOUNT.toString(), // Jumlah yang akan dipertaruhkan
                config.STAKENODEOPERATOR, // Node operator
                config.WALRUS_POOL_OBJECT_ID, // ID pool
            ],
            gasBudget: 10000, // Sesuaikan anggaran gas jika perlu
        };

        // Mengirim transaksi
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

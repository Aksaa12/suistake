// Import required modules
import fs from 'fs';
import { SuiClient } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import nacl from 'tweetnacl';
import base58 from 'bs58';

// Load private keys from file
function loadPrivateKeys() {
    const data = fs.readFileSync('data.txt', 'utf-8');
    return data.split('\n').filter(line => line.trim() !== ''); // Remove empty lines
}

// Load private keys
const privateKeys = loadPrivateKeys();
if (privateKeys.length === 0) {
    throw new Error("No private keys found in data.txt.");
}

// Validate private keys
privateKeys.forEach((key, index) => {
    console.log(`Key ${index + 1}:`, key);
    if (!key.startsWith('suiprivkey')) {
        throw new Error(`Invalid private key at line ${index + 1}. Key must start with 'suiprivkey'.`);
    }
    if (key.length > 66) {
        console.warn(`Private key at line ${index + 1} exceeds 66 characters. Trimming to 66 characters.`);
        key = key.slice(0, 66);
    }
    if (key.length !== 66) {
        throw new Error(`Invalid private key at line ${index + 1}. Key must be 66 characters long.`);
    }
});

// Decode private key
const base58Decoded = base58.decode(privateKeys[0].replace('suiprivkey', '')); // Remove prefix and decode
console.log("Base58 Decoded Key:", base58Decoded);

// Generate key pair
const keyPair = nacl.sign.keyPair.fromSeed(base58Decoded.slice(0, 32)); // Ensure only first 32 bytes are used for the seed
const publicKey = keyPair.publicKey;

// Derive the Sui address
function deriveSuiAddress(publicKey) {
    return `0x${Buffer.from(publicKey).toString('hex')}`;
}

const derivedAddress = deriveSuiAddress(publicKey);
console.log("Derived Address:", derivedAddress);

// Expected address for verification
const expectedAddress = '0xc95a0494528da9c7052d6e831eeb2564df253b6950c27ea5f2d679990abbc75e';
console.log("Expected Address:", expectedAddress);
console.log("Addresses Match:", derivedAddress === expectedAddress);

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

// Create Sui client
const client = new SuiClient({ network: config.RPC.NETWORK });

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
            privateKey: base58Decoded, // Pass the decoded private key for signing
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

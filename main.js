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
async function stakeWal() {
    try {
        console.log("Derived Address:", derivedAddress);

        // Ambil saldo WAL
        const walBalance = await getWalBalance(derivedAddress);
        console.log("WAL Balance:", walBalance);

        // Periksa apakah saldo cukup untuk dipertaruhkan
        if (walBalance === null || walBalance < config.STAKE_AMOUNT) {
            console.log("Saldo WAL tidak cukup untuk dipertaruhkan.");
            return;
        }

        console.log(`Mempertaruhkan ${config.STAKE_AMOUNT} WAL ke node ${config.STAKENODEOPERATOR}...`);

        // Ambil saldo
        const balanceResponse = await client.getBalance({
            owner: derivedAddress,
            coinType: config.WAL
        });

        console.log("Saldo Diperoleh:", JSON.stringify(balanceResponse, null, 2));

        // Periksa jumlah objek koin dalam respons saldo
        if (balanceResponse.coinObjectCount > 0) {
            console.log("Jumlah Objek Koin:", balanceResponse.coinObjectCount);
            
            // Ambil objek koin secara langsung
            const coinObjects = await client.getCoins({
                owner: derivedAddress,
                coinType: config.WAL
            });

            console.log("Objek Koin Diperoleh:", JSON.stringify(coinObjects, null, 2));

            // Periksa apakah ada objek koin yang diperoleh
            if (coinObjects && coinObjects.length > 0) {
                const coinObjectId = coinObjects[0].id; // Sesuaikan berdasarkan struktur aktual
                console.log("ID Objek Koin:", coinObjectId);

                // Bangun transaksi
                const transaction = {
                    kind: 'moveCall',
                    packageObjectId: walrusPoolObjectId, // Gunakan walrusPoolObjectId yang diberikan
                    module: 'wal',
                    function: 'stake',
                    typeArguments: [],
                    arguments: [
                        coinObjectId, // Kirim ID objek koin
                        config.STAKENODEOPERATOR, // Node operator
                    ],
                    gasBudget: 10000,
                };

                // Log objek transaksi untuk debugging
                console.log("Transaksi yang akan dikirim:", JSON.stringify(transaction, null, 2));

                // Eksekusi transaksi
                const txBlock = await client.executeTransactionBlock({
                    transaction,
                    options: {
                        sender: derivedAddress,
                        gasBudget: 10000,
                    },
                });

                const txStatus = await client.waitForTransaction(txBlock.digest);
                console.log("Status Transaksi:", txStatus ? "Sukses" : "Gagal");
                console.log("Hash Transaksi:", txBlock.digest);
                console.log(`Penjelajah: ${config.RPC.EXPLORER}tx/${txBlock.digest}`);
            } else {
                console.error("Tidak ada objek koin yang ditemukan untuk dipertaruhkan.");
            }
        } else {
            console.error("Tidak ada objek koin yang ditemukan dalam respons saldo.");
        }
    } catch (error) {
        console.error("Kesalahan saat mempertaruhkan:", error.message);
        if (error.response) {
            console.error("Data Respons Kesalahan Pertaruhan:", error.response.data);
        }
    }
}

// Eksekusi pertaruhan
stakeWal();


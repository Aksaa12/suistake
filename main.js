// Import modul yang diperlukan
import fs from 'fs';
import { SuiClient } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

// Memuat private key dari file
function loadPrivateKeys() {
    const data = fs.readFileSync('data.txt', 'utf-8');
    return data.split('\n').filter(line => line.trim() !== ''); // Menghapus baris kosong
}

// Load dan decode private key
const privateKeys = loadPrivateKeys();
const privateKey = privateKeys[0]; // Menggunakan private key pertama

// Decode private key dan derive address
const decodedPrivateKey = decodeSuiPrivateKey(privateKey);
const wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
const derivedAddress = wallet.getPublicKey().toSuiAddress();

console.log("Alamat yang Diturunkan:", derivedAddress);

// Konfigurasi
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

// Set up SuiClient
const client = new SuiClient({ url: `https://fullnode.${config.RPC.NETWORK}.sui.io` });

// Fungsi untuk mendapatkan saldo WAL
async function getWalBalance(address) {
    try {
        console.log(`Mengambil saldo WAL untuk alamat: ${address}`);
        const balance = await client.getBalance({
            owner: address,
            coinType: config.WAL
        });
        console.log("Saldo yang Diperoleh:", balance);
        return balance.totalBalance;
    } catch (error) {
        console.error("Kesalahan dalam mendapatkan saldo:", error.message);
        return null;
    }
}

// Fungsi untuk menentukan gas budget secara acak dalam rentang tertentu
function determineGasBudget() {
    const gasBudget = Math.floor(Math.random() * (config.GAS_BUDGET_MAX - config.GAS_BUDGET_MIN + 1)) + config.GAS_BUDGET_MIN;
    console.log("Gas Budget yang Dipilih:", gasBudget);
    return gasBudget;
}

// Fungsi untuk melakukan staking WAL
async function stakeWal() {
    try {
        console.log("Alamat yang Diturunkan:", derivedAddress);

        const walBalance = await getWalBalance(derivedAddress);
        console.log("Saldo WAL:", walBalance);

        if (walBalance === null || walBalance < config.STAKE_AMOUNT) {
            console.log("Saldo WAL tidak cukup untuk dipertaruhkan.");
            return;
        }

        console.log(`Mempertaruhkan ${config.STAKE_AMOUNT} WAL ke node ${config.STAKENODEOPERATOR}...`);

        // Mengambil objek koin WAL untuk staking
        let coinObjectId;
        try {
            const coinObjectsResponse = await client.getCoins({
                owner: derivedAddress,
                coinType: config.WAL
            });

            // Validasi apakah data ada
            if (!coinObjectsResponse || !coinObjectsResponse.data) {
                throw new Error("Format respons objek koin tidak valid atau data kosong.");
            }
            if (coinObjectsResponse.data.length === 0) {
                throw new Error("Tidak ada objek koin WAL yang ditemukan untuk staking.");
            }

            coinObjectId = coinObjectsResponse.data[0].coinObjectId;
            console.log("Coin Object ID:", coinObjectId);
        } catch (fetchError) {
            console.error("Kesalahan dalam mengambil objek koin WAL:", fetchError.message);
            return;
        }

        // Menentukan gas budget secara dinamis
        const gasBudget = determineGasBudget();

        // Persiapan detail transaksi
        const transaction = {
            kind: 'moveCall',
            packageObjectId: config.WALRUS_POOL_OBJECT_ID,
            module: 'wal',
            function: 'stake',
            typeArguments: [],
            arguments: [coinObjectId, config.STAKENODEOPERATOR],
            gasBudget
        };

        console.log("Transaksi yang akan dikirim:", JSON.stringify(transaction, null, 2));

        // Eksekusi blok transaksi
        let txBlock;
        try {
            txBlock = await client.executeTransactionBlock({
                transaction,
                options: {
                    sender: derivedAddress,
                    gasBudget
                },
            });
            console.log("Respons Blok Transaksi:", JSON.stringify(txBlock, null, 2));

            if (!txBlock || !txBlock.digest) {
                throw new Error("Eksekusi transaksi gagal atau digest hilang.");
            }
        } catch (execError) {
            console.error("Kesalahan dalam mengeksekusi transaksi:", execError.message);
            return;
        }

        // Menunggu konfirmasi
        try {
            const txStatus = await client.waitForTransaction(txBlock.digest);
            console.log("Status Transaksi:", txStatus ? "Sukses" : "Gagal");
            console.log("Hash Transaksi:", txBlock.digest);
            console.log(`Explorer: ${config.RPC.EXPLORER}tx/${txBlock.digest}`);
        } catch (confirmError) {
            console.error("Kesalahan dalam mengonfirmasi transaksi:", confirmError.message);
        }
    } catch (error) {
        console.error("Proses staking mengalami kesalahan:", error.message);
    }
}

// Eksekusi staking
stakeWal();

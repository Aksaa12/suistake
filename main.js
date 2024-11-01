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
    WALRUS_POOL_OBJECT_ID: "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914",
    STAKE_AMOUNT: 1,
    GAS_BUDGET: 5000 // Memperbaiki gas budget ke angka tetap untuk testing
};

// Set up SuiClient
const client = new SuiClient({ url: `https://fullnode.testnet.sui.io` });

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
        const coinObjectsResponse = await client.getCoins({
            owner: derivedAddress,
            coinType: config.WAL
        });

        // Tambahkan pemeriksaan untuk memastikan coinObjectsResponse valid
        console.log("Response Objek Koin:", coinObjectsResponse); // Debugging untuk melihat respons
        if (!coinObjectsResponse || !coinObjectsResponse.data) {
            console.error("Error: Respons koin tidak valid atau kosong.");
            return;
        }

        // Pastikan ada koin yang ditemukan
        const coinObjects = coinObjectsResponse.data || []; // Menghindari akses length jika data tidak ada

        if (coinObjects.length === 0) {
            console.error("Error: Tidak ada objek koin WAL yang ditemukan untuk staking.");
            return;
        }

        const coinObjectId = coinObjects[0].coinObjectId;
        console.log("Coin Object ID:", coinObjectId);

        // Persiapan detail transaksi
        const transaction = {
            kind: 'moveCall',
            packageObjectId: config.WALRUS_POOL_OBJECT_ID,
            module: 'wal',
            function: 'stake',
            typeArguments: [],
            arguments: [coinObjectId, config.STAKENODEOPERATOR],
            gasBudget: config.GAS_BUDGET // Menggunakan gas budget tetap
        };

        console.log("Transaksi yang akan dikirim:", JSON.stringify(transaction, null, 2));

        // Eksekusi blok transaksi
        const txBlock = await client.executeTransactionBlock({
            transaction,
            options: {
                sender: derivedAddress,
                gasBudget: config.GAS_BUDGET
            },
        });

        console.log("Respons Blok Transaksi:", JSON.stringify(txBlock, null, 2));

        if (!txBlock || !txBlock.digest) {
            throw new Error("Eksekusi transaksi gagal atau digest hilang.");
        }

        // Menunggu konfirmasi
        const txStatus = await client.waitForTransaction(txBlock.digest);
        console.log("Status Transaksi:", txStatus ? "Sukses" : "Gagal");
        console.log("Hash Transaksi:", txBlock.digest);
        console.log(`Explorer: https://testnet.suivision.xyz/tx/${txBlock.digest}`);
    } catch (error) {
        console.error("Proses staking mengalami kesalahan:", error.message);
    }
}

// Eksekusi staking
stakeWal();

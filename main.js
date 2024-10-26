// Import yang diperlukan
import fs from 'fs';
import { SuiClient } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import nacl from 'tweetnacl';

// Fungsi untuk memuat private keys dari file
function loadPrivateKeys() {
    try {
        const data = fs.readFileSync('data.txt', 'utf-8');
        const keys = data.split('\n').filter(line => line.trim() !== ''); // Menghapus baris kosong
        console.log("Loaded Private Keys:", keys); // Log kunci privat yang dimuat
        return keys;
    } catch (error) {
        console.error("Error reading private keys from file:", error.message);
        throw error; // Lempar error untuk ditangani di tempat lain
    }
}

// Memuat kunci privat dari file
const privateKeys = loadPrivateKeys();
console.log("Private Keys:", privateKeys); // Log private keys untuk verifikasi

// Pastikan ada kunci privat yang dimuat
if (privateKeys.length === 0) {
    throw new Error("Tidak ada kunci privat yang ditemukan di data.txt.");
}

// Periksa validitas kunci privat
privateKeys.forEach((key, index) => {
    console.log(`Key ${index + 1}:`, key);
    // Periksa apakah kunci privat dimulai dengan 'suiprivkey' dan panjangnya 66 karakter
    if (!key.startsWith('suiprivkey') || key.length !== 66) {
        throw new Error(`Kunci privat tidak valid pada baris ${index + 1}. Kunci harus diawali dengan 'suiprivkey' dan panjangnya 66 karakter.`);
    }
});

// Decode private key pertama untuk mendapatkan secretKey
const decodedKey = decodeSuiPrivateKey(privateKeys[0]); // Gunakan kunci pertama
console.log("Decoded Key:", decodedKey); // Log hasil decode untuk verifikasi
console.log("Decoded Secret Key:", decodedKey.secretKey); // Log secretKey untuk verifikasi

// Dapatkan public key dari secretKey menggunakan tweetnacl
const keyPair = nacl.sign.keyPair.fromSeed(decodedKey.secretKey);
const publicKey = keyPair.publicKey;
console.log("Public Key Buffer:", Buffer.from(publicKey).toString('hex')); // Log buffer publik

// Mengonversi publicKey ke format alamat Sui
const address = `0x${Buffer.from(publicKey).toString('hex')}`; // Konversi ke hex dan tambahkan prefix '0x'

// Memastikan panjang dan format alamat
console.log("Address:", address); // Log alamat yang diperoleh dari public key

// Verifikasi alamat yang diharapkan
const expectedAddress = '0xc95a0494528da9c7052d6e831eeb2564df253b6950c27ea5f2d679990abbc75e';
console.log("Expected Address:", expectedAddress);
console.log("Addresses Match:", address === expectedAddress);

// Konfigurasi
const config = {
    STAKENODEOPERATOR: "0xcf4b9402e7f156bc75082bc07581b0829f081cc8c444c71df4536ea33d094a",
    WAL: "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL",
    RPC: {
        NETWORK: "testnet",
        EXPLORER: "https://testnet.suivision.xyz/",
    },
    WALRUS_POOL_OBJECT_ID: "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914",
    STAKE_AMOUNT: 1,
};

// Buat client SUI
const client = new SuiClient({ network: config.RPC.NETWORK });

// Fungsi untuk mendapatkan saldo WAL
async function getWalBalance(address) {
    try {
        const balance = await client.getBalance(address, config.WAL);
        return balance;
    } catch (error) {
        console.error("Error getting balance:", error.message);
        return null; // Kembalikan null jika ada kesalahan
    }
}

// Fungsi untuk melakukan staking
async function stakeWal() {
    try {
        // Tampilkan alamat yang diperoleh dari public key
        console.log("Address:", address);

        // Dapatkan saldo WAL
        const walBalance = await getWalBalance(address);
        console.log("Saldo WAL:", walBalance);

        // Cek apakah saldo mencukupi untuk staking
        if (walBalance === null || walBalance < config.STAKE_AMOUNT) {
            console.log("Saldo WAL tidak mencukupi untuk staking.");
            return;
        }

        // Lakukan staking
        console.log(`Proses staking ${config.STAKE_AMOUNT} WAL ke node ${config.STAKENODEOPERATOR}...`);
        const tx = await client.stake({
            amount: config.STAKE_AMOUNT,
            stakeNodeOperator: config.STAKENODEOPERATOR,
            poolObjectId: config.WALRUS_POOL_OBJECT_ID,
            privateKey: privateKeys[0], // Tambahkan kunci privat di sini
        });

        // Tampilkan status transaksi
        const txStatus = await client.getTransactionStatus(tx.hash);
        console.log("Status Transaksi:", txStatus.success ? "Berhasil" : "Gagal");
        console.log("Hash Transaksi:", tx.hash);
        console.lo

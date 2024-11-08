import axios from 'axios';
import fs from 'fs';

const SUI_RPC_URL = "https://rpc-testnet.suiscan.xyz/";  // Ganti dengan RPC URL baru
const SYSTEM_OBJECT = "0x50b84b68eb9da4c6d904a929f43638481c09c03be6274b8569778fe085c1590d";  // Sistem objek yang terkait
const STAKING_OBJECT = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";  // Staking objek yang diberikan
const EXCHANGE_OBJECT = "0x0e60a946a527902c90bbc71240435728cd6dc26b9e8debc69f09b71671c3029b";  // Exchange objek yang diberikan
const WAL_COIN_ADDRESS = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL";  // Alamat koin WAL

function loadPrivateKey(filePath = "data.txt") {
    return fs.readFileSync(filePath, "utf8").trim();
}

async function stakeWalToWalrusPool() {
    const privateKey = loadPrivateKey();

    // Payload untuk staking
    const payload = {
        "jsonrpc": "2.0",
        "method": "sui_moveCall",  // Memanggil metode staking
        "id": 1,
        "params": [
            null, // ID akun
            {
                "package_object_id": SYSTEM_OBJECT,  // Menggunakan system object
                "module": "staking",  // Modul staking yang relevan
                "function": "stake",  // Fungsi staking
                "type_arguments": [WAL_COIN_ADDRESS],  // Jenis koin WAL
                "arguments": [
                    STAKING_OBJECT, // Menggunakan staking object
                    "1"  // Jumlah WAL yang ingin di-stake
                ],
                "gas_budget": 10000
            },
            privateKey  // Private key pengguna
        ]
    };

    try {
        // Mengirimkan permintaan staking
        const response = await axios.post(SUI_RPC_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Mengecek hasil dari transaksi staking
        if (response.data.error) {
            console.error("Terjadi kesalahan:", response.data.error);
        } else {
            console.log("Transaksi staking berhasil, ID transaksi:", response.data.result.tx_digest);
        }
    } catch (error) {
        console.error("Kesalahan saat mengirim transaksi:", error);
    }
}

stakeWalToWalrusPool();

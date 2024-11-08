import axios from 'axios';
import fs from 'fs';

const SUI_RPC_URL = "https://rpc-testnet.suiscan.xyz/"; // Ganti dengan RPC URL baru
const OPERATOR_STAKE_ID = "0x70bc82baec578437bf2f61ce024c2b6da46038ddbcb95dbfc72a2151103a8097"; // ID operator staking
const WALRUS_POOL_OBJECT_ID = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914"; // ID pool staking
const WAL_COIN_ADDRESS = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL"; // Alamat koin WAL

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
                "package_object_id": "0x2",  // Pastikan ini ID paket yang benar
                "module": "staking",  // Modul staking yang relevan
                "function": "stake",  // Fungsi staking
                "type_arguments": [WAL_COIN_ADDRESS],  // Jenis koin WAL
                "arguments": [
                    WALRUS_POOL_OBJECT_ID, // ID pool staking
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

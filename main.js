import axios from 'axios';
import fs from 'fs';

const SUI_RPC_URL = "https://fullnode.testnet.sui.io:443";
const WALRUS_POOL_OBJECT_ID = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";
const WAL_COIN_ADDRESS = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL";

function loadPrivateKey(filePath = "data.txt") {
    return fs.readFileSync(filePath, "utf8").trim();
}

function stakeWalToWalrusPool() {
    const privateKey = loadPrivateKey();
    const payload = {
        "jsonrpc": "2.0",
        "method": "submitTransaction",  // Menggunakan submitTransaction jika sesuai
        "id": 1,
        "params": [
            {
                "package_object_id": "0x2",  // Sesuaikan dengan ID yang benar
                "module": "staking",  // Modul staking
                "function": "stake",  // Fungsi stake
                "type_arguments": [WAL_COIN_ADDRESS],
                "arguments": [
                    WALRUS_POOL_OBJECT_ID,
                    "1"
                ],
                "gas_budget": 10000
            },
            privateKey
        ]
    };

    axios.post(SUI_RPC_URL, payload, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.data.error) {
            console.error("Terjadi kesalahan:", response.data.error);
        } else {
            console.log("Transaksi staking berhasil, ID transaksi:", response.data.result.tx_digest);
        }
    })
    .catch(error => {
        console.error("Kesalahan saat mengirim transaksi:", error);
    });
}

stakeWalToWalrusPool();

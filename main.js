import axios from 'axios';
import fs from 'fs';

// URL RPC SUI Testnet
const SUI_RPC_URL = "https://rpc-testnet.suiscan.xyz/";

// Object ID untuk sistem dan pool Walrus
const SYSTEM_OBJECT = "0x50b84b68eb9da4c6d904a929f43638481c09c03be6274b8569778fe085c1590d";  // Sistem objek
const STAKING_OBJECT = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";  // Objek Pool Walrus
const WAL_COIN_ADDRESS = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL";  // Alamat WAL

// Stakeholder walrus
const STAKENODEOPERATOR = "0xcf4b9402e7f156bc75082bc07581b0829f081ccfc8c444c71df4536ea33d094a";  // Alamat Node Walrus

// Fungsi untuk memuat private key dari file
function loadPrivateKey(filePath = "data.txt") {
  return fs.readFileSync(filePath, "utf8").trim();
}

// Fungsi untuk melakukan staking
async function stakeWalToWalrusPool() {
  const privateKey = loadPrivateKey();  // Memuat private key dari file
  
  // Payload untuk transaksi staking
  const payload = {
    "jsonrpc": "2.0",
    "method": "sui_moveCall",  // Metode untuk melakukan aksi di kontrak
    "id": 1,
    "params": [
      null,  // ID akun (gunakan ID yang sesuai untuk akun wallet Anda)
      {
        "package_object_id": SYSTEM_OBJECT,  // ID objek sistem
        "module": "staking",  // Nama modul untuk staking
        "function": "stake",  // Fungsi yang dipanggil untuk staking
        "type_arguments": [WAL_COIN_ADDRESS],  // Koin yang di-stake (WAL)
        "arguments": [
          STAKING_OBJECT,  // ID objek pool Walrus
          "1"  // Jumlah WAL yang ingin di-stake (1 WAL)
        ],
        "gas_budget": 10000  // Budget gas untuk transaksi
      },
      privateKey  // Private key untuk transaksi
    ]
  };

  try {
    // Mengirimkan permintaan RPC untuk staking
    const response = await axios.post(SUI_RPC_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Menangani respons
    if (response.data.error) {
      console.error("Terjadi kesalahan:", response.data.error);
    } else {
      console.log("Transaksi staking berhasil, ID transaksi:", response.data.result.tx_digest);
    }
  } catch (error) {
    console.error("Kesalahan saat mengirim transaksi:", error);
  }
}

// Menjalankan fungsi staking
stakeWalToWalrusPool();

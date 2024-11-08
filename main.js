import requests
import json

# URL JSON-RPC untuk testnet SUI
SUI_RPC_URL = "https://fullnode.testnet.sui.io:443"  # Sesuaikan jika berbeda

# Alamat objek Walrus Pool untuk staking
WALRUS_POOL_OBJECT_ID = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914"

# Alamat koin WAL
WAL_COIN_ADDRESS = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL"

# Fungsi untuk membaca private key dari file data.txt
def load_private_key(file_path="data.txt"):
    with open(file_path, "r") as file:
        private_key = file.read().strip()  # Membaca dan membersihkan spasi putih atau newline
    return private_key

# Fungsi untuk mengirim transaksi staking
def stake_wal_to_walrus_pool():
    # Membaca private key dari file
    private_key = load_private_key()

    # Membuat payload transaksi staking
    payload = {
        "jsonrpc": "2.0",
        "method": "sui_moveCall",
        "id": 1,
        "params": [
            None,  # Tidak memerlukan alamat dompet karena kita menggunakan private key
            {
                "package_object_id": "0x2",  # Paket staking default; sesuaikan jika berbeda
                "module": "staking",
                "function": "stake",
                "type_arguments": [WAL_COIN_ADDRESS],  # Alamat koin WAL
                "arguments": [
                    WALRUS_POOL_OBJECT_ID,  # Alamat objek Walrus Pool
                    "1"  # Jumlah WAL yang akan di-stake
                ],
                "gas_budget": 10000  # Anggaran gas, sesuaikan jika diperlukan
            },
            private_key  # Menggunakan private key dari file
        ]
    }

    # Kirim permintaan JSON-RPC ke node SUI
    response = requests.post(SUI_RPC_URL, headers={"Content-Type": "application/json"}, data=json.dumps(payload))
    result = response.json()

    if "error" in result:
        print("Terjadi kesalahan:", result["error"])
    else:
        print("Transaksi staking berhasil, ID transaksi:", result["result"]["tx_digest"])

# Menjalankan fungsi staking otomatis
stake_wal_to_walrus_pool()

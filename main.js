// Dependencies
require = require("esm")(module);
const { SuiClient } = require("@mysten/sui.js");
const fs = require("fs");


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
};

// Muat private key dari file
const privateKey = fs.readFileSync("data.txt", "utf8").trim();

// Buat client SUI
const client = new SuiClient({ network: config.RPC.NETWORK, privateKey });

// Fungsi untuk mendapatkan saldo WAL
async function getWalBalance(address) {
  const balance = await client.getBalance(address, config.WAL);
  return balance;
}

// Fungsi untuk melakukan staking
async function stakeWal() {
  try {
    const address = client.getAddress();

    // Dapatkan saldo WAL
    const walBalance = await getWalBalance(address);
    console.log("Address:", address);
    console.log("Saldo WAL:", walBalance);

    if (walBalance < config.STAKE_AMOUNT) {
      console.log("Saldo WAL tidak mencukupi untuk staking.");
      return;
    }

    // Lakukan staking
    console.log(`Proses staking ${config.STAKE_AMOUNT} WAL ke node ${config.STAKENODEOPERATOR}...`);
    const tx = await client.stake({
      amount: config.STAKE_AMOUNT,
      stakeNodeOperator: config.STAKENODEOPERATOR,
      poolObjectId: config.WALRUS_POOL_OBJECT_ID,
    });

    // Tampilkan status transaksi
    const txStatus = await client.getTransactionStatus(tx.hash);
    console.log("Status Transaksi:", txStatus.success ? "Berhasil" : "Gagal");
    console.log("Hash Transaksi:", tx.hash);
    console.log(`Explorer: ${config.RPC.EXPLORER}tx/${tx.hash}`);
  } catch (error) {
    console.error("Terjadi kesalahan saat staking:", error.message);
  }
}

// Eksekusi staking
stakeWal();

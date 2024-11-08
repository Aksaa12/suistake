import fs from 'fs';
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

// Definisi variabel dan konstanta yang diperlukan
const MIST_PER_SUI = 1000000000; // 1 SUI = 1,000,000,000 MIST
const COINENUM = {
  SUI: "0x2::sui::SUI",
  WAL: "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL",
};
const logger = {
  info: console.log,
  error: console.error,
};

export default class Core {
  constructor(privateKey) {
    this.acc = privateKey;
    this.txCount = 0;
    this.client = new SuiClient({ url: getFullnodeUrl("testnet") });
    this.walrusAddress = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef";
    this.walrusPoolObjectId = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";
    this.stakeNodeOperator = "0xcf4b9402e7f156bc75082bc07581b0829f081ccfc8c444c71df4536ea33d094a";
  }

  // Fungsi untuk membaca private key dari file
  async readPrivateKey() {
    try {
      const privateKey = fs.readFileSync('data.txt', 'utf8').trim(); // Membaca file data.txt
      return privateKey;
    } catch (error) {
      throw new Error('Failed to read private key from file: ' + error.message);
    }
  }

  // Fungsi untuk mendapatkan informasi akun dan mempersiapkan transaksi
  async getAccountInfo() {
    try {
      const decodedPrivateKey = decodeSuiPrivateKey(this.acc);
      this.wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
      this.address = this.wallet.getPublicKey().toSuiAddress();
      logger.info("Successfully retrieved account info: " + this.address);
    } catch (error) {
      throw new Error("Failed to get account info: " + error.message);
    }
  }

  // Fungsi untuk staking
  async stakeOneWalToOperator() {
    try {
      // Ambil koin WAL yang tersedia
      const coins = await this.client.getCoins({
        owner: this.address,
        coinType: COINENUM.WAL,
      });

      if (!coins || coins.data.length === 0) {
        throw new Error("No WAL coins found in the account");
      }

      const coin = coins.data[0];
      console.log("Coin object:", coin);

      // Pastikan koin memiliki saldo dan coinObjectId
      if (!coin.balance || !coin.coinObjectId) {
        throw new Error("Coin balance or coinObjectId is missing");
      }

      const coinBalance = BigInt(coin.balance);
      const balanceToStake = BigInt(1 * MIST_PER_SUI); // Staking 1 WAL in Mist

      console.log(`Coin balance (in Mist): ${coinBalance}`);
      console.log(`Balance to stake (in Mist): ${balanceToStake}`);

      // Mengecek saldo cukup untuk staking
      if (coinBalance < balanceToStake) {
        throw new Error("Not enough WAL balance to stake");
      }

      // Ambil objek pool dan operator
      const poolObject = await this.client.getObject({
        id: this.walrusPoolObjectId,
        options: {
          showBcs: true,
          showContent: true,
        },
      });

      const operatorObject = await this.client.getObject({
        id: this.stakeNodeOperator,
        options: {
          showBcs: true,
          showContent: true,
        },
      });

      // Membuat transaksi staking
      const transaction = new Transaction();

      // Referensikan objek pool yang akan digunakan
      const sharedPoolObject = transaction.sharedObjectRef({
        objectId: poolObject.data.objectId,
        mutable: true,
      });

      // Split coins dengan balance yang valid
      const splitResult = await transaction.splitCoins(
        transaction.object(coin.coinObjectId),
        [balanceToStake] // Pastikan balance sudah dalam unit Mist
      );

      console.log("Split coins result:", splitResult);

      // Tangani hasil split dengan benar
      if (!splitResult || !splitResult.Result) {
        throw new Error("Failed to split coins correctly");
      }

      const coinToStake = splitResult.Result;
      console.log("Coin to stake:", coinToStake);

      // Staking ke pool dengan operator
      const stakedCoin = transaction.moveCall({
        target: `${this.walrusAddress}::staking::stake_with_pool`,
        arguments: [
          sharedPoolObject,
          transaction.object(coinToStake),
          transaction.object(operatorObject.data.objectId),
        ],
      });

      console.log("Staked coin:", stakedCoin);

      // Transfer objek yang sudah di-stake
      await transaction.transferObjects([stakedCoin], this.address);
      await this.executeTx(transaction);
    } catch (error) {
      console.error("Error during staking: " + error.message);
      throw error;
    }
  }

  // Fungsi untuk mengeksekusi transaksi
  async executeTx(transaction) {
    try {
      logger.info("Executing transaction...");
      const result = await this.client.signAndExecuteTransaction({
        signer: this.wallet,
        transaction: transaction,
      });
      logger.info("Transaction executed: " + result.digest);
    } catch (error) {
      throw new Error("Transaction execution failed: " + error.message);
    }
  }

  // Fungsi utama untuk menjalankan staking
  async runStaking() {
    try {
      const privateKey = await this.readPrivateKey();
      this.acc = privateKey;
      await this.getAccountInfo();
      await this.stakeOneWalToOperator(); // Staking 1 WAL
    } catch (error) {
      logger.error("Error during staking process: " + error.message);
    }
  }
}

// Menjalankan staking secara otomatis
const core = new Core('');
core.runStaking();

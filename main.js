async function stakeWal() {
    try {
        console.log("Derived Address:", derivedAddress);

        const walBalance = await getWalBalance(derivedAddress);
        console.log("WAL Balance:", walBalance);

        if (walBalance === null || walBalance < config.STAKE_AMOUNT) {
            console.log("Insufficient WAL balance for staking.");
            return;
        }

        console.log(`Staking ${config.STAKE_AMOUNT} WAL to node ${config.STAKENODEOPERATOR}...`);

        // Membangun transaksi staking
        const transaction = {
            kind: 'moveCall',
            packageObjectId: config.WAL_PACKAGE_ID, // Sesuaikan dengan ID paket yang benar
            module: 'wal', // Modul yang sesuai
            function: 'stake', // Nama fungsi untuk staking
            typeArguments: [],
            arguments: [
                config.STAKE_AMOUNT.toString(), // Jumlah yang akan dipertaruhkan
                config.STAKENODEOPERATOR, // Node operator
                config.WALRUS_POOL_OBJECT_ID, // ID pool
            ],
            gasBudget: 10000, // Sesuaikan anggaran gas jika perlu
        };

        // Log transaksi untuk debugging
        console.log("Transaction to be sent:", JSON.stringify(transaction, null, 2));

        // Mengirim transaksi
        const txBlock = await client.executeTransactionBlock({
            transaction,
            options: {
                sender: derivedAddress,
                gasBudget: 10000,
            },
        });

        const txStatus = await client.waitForTransaction(txBlock.digest);
        console.log("Transaction Status:", txStatus ? "Success" : "Failed");
        console.log("Transaction Hash:", txBlock.digest);
        console.log(`Explorer: ${config.RPC.EXPLORER}tx/${txBlock.digest}`);
    } catch (error) {
        console.error("Error during staking:", error.message);
        if (error.response) {
            console.error("Staking Error Response Data:", error.response.data);
        }
    }
}

// Execute staking
stakeWal();

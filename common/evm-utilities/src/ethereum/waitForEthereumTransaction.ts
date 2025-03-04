import type { ethers, Provider, TransactionReceipt } from 'ethers';

import { Async, Log } from '@molecula-monorepo/common.utilities';

const log = new Log('waitForEthereumTransaction');

/**
 * A utility to wait for the Tron transaction to succeed.
 * @param rpcProvider - a rpc provider to interact with Ethereum.
 * @param transactionId - an Id of the transaction to wait for.
 * @param silent - a flag to silent the debug info.
 * @returns a transaction info once it's succeeded.
 * @throws an error in case the transaction hasn't succeeded.
 */
export async function waitForEthereumTransaction(
    rpcProvider: Provider,
    transactionId: string,
    silent?: boolean,
): Promise<ethers.TransactionReceipt> {
    // Get the transaction info
    let info: TransactionReceipt | null | undefined;
    try {
        info = await rpcProvider.getTransactionReceipt(transactionId);
    } catch (error) {
        log.debug('Failed to get the transaction info with error:', error);

        // It might throw in case of a network failure, e.g. ERR_NETWORK_CHANGED
        // It's OK, just try again below
    }

    // Check if it has the "receipt"
    if (info && 'status' in info) {
        if (!silent) {
            log.debug('The awaited transaction info:', info);
        }

        // Check if the transaction has succeeded
        if (info.status !== 1 /** Success */) {
            throw new Error("Transaction has't succeeded");
        }

        // Return the transaction info
        return info;
    }

    // Try again in 3 seconds if no
    await Async.timeout(3000);

    // Call again recursively
    return waitForEthereumTransaction(rpcProvider, transactionId);
}

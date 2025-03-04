import type TronWeb from 'tronweb';
import type { Transaction } from 'tronweb/interfaces';

import {
    abi as ABI,
    bytecode as BYTECODE,
} from '../../artifacts/contracts/common/mUSDLock.sol/MUSDLock.json';

import { waitForDeployment } from './waitForDeployment';

export async function deploymUSDLock(
    tronWeb: TronWeb,
    privateKey: string,
    rebaseTokenAddress: string,
): Promise<string> {
    // Find an account address corresponding to the given PRIVATE_KEY
    const issuerAddress = tronWeb.address.fromPrivateKey(privateKey);

    const transaction = (await tronWeb.transactionBuilder.createSmartContract(
        {
            feeLimit: 2000000000, // The maximum TRX burns for resource consumption（1TRX = 1,000,000SUN
            // @ts-ignore (probably wrong type annotation)
            abi: ABI,
            bytecode: BYTECODE,
            // @ts-ignore (probably wrong type annotation)
            parameters: [rebaseTokenAddress],
        },
        issuerAddress,
    )) as Transaction;

    // Send the transactions
    await tronWeb.trx.sendRawTransaction(await tronWeb.trx.sign(transaction, privateKey));

    return waitForDeployment(tronWeb, transaction);
}

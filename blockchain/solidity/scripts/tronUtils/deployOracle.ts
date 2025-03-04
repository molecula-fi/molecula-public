import type TronWeb from 'tronweb';
import type { Transaction } from 'tronweb/interfaces';

import {
    abi as ORACLE_ABI,
    bytecode as ORACLE_BYTECODE,
} from '../../artifacts/contracts/solutions/Carbon/tron/TronOracle.sol/TronOracle.json';

import { waitForDeployment } from './waitForDeployment';

export async function deployOracle(
    tronWeb: TronWeb,
    privateKey: string,
    initialShares: bigint,
    initialPool: bigint,
    initialOwner: string,
    accountantAddress: string,
    authorizedUpdater: string,
): Promise<string> {
    // Find an account address corresponding to the given PRIVATE_KEY
    const issuerAddress = tronWeb.address.fromPrivateKey(privateKey);

    const transaction = (await tronWeb.transactionBuilder.createSmartContract(
        {
            feeLimit: 1000000000, // The maximum TRX burns for resource consumption（1TRX = 1,000,000SUN
            // @ts-ignore (probably wrong type annotation)
            abi: ORACLE_ABI,
            bytecode: ORACLE_BYTECODE,
            // @ts-ignore (probably wrong type annotation)
            parameters: [
                initialShares,
                initialPool,
                initialOwner,
                accountantAddress,
                authorizedUpdater,
            ],
        },
        issuerAddress,
    )) as Transaction;

    // Send the transactions
    await tronWeb.trx.sendRawTransaction(await tronWeb.trx.sign(transaction, privateKey));

    return waitForDeployment(tronWeb, transaction);
}

export async function setOracleAccountant(
    tronWeb: TronWeb,
    oracleAddress: string,
    accountantAddress: string,
) {
    const oracleContract = await tronWeb.contract(ORACLE_ABI, oracleAddress);
    // @ts-ignore (Missing types for contracts)
    await oracleContract.setAccountant(accountantAddress).send();
}

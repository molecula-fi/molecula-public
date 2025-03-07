import type TronWeb from 'tronweb';
import type { Transaction } from 'tronweb/interfaces';

import {
    abi as ABI,
    bytecode as BYTECODE,
} from '../../../artifacts/contracts/solutions/Carbon/tron/Treasury.sol/Treasury.json';

import { waitForDeployment } from './waitForDeployment';

export async function deployTreasury(
    tronWeb: TronWeb,
    privateKey: string,
    params: {
        initialOwner: string;
        authorizedServer: string;
        lzEndpoint: string;
        accountantAddress: string;
        tokenAddress: string;
        lzOpt: string;
        authorizedLZConfigurator: string;
        lzDstEid: number;
        swftBridgeAddress: string;
        swftDest: string;
    },
): Promise<string> {
    // Find an account address corresponding to the given PRIVATE_KEY
    const issuerAddress = tronWeb.address.fromPrivateKey(privateKey);

    const transaction = (await tronWeb.transactionBuilder.createSmartContract(
        {
            feeLimit: 5000000000, // The maximum TRX burns for resource consumption（1TRX = 1,000,000SUN
            // @ts-ignore (probably wrong type annotation)
            abi: ABI,
            bytecode: BYTECODE,
            // @ts-ignore (probably wrong type annotation)
            parameters: [
                params.initialOwner,
                params.authorizedServer,
                params.lzEndpoint,
                params.accountantAddress,
                params.tokenAddress,
                params.lzOpt,
                params.authorizedLZConfigurator,
                params.lzDstEid,
                params.swftBridgeAddress,
                params.swftDest,
            ],
        },
        issuerAddress,
    )) as Transaction;

    // Send the transactions
    await tronWeb.trx.sendRawTransaction(await tronWeb.trx.sign(transaction, privateKey));

    return waitForDeployment(tronWeb, transaction);
}

export async function treasurySetGasLimit(
    tronWeb: TronWeb,
    params: {
        treasury: string;
        msgType: number;
        baseValue: number;
        unitValue: number;
    },
) {
    const treasury = tronWeb.contract(ABI, params.treasury);
    // Set treasury address
    await treasury
        // @ts-ignore (Missing types for contracts)
        .setGasLimit(params.msgType, params.baseValue, params.unitValue)
        .send();
}

export async function treasurySetAuthorizedLZConfigurator(
    tronWeb: TronWeb,
    params: {
        treasury: string;
        authorizedLZConfigurator: string;
    },
) {
    const treasury = tronWeb.contract(ABI, params.treasury);
    // Set treasury address
    await treasury
        // @ts-ignore (Missing types for contracts)
        .setAuthorizedLZConfigurator(params.authorizedLZConfigurator)
        .send();
}

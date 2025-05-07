import { type HardhatRuntimeEnvironment } from 'hardhat/types';
import type { TronWeb } from 'tronweb';

import { waitForDeployment } from './waitForDeployment';

export async function deploymUSDLock(
    hre: HardhatRuntimeEnvironment,
    tronWeb: TronWeb,
    privateKey: string,
    rebaseTokenAddress: string,
): Promise<string> {
    // Find an account address corresponding to the given PRIVATE_KEY
    const issuerAddress = tronWeb.address.fromPrivateKey(privateKey);

    if (!issuerAddress) {
        throw new Error('Invalid private key');
    }

    const artifact = await hre.artifacts.readArtifact('MUSDLock');

    const transaction = await tronWeb.transactionBuilder.createSmartContract(
        {
            feeLimit: 2000000000, // The maximum TRX burns for resource consumption（1TRX = 1,000,000SUN
            // @ts-ignore (probably wrong type annotation)
            abi: artifact.abi,
            bytecode: artifact.bytecode,
            // @ts-ignore (probably wrong type annotation)
            parameters: [rebaseTokenAddress],
        },
        issuerAddress,
    );

    // Send the transactions
    await tronWeb.trx.sendRawTransaction(await tronWeb.trx.sign(transaction, privateKey));

    return waitForDeployment(tronWeb, transaction);
}

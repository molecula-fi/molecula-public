import { type HardhatRuntimeEnvironment } from 'hardhat/types';
import type { TronWeb } from 'tronweb';

import { waitForDeployment } from './waitForDeployment';

export async function deployAccountantLZ(
    hre: HardhatRuntimeEnvironment,
    tronWeb: TronWeb,
    privateKey: string,
    params: {
        initialOwner: string;
        authorizedLZConfiguratorAddress: string;
        endpoint: string;
        lzDstEid: number;
        usdtAddress: string;
        usdtOFTAddress: string;
        oracleAddress: string;
    },
): Promise<string> {
    // Find an account address corresponding to the given PRIVATE_KEY
    const issuerAddress = tronWeb.address.fromPrivateKey(privateKey);

    if (!issuerAddress) {
        throw new Error('Invalid private key');
    }

    const artifact = await hre.artifacts.readArtifact('AccountantLZ');

    const transaction = await tronWeb.transactionBuilder.createSmartContract(
        {
            feeLimit: 5000000000, // The maximum TRX burns for resource consumption（1TRX = 1,000,000SUN
            // @ts-ignore (probably wrong type annotation)
            abi: artifact.abi,
            bytecode: artifact.bytecode,
            // @ts-ignore (probably wrong type annotation)
            parameters: [
                params.initialOwner,
                params.authorizedLZConfiguratorAddress,
                params.endpoint,
                params.lzDstEid,
                params.usdtAddress,
                params.usdtOFTAddress,
                params.oracleAddress,
            ],
        },
        issuerAddress,
    );

    // Send the transactions
    await tronWeb.trx.sendRawTransaction(await tronWeb.trx.sign(transaction, privateKey));

    return waitForDeployment(tronWeb, transaction);
}

export async function setUnderlyingToken(
    tronWeb: TronWeb,
    privateKey: string,
    params: {
        accountantLZ: string;
        moleculaToken: string;
    },
) {
    const senderAddress = tronWeb.address.fromPrivateKey(privateKey);
    if (!senderAddress) {
        throw new Error('Invalid private key');
    }

    const functionSelector = 'setUnderlyingToken(address)';
    const parameter = [{ type: 'address', value: params.moleculaToken }];

    // Build transaction
    const response = await tronWeb.transactionBuilder.triggerSmartContract(
        tronWeb.address.toHex(params.accountantLZ), // Contract address in hex
        functionSelector,
        { feeLimit: 1000000000 }, // Set fee limit
        parameter,
        senderAddress,
    );

    const { transaction } = response;

    // Sign the transaction
    const signedTransaction = await tronWeb.trx.sign(transaction, privateKey);

    // Send transaction
    await tronWeb.trx.sendRawTransaction(signedTransaction);
}

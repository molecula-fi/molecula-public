import { type HardhatRuntimeEnvironment } from 'hardhat/types';
import type TronWeb from 'tronweb';
import type { Transaction } from 'tronweb/interfaces';

import { NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { waitForDeployment } from './waitForDeployment';

export function getRebaseTokenVersion(network: NetworkType) {
    switch (network) {
        case NetworkType['mainnet/beta']:
            return 'RebaseTokenBeta';
        case NetworkType['mainnet/prod']:
            return 'RebaseTokenTron';
        case NetworkType.devnet:
            return 'RebaseTokenTest';
        default:
            throw new Error('Unsupported network type!');
    }
}

export async function deployRebaseToken(
    network: NetworkType,
    hre: HardhatRuntimeEnvironment,
    tronWeb: TronWeb,
    privateKey: string,
    params: {
        initialOwner: string;
        accountantAddress: string;
        initialShares: bigint;
        oracleAddress: string;
        tokenDecimals: number;
        minDeposit: bigint;
        minRedeem: bigint;
    },
): Promise<string> {
    // Find an account address corresponding to the given PRIVATE_KEY
    const issuerAddress = tronWeb.address.fromPrivateKey(privateKey);

    const contractVersion = getRebaseTokenVersion(network);

    console.log(`For ${network} selected ${contractVersion} contract version`);

    const artifact = await hre.artifacts.readArtifact(contractVersion);

    const transaction = (await tronWeb.transactionBuilder.createSmartContract(
        {
            feeLimit: 2000000000, // The maximum TRX burns for resource consumption（1TRX = 1,000,000SUN
            // @ts-ignore (probably wrong type annotation)
            abi: artifact.abi,
            bytecode: artifact.bytecode,
            // @ts-ignore (probably wrong type annotation)
            parameters: [
                params.initialOwner,
                params.accountantAddress,
                params.initialShares,
                params.oracleAddress,
                params.tokenDecimals,
                params.minDeposit,
                params.minRedeem,
            ],
        },
        issuerAddress,
    )) as Transaction;

    // Send the transactions
    await tronWeb.trx.sendRawTransaction(await tronWeb.trx.sign(transaction, privateKey));

    return waitForDeployment(tronWeb, transaction);
}

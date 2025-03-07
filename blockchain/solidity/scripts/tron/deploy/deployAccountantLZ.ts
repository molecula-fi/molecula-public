import type TronWeb from 'tronweb';
import type { Transaction } from 'tronweb/interfaces';

import { abi as OAPP_ABI } from '../../../artifacts/@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol/OApp.json';
import {
    abi as ABI,
    bytecode as BYTECODE,
} from '../../../artifacts/contracts/solutions/Carbon/tron/AccountantLZ.sol/AccountantLZ.json';

import { waitForDeployment } from './waitForDeployment';

export async function deployAccountantLZ(
    tronWeb: TronWeb,
    privateKey: string,
    params: {
        initialOwner: string;
        authorizedLZConfigurator: string;
        authorizedServer: string;
        lzEndpoint: string;
        lzDstEid: number;
        token: string;
        treasuryAddress: string;
        erc20Address: string;
        lzOptions: string;
        oracle: string;
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
                params.authorizedLZConfigurator,
                params.authorizedServer,
                params.lzEndpoint,
                params.lzDstEid,
                params.token,
                params.treasuryAddress,
                params.erc20Address,
                params.lzOptions,
                params.oracle,
            ],
        },
        issuerAddress,
    )) as Transaction;

    // Send the transactions
    await tronWeb.trx.sendRawTransaction(await tronWeb.trx.sign(transaction, privateKey));

    return waitForDeployment(tronWeb, transaction);
}

export async function setPeer(
    tronWeb: TronWeb,
    params: {
        oApp: string;
        eid: number;
        peer: string;
    },
) {
    const accountant = tronWeb.contract(OAPP_ABI, params.oApp);
    // Set peer for OApp
    await accountant
        // @ts-ignore (Missing types for contracts)
        .setPeer(params.eid, params.peer)
        .send();
}

export async function peers(
    tronWeb: TronWeb,
    params: {
        accountantLZ: string;
        eid: number;
    },
) {
    const accountant = tronWeb.contract(ABI, params.accountantLZ);
    // Get peer
    return (
        accountant
            // @ts-ignore (Missing types for contracts)
            .peers(params.eid)
            .call()
    );
}

export async function setLzOptions(
    tronWeb: TronWeb,
    params: {
        accountantLZ: string;
        lzOpt: string;
    },
) {
    const accountant = tronWeb.contract(ABI, params.accountantLZ);
    // Set options
    await accountant
        // @ts-ignore (Missing types for contracts)
        .setLzOptions(params.lzOpt)
        .send();
}

export async function setMoleculaToken(
    tronWeb: TronWeb,
    params: {
        accountantLZ: string;
        moleculaToken: string;
    },
) {
    const accountant = tronWeb.contract(ABI, params.accountantLZ);
    // Set molecula token
    await accountant
        // @ts-ignore (Missing types for contracts)
        .setMoleculaToken(params.moleculaToken)
        .send();
}

export async function setTreasury(
    tronWeb: TronWeb,
    params: {
        accountantLZ: string;
        treasury: string;
    },
) {
    const accountant = tronWeb.contract(ABI, params.accountantLZ);
    // Set trasury address
    await accountant
        // @ts-ignore (Missing types for contracts)
        .setTreasury(params.treasury)
        .send();
}

export async function setServerEnabled(
    tronWeb: TronWeb,
    params: {
        accountantLZ: string;
        enable: boolean;
    },
) {
    const accountant = tronWeb.contract(ABI, params.accountantLZ);
    // call setServerEnable
    return (
        accountant
            // @ts-ignore (Missing types for contracts)
            .setServerEnable(params.enable)
            .send()
    );
}

export async function getServerEnabled(
    tronWeb: TronWeb,
    params: {
        accountantLZ: string;
    },
) {
    const accountant = tronWeb.contract(ABI, params.accountantLZ);
    // get serverEnable
    return (
        accountant
            // @ts-ignore (Missing types for contracts)
            .serverEnabled()
            .call()
    );
}

export async function setGasLimit(
    tronWeb: TronWeb,
    params: {
        accountantLZ: string;
        msgType: number;
        baseValue: number;
        unitValue: number;
    },
) {
    const accountant = tronWeb.contract(ABI, params.accountantLZ);
    // Set treasury address
    await accountant
        // @ts-ignore (Missing types for contracts)
        .setGasLimit(params.msgType, params.baseValue, params.unitValue)
        .send();
}

export async function setAuthorizedLZConfigurator(
    tronWeb: TronWeb,
    params: {
        accountantLZ: string;
        authorizedLZConfigurator: string;
    },
) {
    const accountant = tronWeb.contract(ABI, params.accountantLZ);
    // Set treasury address
    await accountant
        // @ts-ignore (Missing types for contracts)
        .setAuthorizedLZConfigurator(params.authorizedLZConfigurator)
        .send();
}

// "set:carbon:owner": "ts-node --files scripts/tron/setCarbonOwner.ts",

import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import TronWeb from 'tronweb';

import type {
    ContractsCarbon,
    MainBetaContractsCarbon,
    MainProdContractsCarbon,
    NetworkType,
} from '@molecula-monorepo/blockchain.addresses';

import { setOwnerFromConfig } from '../helpers';
import { getTronNetworkConfig, readFromFile } from '../utils/deployUtils';

import { setTronOwnerFromConfig } from './deploy/deployCarbonTron';

export async function setCarbonOwner(
    hre: HardhatRuntimeEnvironment,
    environment: NetworkType,
    mnemonic: string,
    path: string,
) {
    const config:
        | typeof ContractsCarbon
        | typeof MainBetaContractsCarbon
        | typeof MainProdContractsCarbon = await readFromFile(
        `${environment}/contracts_carbon.json`,
    );

    if ('supplyManager' in config.eth) {
        console.log('Supply manager exists in config');
    } else {
        throw new Error('Invalid supplyManager address returned from config.eth.');
    }

    {
        const contracts = [
            { name: 'SupplyManager', addr: config.eth.supplyManager },
            { name: 'MoleculaPool', addr: config.eth.moleculaPool },
            { name: 'AgentLZ', addr: config.eth.agentLZ },
        ];
        await setOwnerFromConfig(hre, environment, contracts);
    }
    let network;
    if (environment === 'devnet') {
        network = 'shasta';
    } else {
        network = 'tron';
    }
    const networkConfig = hre.config.networks[network];
    if (!networkConfig) {
        throw new Error(`Network ${network} not found in Hardhat config`);
    }

    const configTron = getTronNetworkConfig(environment);

    // Create TronWeb instance
    const tronWeb = new TronWeb({
        fullHost: configTron.RPC_URL,
    });

    const accountInfo = tronWeb.fromMnemonic(mnemonic, path);

    if (accountInfo instanceof Error) {
        throw new Error('Invalid account information returned from fromMnemonic.');
    }

    const privateKey = accountInfo.privateKey.substring(2);

    if ('tron' in config) {
        console.log('Tron contracts exist in the config');
    } else {
        throw new Error(`Network ${network} not found in Hardhat config`);
    }

    {
        const contracts = [
            { name: 'Oracle', addr: config.tron.oracle },
            { name: 'AccountantLZ', addr: config.tron.accountantLZ },
            { name: 'RebaseToken', addr: config.tron.rebaseToken },
        ];
        await setTronOwnerFromConfig(hre, privateKey, environment, contracts);
    }
}

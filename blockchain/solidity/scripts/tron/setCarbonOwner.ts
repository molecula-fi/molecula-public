// "set:carbon:owner": "ts-node --files scripts/tron/setCarbonOwner.ts",

import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import TronWeb from 'tronweb';

import type { ContractsCarbon, NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { getTronNetworkConfig, readFromFile } from '../utils/deployUtils';

import { setOwner } from '../utils/setOwner';

import { setTronOwnerFromConfig } from './deploy/deployCarbonTron';

export async function setCarbonOwner(
    hre: HardhatRuntimeEnvironment,
    environment: NetworkType,
    mnemonic: string,
    path: string,
) {
    const contractsCarbon: ContractsCarbon = await readFromFile(
        `${environment}/contracts_carbon.json`,
    );
    const config = getTronNetworkConfig(environment);

    if ('supplyManager' in contractsCarbon.eth) {
        console.log('Supply manager exists in contractsCarbon');
    } else {
        throw new Error('Invalid supplyManager address returned from contractsCarbon.eth.');
    }

    {
        const contracts = [
            { name: 'SupplyManager', addr: contractsCarbon.eth.supplyManager },
            { name: 'MoleculaPool', addr: contractsCarbon.eth.moleculaPool },
            { name: 'AgentLZ', addr: contractsCarbon.eth.agentLZ },
        ];
        await setOwner(hre, contracts, config.OWNER);
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

    if ('tron' in contractsCarbon) {
        console.log('Tron contracts exist in the contractsCarbon');
    } else {
        throw new Error(`Network ${network} not found in Hardhat config`);
    }

    {
        const contracts = [
            { name: 'Oracle', addr: contractsCarbon.tron.oracle },
            { name: 'AccountantLZ', addr: contractsCarbon.tron.accountantLZ },
            { name: 'RebaseToken', addr: contractsCarbon.tron.rebaseToken },
        ];
        await setTronOwnerFromConfig(hre, privateKey, environment, contracts);
    }
}

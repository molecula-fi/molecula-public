import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import type { ContractsCore, NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { setOwnerFromConfig } from '../helpers';
import { readFromFile } from '../utils/deployUtils';

export async function setCoreOwner(hre: HardhatRuntimeEnvironment, environment: NetworkType) {
    const config: typeof ContractsCore = await readFromFile(`${environment}/contracts_core.json`);
    const contracts = [
        { name: 'SupplyManager', addr: config.eth.supplyManager },
        { name: 'MoleculaPool', addr: config.eth.moleculaPool },
    ];
    await setOwnerFromConfig(hre, environment, contracts);
}

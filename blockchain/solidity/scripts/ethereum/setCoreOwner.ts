import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import type { ContractsCore, NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { getNetworkConfig, readFromFile } from '../utils/deployUtils';
import { setOwner } from '../utils/setOwner';

export async function setCoreOwner(hre: HardhatRuntimeEnvironment, environment: NetworkType) {
    const contractsCore: ContractsCore = await readFromFile(`${environment}/contracts_core.json`);
    const contracts = [
        { name: 'SupplyManager', addr: contractsCore.eth.supplyManager },
        { name: 'MoleculaPool', addr: contractsCore.eth.moleculaPool },
    ];

    const config = getNetworkConfig(environment);
    await setOwner(hre, contracts, config.OWNER);
}

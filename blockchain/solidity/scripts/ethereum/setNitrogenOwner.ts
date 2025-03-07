import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import type {
    ContractsNitrogen,
    MainBetaContractsNitrogen,
    MainProdContractsNitrogen,
    NetworkType,
} from '@molecula-monorepo/blockchain.addresses';

import { setOwnerFromConfig } from '../helpers';
import { readFromFile } from '../utils/deployUtils';

export async function setNitrogenOwner(hre: HardhatRuntimeEnvironment, environment: NetworkType) {
    const config:
        | typeof ContractsNitrogen
        | typeof MainBetaContractsNitrogen
        | typeof MainProdContractsNitrogen = await readFromFile(
        `${environment}/contracts_nitrogen.json`,
    );
    const contracts = [
        { name: 'SupplyManager', addr: config.eth.supplyManager },
        { name: 'MoleculaPool', addr: config.eth.moleculaPool },
        { name: 'RebaseToken', addr: config.eth.rebaseToken },
        { name: 'AccountantAgent', addr: config.eth.accountantAgent },
    ];
    await setOwnerFromConfig(hre, environment, contracts);
}

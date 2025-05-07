/* eslint-disable no-restricted-syntax */

import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import type { ContractsNitrogen, EnvironmentType } from '@molecula-monorepo/blockchain.addresses';

import { getEnvironmentConfig, readFromFile } from '../utils/deployUtils';
import { setOwner } from '../utils/setOwner';

export async function setNitrogenOwner(
    hre: HardhatRuntimeEnvironment,
    environment: EnvironmentType,
) {
    const contractsNitrogen: ContractsNitrogen = await readFromFile(
        `${environment}/contracts_nitrogen.json`,
    );
    const contracts = [
        { name: 'SupplyManager', addr: contractsNitrogen.eth.supplyManager },
        { name: 'MoleculaPool', addr: contractsNitrogen.eth.moleculaPool },
        { name: 'AccountantAgent', addr: contractsNitrogen.eth.accountantAgent },
        { name: 'RebaseToken', addr: contractsNitrogen.eth.rebaseToken },
    ];
    if (contractsNitrogen.eth.router !== '') {
        contracts.push({ name: 'Router', addr: contractsNitrogen.eth.router });
    }
    for (const [tokenName, agentAddress] of Object.entries(contractsNitrogen.eth.routerAgents)) {
        contracts.push({ name: `RouterAgent#${tokenName}`, addr: agentAddress as string });
    }

    const config = getEnvironmentConfig(environment);
    await setOwner(hre, contracts, config.OWNER);
}

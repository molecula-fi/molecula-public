/* eslint-disable no-restricted-syntax */

import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import type { ContractsNitrogen, NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { getNetworkConfig, readFromFile } from '../utils/deployUtils';
import { setOwner } from '../utils/setOwner';

export async function setNitrogenOwner(hre: HardhatRuntimeEnvironment, environment: NetworkType) {
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

    const config = getNetworkConfig(environment);
    await setOwner(hre, contracts, config.OWNER);
}

import type { ContractsCore } from '@molecula-monorepo/blockchain.addresses';

import { getNetwork, handleError, readFromFile, setOwnerFromConfig } from '../utils/deployUtils';

const network = getNetwork();

async function run() {
    const config: typeof ContractsCore = await readFromFile(`${network}/contracts_core.json`);
    const contracts = [
        { name: 'SupplyManager', addr: config.eth.supplyManager },
        { name: 'MoleculaPool', addr: config.eth.moleculaPool },
    ];
    await setOwnerFromConfig(network, contracts);
}

run().catch(handleError);

import type {
    ContractsNitrogen,
    MainBetaContractsNitrogen,
    MainProdContractsNitrogen,
} from '@molecula-monorepo/blockchain.addresses';

import { getNetwork, handleError, readFromFile, setOwnerFromConfig } from '../utils/deployUtils';

const network = getNetwork();

async function run() {
    const config:
        | typeof ContractsNitrogen
        | typeof MainBetaContractsNitrogen
        | typeof MainProdContractsNitrogen = await readFromFile(
        `${network}/contracts_nitrogen.json`,
    );
    const contracts = [
        { name: 'SupplyManager', addr: config.eth.supplyManager },
        { name: 'MoleculaPool', addr: config.eth.moleculaPool },
        { name: 'RebaseToken', addr: config.eth.rebaseToken },
        { name: 'AccountantAgent', addr: config.eth.accountantAgent },
    ];
    await setOwnerFromConfig(network, contracts);
}

run().catch(handleError);

// "set:carbon:owner": "ts-node --files scripts/tron/setCarbonOwner.ts",

// import { type HardhatRuntimeEnvironment } from 'hardhat/types';
//
// import type {
//     ContractsCarbon,
//     MainBetaContractsCarbon,
//     MainProdContractsCarbon,
//     NetworkType,
// } from '@molecula-monorepo/blockchain.addresses';
//
// import { setOwnerFromConfig } from '../helpers';
//
// import { readFromFile } from '../utils/deployUtils';
//
// import { setTronOwnerFromConfig } from './deploy/deployCarbonTron';
//
// export async function run(hre: HardhatRuntimeEnvironment, environment: NetworkType) {
//     const config:
//         | typeof ContractsCarbon
//         | typeof MainBetaContractsCarbon
//         | typeof MainProdContractsCarbon = await readFromFile(
//         `${environment}/contracts_carbon.json`,
//     );
//     {
//         const contracts = [
//             { name: 'SupplyManager', addr: config.eth.supplyManager },
//             { name: 'MoleculaPool', addr: config.eth.moleculaPool },
//             { name: 'AgentLZ', addr: config.eth.agentLZ },
//             { name: 'wmUSDT', addr: config.eth.wmUSDT },
//         ];
//         await setOwnerFromConfig(hre, environment, contracts);
//     }
//     let network;
//     if (environment === 'devnet') {
//         network = 'shasta';
//     } else {
//         network = 'tron';
//     }
//     const networkConfig = hre.config.networks[network];
//     if (!networkConfig) {
//         throw new Error(`Network ${network} not found in Hardhat config`);
//     }
//
//     if (!('accounts' in networkConfig)) {
//         throw new Error(`No accounts configured for network ${network}`);
//     }
//     const accounts = hre.network.config.accounts as string[];
//     const accountPrivateKey = accounts[0] || '';
//
//     {
//         const contracts = [
//             { name: 'Oracle', addr: config.tron.oracle },
//             { name: 'AccountantLZ', addr: config.tron.accountantLZ },
//             { name: 'RebaseToken', addr: config.tron.rebaseToken },
//             { name: 'Treasury', addr: config.tron.treasury },
//         ];
//         await setTronOwnerFromConfig(accountPrivateKey, environment, contracts);
//     }
// }

import { scope } from 'hardhat/config';

import {
    getEnvironment,
    readFromFile,
    writeToFile,
} from '@molecula-monorepo/solidity/scripts/utils/deployUtils';

import { deployEthena } from '../scripts/deployEthena';
import { mintsUSDe, mintUSDe } from '../scripts/mint';

const ethenaScope = scope('ethenaScope', 'Scope for ethena');

ethenaScope
    .task('deployEthena', 'Deploys the Ethena contracts')
    .addParam('environment', 'Deployment environment')
    .addParam('cooldown', 'Cooldown duration in seconds')
    .setAction(async (taskArgs, hre) => {
        const environment = getEnvironment(hre, taskArgs.environment);

        const result = await deployEthena(hre, taskArgs.cooldown);
        writeToFile(`${environment}/contracts_ethena.json`, result);
    });

ethenaScope
    .task('mintUSDe', 'Mint USDe tokens for user')
    .addParam('environment', 'Deployment environment')
    .addParam('user', 'User that get tokens')
    .addParam('amount', 'Amount of tokens')
    .setAction(async (taskArgs, hre) => {
        const environment = getEnvironment(hre, taskArgs.environment);
        const contractsEthena = await readFromFile(`${environment}/contracts_ethena.json`);

        await mintUSDe(hre, contractsEthena.USDe, taskArgs.user, taskArgs.amount);
    });

ethenaScope
    .task('mintsUSDe', 'Mint sUSDe tokens for user')
    .addParam('environment', 'Deployment environment')
    .addParam('user', 'User that get tokens')
    .addParam('amount', 'Amount of tokens')
    .setAction(async (taskArgs, hre) => {
        const environment = getEnvironment(hre, taskArgs.environment);
        const contractsEthena = await readFromFile(`${environment}/contracts_ethena.json`);

        await mintsUSDe(
            hre,
            contractsEthena.USDe,
            contractsEthena.sUSDe,
            taskArgs.user,
            taskArgs.amount,
        );
    });

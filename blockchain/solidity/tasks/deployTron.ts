/* eslint-disable @typescript-eslint/no-explicit-any */
import { scope } from 'hardhat/config';

import { deployCarbon } from '../scripts/tron/deploy/deployCarbonTron';
import { deployMockUSDT, deployUsdtOFT } from '../scripts/tron/deploy/deployMockTron';
import {
    handleError,
    writeToFile,
    readFromFile,
    getEnvironment,
} from '../scripts/utils/deployUtils';

const tronMajorScope = scope('tronScope', 'Scope for major ethereum deployment flow');

tronMajorScope
    .task('deployCarbon', 'Deploys Carbon on Tron')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        console.log('\n TRON Deployment');
        console.log('Environment:', taskArgs.environment);
        console.log('Network:', hre.network.name);

        const accounts: any = await hre.network.config.accounts;
        const environment = getEnvironment(hre, taskArgs.environment);

        try {
            const contractsCarbon = await readFromFile(`${environment}/contracts_carbon.json`);

            // Execute deployment
            const tron = await deployCarbon(hre, accounts.mnemonic, accounts.path, environment);

            writeToFile(`${environment}/contracts_carbon.json`, {
                eth: contractsCarbon.eth,
                tron: tron.tron,
            });

            console.log('Deployment and file write completed successfully.');
        } catch (error) {
            handleError(error);
        }
    });

tronMajorScope
    .task('deployUsdtMock', 'Deploys USDT mock contract on Tron')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        console.log('\n TRON Deployment');
        console.log('Environment:', taskArgs.environment);
        console.log('Network:', hre.network.name);

        const accounts: any = await hre.network.config.accounts;
        const environment = getEnvironment(hre, taskArgs.environment);
        try {
            // Execute deployment
            await deployMockUSDT(hre, accounts.mnemonic, accounts.path, environment);

            console.log('Deployment USDT Mock completed successfully.');
        } catch (error) {
            handleError(error);
        }
    });

tronMajorScope
    .task('deployUsdtOFT', 'Deploys UsdtOFT mock contract on Tron')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        console.log('\n TRON Deployment');
        console.log('Environment:', taskArgs.environment);
        console.log('Network:', hre.network.name);

        const accounts: any = await hre.network.config.accounts;
        const environment = getEnvironment(hre, taskArgs.environment);
        try {
            // Execute deployment
            await deployUsdtOFT(hre, accounts.mnemonic, accounts.path, environment);

            console.log('Deployment UsdtOFT mock completed successfully.');
        } catch (error) {
            handleError(error);
        }
    });

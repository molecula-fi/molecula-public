import { scope } from 'hardhat/config';

import {
    deployNitrogen,
    deployAccountantAgent,
    deployCarbon,
    deployCore,
    deployMoleculaPoolTreasury,
} from '../scripts/ethereum';
import {
    handleError,
    writeToFile,
    readFromFile,
    getEnvironment,
} from '../scripts/utils/deployUtils';

const ethereumMajorScope = scope('ethereumScope', 'Scope for major ethereum deployment flow');

ethereumMajorScope
    .task('deployNitrogen', 'Deploys the Nitrogen contracts')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        const environment = getEnvironment(hre, taskArgs.environment);

        try {
            const contractsCore = await readFromFile(`${environment}/contracts_core.json`);
            const eth = await deployNitrogen(hre, environment, {
                mUSDe: contractsCore.eth.mUSDe,
                moleculaPool: contractsCore.eth.moleculaPool,
                supplyManager: contractsCore.eth.supplyManager,
            });
            const result = { eth };

            writeToFile(`${environment}/contracts_nitrogen.json`, result);
            console.log('Deployment and file write completed successfully.');
        } catch (error) {
            handleError(error);
        }
    });

ethereumMajorScope
    .task('deployCore', 'Deploys the Core contracts')
    .addParam('environment', 'Deployment environment')
    .addFlag('nomusde', 'Deployment mUSDe flag')
    .setAction(async (taskArgs, hre) => {
        const environment = getEnvironment(hre, taskArgs.environment);

        try {
            const eth = await deployCore(hre, environment, taskArgs.nomusde);
            const result = { eth };

            writeToFile(`${environment}/contracts_core.json`, result);
            console.log('Deployment and file write completed successfully.');
        } catch (error) {
            handleError(error);
        }
    });

ethereumMajorScope
    .task('deployAccountantAgent', 'Deploys the AccountantAgent contract')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        const environment = getEnvironment(hre, taskArgs.environment);

        try {
            const result = await deployAccountantAgent(hre, environment);

            writeToFile(`${environment}/accountant_agent.json`, result);
            console.log('Deployment and file write completed successfully.');
        } catch (error) {
            handleError(error);
        }
    });

ethereumMajorScope
    .task('deployMoleculaPoolTreasury', 'Deploys the Nitrogen MoleculaPoolTreasury contract')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        const environment = getEnvironment(hre, taskArgs.environment);
        const result = await deployMoleculaPoolTreasury(hre, environment);
        writeToFile(`${environment}/molecula_pool_treasury.json`, result);
        console.log('Deployment and file write completed successfully.');
    });

ethereumMajorScope
    .task('deployCarbon', 'Deploys Carbon on Ethereum')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        console.log('\n Ethereum Deployment');
        console.log('Environment:', taskArgs.environment); // Now using environment variable
        console.log('Network:', hre.network.name);

        const environment = getEnvironment(hre, taskArgs.environment);
        try {
            const contractsCore = await readFromFile(`${environment}/contracts_core.json`);
            const contractsCarbon = await readFromFile(`${environment}/contracts_carbon.json`);

            // Execute deployment
            const data = await deployCarbon(hre, environment, {
                supplyManagerAddress: contractsCore.eth.supplyManager,
                moleculaPoolAddress: contractsCore.eth.moleculaPool,
            });
            const eth = {
                ...data,
                ethena: contractsCore.eth.ethena,
                mUSDe: contractsCore.eth.mUSDe,
            };

            writeToFile(`${environment}/contracts_carbon.json`, {
                eth,
                tron: contractsCarbon.tron,
            });
            console.log('Deployment and file write completed successfully.');
        } catch (error) {
            handleError(error);
        }
    });

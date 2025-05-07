/* eslint-disable @typescript-eslint/no-explicit-any */
import { scope } from 'hardhat/config';

import {
    migrateNitrogenAgent,
    migrateNitrogenMoleculaPoolTreasury,
    setOAppPeer,
    setCarbonOwner,
    setCoreOwner,
    setNitrogenOwner,
} from '../scripts/ethereum';
import { setupRouter } from '../scripts/ethereum/setRouter';

import { setupOAppDVN } from '../scripts/ethereum/setupOAppDVN';
import { setupUsdtOftDVN } from '../scripts/ethereum/setupUsdtOFTDVN';
import { getEnvironment, getVersion, readFromFile } from '../scripts/utils/deployUtils';

const ethereumSetupScope = scope('ethereumSetupScope', 'Scope for set ethereum script flow');

ethereumSetupScope
    .task('migrateNitrogenAgent', 'Nitrogen Migration of Agent')
    .addParam('environment', 'Migration environment')
    .addParam('mpv', 'Molecula Pool version')
    .setAction(async (taskArgs, hre) => {
        console.log('Environment:', taskArgs.environment);
        console.log('Version:', taskArgs.mpv);
        console.log('Network:', hre.network.name);

        const environment = getEnvironment(hre, taskArgs.environment);
        const version = getVersion(taskArgs.mpv);

        await migrateNitrogenAgent(hre, environment, version);
        console.log('Migration Nitrogen Agent completed successfully.');
    });

ethereumSetupScope
    .task(
        'migrateNitrogenMoleculaPoolTreasury',
        'Migrates to new MoleculaPoolTreasury contract in Nitrogen solution',
    )
    .addParam('environment', 'Migration environment')
    .setAction(async (taskArgs, hre) => {
        console.log('Environment:', taskArgs.environment);
        console.log('Network:', hre.network.name);

        const environment = getEnvironment(hre, taskArgs.environment);
        await migrateNitrogenMoleculaPoolTreasury(hre, environment);
        console.log('Migration Nitrogen MoleculaPoolTreasury completed successfully.');
    });

ethereumSetupScope
    .task('setupRouter', 'Add AgentRouter in Router')
    .addParam('environment')
    .addParam('minDepositValue')
    .addParam('minRedeemShares')
    .addParam('tokenName')
    .setAction(async (taskArgs, hre) => {
        console.log('Environment:', taskArgs.environment);
        console.log('Network:', hre.network.name);

        const environment = getEnvironment(hre, taskArgs.environment);
        await setupRouter(
            hre,
            environment,
            taskArgs.minDepositValue,
            taskArgs.minRedeemShares,
            taskArgs.tokenName,
        );
        console.log('Adding RouterAgent completed successfully.');
    });

ethereumSetupScope
    .task('setNitrogenOwner', 'Nitrogen set owner')
    .addParam('environment', 'Set owner environment') // Required parameter for specifying the set script environment
    .setAction(async (taskArgs, hre) => {
        console.log('Environment:', taskArgs.environment); // Log the selected migration environment
        console.log('Network:', hre.network.name); // Log the Hardhat network being used

        // Retrieve environment details using the helper function
        const environment = getEnvironment(hre, taskArgs.environment);

        // Execute the migration function with the retrieved parameters
        await setNitrogenOwner(hre, environment)
            .then(() => {
                console.log('Set Nitrogen owner completed successfully.');
            })
            .catch(error => {
                console.error('Set failed:', error.message);
                console.error(error.stack); // Log full error stack trace for debugging
                process.exit(1); // Exit with an error code to indicate failure
            });
    });

ethereumSetupScope
    .task('setCoreOwner', 'Core set owner')
    .addParam('environment', 'Set owner environment') // Required parameter for specifying the set script environment
    .setAction(async (taskArgs, hre) => {
        console.log('Environment:', taskArgs.environment); // Log the selected migration environment
        console.log('Network:', hre.network.name); // Log the Hardhat network being used

        // Retrieve environment details using the helper function
        const environment = getEnvironment(hre, taskArgs.environment);

        // Execute the migration function with the retrieved parameters
        await setCoreOwner(hre, environment)
            .then(() => {
                console.log('Set Core owner completed successfully.');
            })
            .catch(error => {
                console.error('Set failed:', error.message);
                console.error(error.stack); // Log full error stack trace for debugging
                process.exit(1); // Exit with an error code to indicate failure
            });
    });

ethereumSetupScope
    .task('setCarbonAccountantLZ', 'Carbon set accountantLZ')
    .addParam('environment', 'Set accountantLZ environment') // Required parameter for specifying the set script environment
    .setAction(async (taskArgs, hre) => {
        console.log('Environment:', taskArgs.environment); // Log the selected migration environment
        console.log('Network:', hre.network.name); // Log the Hardhat network being used

        // Retrieve environment details using the helper function
        const environment = getEnvironment(hre, taskArgs.environment);

        const contractsCarbon = await readFromFile(`${environment}/contracts_carbon.json`);

        // Execute the migration function with the retrieved parameters
        await setOAppPeer(hre, environment, {
            agentLZ: contractsCarbon.eth.agentLZ,
            accountantLZ: contractsCarbon.tron.accountantLZ,
        })
            .then(() => {
                console.log('Set Carbon accountantLZ completed successfully.');
            })
            .catch(error => {
                console.error('Set failed:', error.message);
                console.error(error.stack); // Log full error stack trace for debugging
                process.exit(1); // Exit with an error code to indicate failure
            });
    });

ethereumSetupScope
    .task('setCarbonOwner', 'Carbon set owner')
    .addParam('environment', 'Set owner environment') // Required parameter for specifying the set script environment
    .setAction(async (taskArgs, hre) => {
        console.log('Environment:', taskArgs.environment); // Log the selected migration environment
        console.log('Network:', hre.network.name); // Log the Hardhat network being used

        // Retrieve environment details using the helper function
        const environment = getEnvironment(hre, taskArgs.environment);

        // Execute the migration function with the retrieved parameters
        await setCarbonOwner(hre, environment)
            .then(() => {
                console.log('Set Carbon owner completed successfully.');
            })
            .catch(error => {
                console.error('Set failed:', error.message);
                console.error(error.stack); // Log full error stack trace for debugging
                process.exit(1); // Exit with an error code to indicate failure
            });
    });
ethereumSetupScope
    .task('setupCarbonDVN', 'Carbon OApp DVN config setup')
    .addParam('environment', 'Set owner environment') // Required parameter for specifying the set script environment
    .setAction(async (taskArgs, hre) => {
        console.log('Environment:', taskArgs.environment); // Log the selected migration environment
        console.log('Network:', hre.network.name); // Log the Hardhat network being used

        // Retrieve environment details using the helper function
        const environment = getEnvironment(hre, taskArgs.environment);

        // Execute the migration function with the retrieved parameters
        await setupOAppDVN(hre, environment)
            .then(() => {
                console.log('Setup of OApp DVN is completed successfully.');
            })
            .catch(error => {
                console.error('Set failed:', error.message);
                console.error(error.stack); // Log full error stack trace for debugging
                process.exit(1); // Exit with an error code to indicate failure
            });
    });

ethereumSetupScope
    .task('setupUsdtOftDVN', 'UsdtOFT OApp DVN config setup')
    .addParam('environment', 'Set owner environment') // Required parameter for specifying the set script environment
    .setAction(async (taskArgs, hre) => {
        console.log('Environment:', taskArgs.environment); // Log the selected migration environment
        console.log('Network:', hre.network.name); // Log the Hardhat network being used

        // Retrieve environment details using the helper function
        const environment = getEnvironment(hre, taskArgs.environment);

        // Execute the migration function with the retrieved parameters
        await setupUsdtOftDVN(hre, environment)
            .then(() => {
                console.log('UsdtOFT DVN setup completed completed successfully.');
            })
            .catch(error => {
                console.error('Set failed:', error.message);
                console.error(error.stack); // Log full error stack trace for debugging
                process.exit(1); // Exit with an error code to indicate failure
            });
    });

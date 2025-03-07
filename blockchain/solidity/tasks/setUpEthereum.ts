import { scope } from 'hardhat/config';

import { getMoleculaPoolVersion } from '@molecula-monorepo/blockchain.addresses';

import { migrateNitrogenAgent, migrateNitrogenMoleculaPoolTreasury } from '../scripts/ethereum';
import { setCoreOwner } from '../scripts/ethereum/setCoreOwner';
import { setNitrogenOwner } from '../scripts/ethereum/setNitrogenOwner';

import { getEnvironment, getVersion } from '../scripts/utils/deployUtils';

const ethereumSetupScope = scope('ethereumSetupScope', 'Scope for set ethereum sript flow'); // TODO sript?

ethereumSetupScope
    .task('migrateNitrogenAgent', 'Nitrogen Migration of Agent')
    .addParam('environment', 'Migration environment')
    .addVariadicPositionalParam('mpv', 'Molecula Pool version', getMoleculaPoolVersion())
    .setAction(async (taskArgs, hre) => {
        console.log('Environment:', taskArgs.environment);
        console.log('Version:', taskArgs.mpv);
        console.log('Network:', hre.network.name);

        const environment = getEnvironment(hre, taskArgs.environment);
        const version = getVersion(taskArgs.mpv[1]);

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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { scope } from 'hardhat/config';

import type { HardhatNetworkHDAccountsConfig } from 'hardhat/types/config';

import { setCarbonOwner } from '../scripts/tron/setCarbonOwner';
import { setupOAppDVN } from '../scripts/tron/setupOAppDVN';
import { setupUsdtOftDVN } from '../scripts/tron/setupUsdtOFTDVN';
import { getEnvironment } from '../scripts/utils/deployUtils';

const tronSetupScope = scope('tronSetupScope', 'Scope for tron setup configuration');

tronSetupScope
    .task('setCarbonOwner', 'Carbon set owner')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        console.log('\n TRON Deployment');
        console.log('Environment:', taskArgs.environment);
        console.log('Network:', hre.network.name);

        const accounts = hre.network.config.accounts as HardhatNetworkHDAccountsConfig;
        const environment = getEnvironment(hre, taskArgs.environment);
        // Execute the migration function with the retrieved parameters
        await setCarbonOwner(hre, accounts.mnemonic, accounts.path, environment)
            .then(() => {
                console.log('Set Carbon owner completed successfully.');
            })
            .catch(error => {
                console.error('Set failed:', error.message);
                console.error(error.stack); // Log full error stack trace for debugging
                process.exit(1); // Exit with an error code to indicate failure
            });
    });

tronSetupScope
    .task('setupCarbonDVN', 'Carbon OApp DVN config setup')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        console.log('\n TRON Deployment');
        console.log('Environment:', taskArgs.environment);
        console.log('Network:', hre.network.name);

        const accounts = hre.network.config.accounts as HardhatNetworkHDAccountsConfig;
        const environment = getEnvironment(hre, taskArgs.environment);
        // Execute the migration function with the retrieved parameters
        await setupOAppDVN(hre, accounts.mnemonic, accounts.path, environment)
            .then(() => {
                console.log('Setup of OApp DVN is completed successfully.');
            })
            .catch(error => {
                console.error('Set failed:', error.message);
                console.error(error.stack); // Log full error stack trace for debugging
                process.exit(1); // Exit with an error code to indicate failure
            });
    });

tronSetupScope
    .task('setupUsdtOftDVN', 'UsdtOFT OApp DVN config setup')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        console.log('\n TRON Deployment');
        console.log('Environment:', taskArgs.environment);
        console.log('Network:', hre.network.name); // Log the Hardhat network being used

        const accounts = hre.network.config.accounts as HardhatNetworkHDAccountsConfig;
        const environment = getEnvironment(hre, taskArgs.environment);

        // Execute the migration function with the retrieved parameters
        await setupUsdtOftDVN(hre, accounts.mnemonic, accounts.path, environment)
            .then(() => {
                console.log('UsdtOFT DVN setup completed successfully.');
            })
            .catch(error => {
                console.error('Set failed:', error.message);
                console.error(error.stack); // Log full error stack trace for debugging
                process.exit(1); // Exit with an error code to indicate failure
            });
    });

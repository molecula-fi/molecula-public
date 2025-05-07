/* eslint-disable no-await-in-loop, no-restricted-syntax, no-nested-ternary */
import { spawn } from 'child_process';
import { scope } from 'hardhat/config';

import { getEnvironment } from '../scripts/utils/deployUtils';

const multichainSetupScope = scope(
    'multichainSetupScope',
    'Scope for setting up required parameters on ethereum and tron networks',
);

multichainSetupScope
    .task('setCarbonOwner', 'Setup Carbon to multiple networks')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        console.log(`\n Environment: ${taskArgs.environment}`);

        const setupEnvFlag = getEnvironment(hre, taskArgs.environment);

        const networks: string[] =
            taskArgs.environment === 'devnet' ? ['sepolia', 'shasta'] : ['ethereum', 'tron'];
        console.log('Networks:', networks);

        for (const network of networks) {
            console.log(`\n🚀 Setting up Carbon Owner on ${network}...`);

            const taskName =
                network === 'sepolia' ? 'ethereum' : network === 'shasta' ? 'tron' : network;

            console.log(
                `Running: npx hardhat ${taskName}SetupScope setCarbonOwner --network ${network} --environment ${setupEnvFlag}`,
            );

            await new Promise((resolve, reject) => {
                const child = spawn(
                    'npx',
                    [
                        'hardhat',
                        `${taskName}SetupScope`,
                        `setCarbonOwner`,
                        '--network',
                        network,
                        '--environment',
                        setupEnvFlag,
                    ],
                    {
                        stdio: 'inherit',
                    },
                );

                child.on('close', code => {
                    if (code !== 0) {
                        reject(new Error(`Deployment failed on ${network} with exit code ${code}`));
                    } else {
                        resolve(null);
                    }
                });
            });
        }
    });

multichainSetupScope
    .task('setupCarbonDVN', 'Setup Carbon to multiple networks')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        console.log(`\n Environment: ${taskArgs.environment}`);

        const setupEnvFlag = getEnvironment(hre, taskArgs.environment);

        const networks: string[] =
            taskArgs.environment === 'devnet' ? ['sepolia', 'shasta'] : ['ethereum', 'tron'];
        console.log('Networks:', networks);

        for (const network of networks) {
            console.log(`\n🚀 Setting up Carbon DVN on ${network}...`);

            const taskName =
                network === 'sepolia' ? 'ethereum' : network === 'shasta' ? 'tron' : network;

            console.log(
                `Running: npx hardhat ${taskName}SetupScope setupCarbonDVN --network ${network} --environment ${setupEnvFlag}`,
            );

            await new Promise((resolve, reject) => {
                const child = spawn(
                    'npx',
                    [
                        'hardhat',
                        `${taskName}SetupScope`,
                        `setupCarbonDVN`,
                        '--network',
                        network,
                        '--environment',
                        setupEnvFlag,
                    ],
                    {
                        stdio: 'inherit',
                    },
                );

                child.on('close', code => {
                    if (code !== 0) {
                        reject(new Error(`Deployment failed on ${network} with exit code ${code}`));
                    } else {
                        resolve(null);
                    }
                });
            });
        }
    });

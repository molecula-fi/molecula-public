/* eslint-disable no-await-in-loop, no-restricted-syntax, no-nested-ternary */

import { spawn } from 'child_process';
import { task } from 'hardhat/config';

import { getEnvironment } from '../scripts/utils/deployUtils';

// TODO
task('deployCarbonMultichain', 'Deploys Carbon to multiple networks')
    .addParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        console.log(`\n Environment: ${taskArgs.environment}`);

        const deployEnvFlag = getEnvironment(hre, taskArgs.environment);

        const networks: string[] =
            taskArgs.environment === 'devnet' ? ['sepolia', 'shasta'] : ['ethereum', 'tron'];
        console.log('Networks:', networks);

        for (const network of networks) {
            console.log(`\n🚀 Deploying Carbon to ${network}...`);

            const taskName =
                network === 'sepolia' ? 'ethereum' : network === 'shasta' ? 'tron' : network;

            console.log(
                `Running: npx hardhat ${taskName}MajorScope deployCarbon_${taskName} --network ${network}`,
            );

            await new Promise((resolve, reject) => {
                const child = spawn(
                    'npx',
                    [
                        'hardhat',
                        `deployCarbon_${taskName}`,
                        '--network',
                        network,
                        '--environment',
                        deployEnvFlag,
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

export {};

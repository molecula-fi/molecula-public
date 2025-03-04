/* eslint-disable no-await-in-loop, no-restricted-syntax, no-nested-ternary */

import { spawn } from 'child_process';
import { task } from 'hardhat/config';

task('deployCarbonMultichain', 'Deploys Carbon to multiple networks')
    .addOptionalParam('environment', 'Deployment environment')
    .setAction(async taskArgs => {
        console.log(`\n Environment: ${taskArgs.environment}`);

        const { getEnvironment } = await import('../scripts/utils/deployUtils');
        const deployEnvFlag = getEnvironment(taskArgs.environment);

        const networks: string[] =
            taskArgs.environment === 'devnet' ? ['sepolia', 'shasta'] : ['ethereum', 'tron'];
        console.log('Networks:', networks);

        for (const network of networks) {
            console.log(`\n🚀 Deploying Carbon to ${network}...`);

            const taskName =
                network === 'sepolia' ? 'ethereum' : network === 'shasta' ? 'tron' : network;

            console.log(`Running: npx hardhat deployCarbon_${taskName} --network ${network}`);

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

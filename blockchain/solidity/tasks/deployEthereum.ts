import { task, types } from 'hardhat/config';

task('deployNitrogen', 'Deploys the Nitrogen contract')
    .addParam('environment', 'Deployment environment')
    .setAction(async taskArgs => {
        const { handleError, readFromFile, writeToFile, getEnvironment } = await import(
            '../scripts/utils/deployUtils'
        );

        const environment = getEnvironment(taskArgs.environment);
        const contractsCore = await readFromFile(`${environment}/contracts_core.json`);

        try {
            const { deployNitrogen } = await import('../scripts/deployNitrogen');

            const print = writeToFile.bind(null, `${environment}/contracts_nitrogen.json`);
            await deployNitrogen(environment, {
                mUSDe: contractsCore.eth.mUSDe,
                moleculaPool: contractsCore.eth.moleculaPool,
                supplyManager: contractsCore.eth.supplyManager,
            })
                .then(eth => {
                    return { eth };
                })
                .then(print)
                .catch(handleError);

            console.log('Deployment and file write completed successfully.');
        } catch (error) {
            handleError(error);
        }
    });

task('deployCore', 'Deploys the Nitrogen contract')
    .addParam('environment', 'Deployment environment')
    .addParam<boolean>('nomusde', 'Deployment mUSDe flag', false, types.boolean) // Boolean param
    .setAction(async taskArgs => {
        const { handleError, writeToFile, getEnvironment } = await import(
            '../scripts/utils/deployUtils'
        );

        const environment = getEnvironment(taskArgs.environment);

        try {
            const { deployCore } = await import('../scripts/deployCore');

            const print = writeToFile.bind(null, `${environment}/contracts_core.json`);
            await deployCore(environment, taskArgs.nomusde)
                .then(eth => {
                    return { eth };
                })
                .then(print)
                .catch(handleError);

            console.log('Deployment and file write completed successfully.');
        } catch (error) {
            handleError(error);
        }
    });

task('deployAccountantAgent', 'Deploys the Nitrogen contract')
    .addParam('environment', 'Deployment environment')
    .setAction(async taskArgs => {
        const { handleError, writeToFile, getEnvironment } = await import(
            '../scripts/utils/deployUtils'
        );

        const environment = getEnvironment(taskArgs.environment);

        try {
            const { deployAccountantAgent } = await import('../scripts/deployAccountantAgent');

            const print = writeToFile.bind(null, `${environment}/accountant_agent.json`);
            await deployAccountantAgent(environment)
                .then(eth => {
                    return { eth };
                })
                .then(print)
                .catch(handleError);

            console.log('Deployment and file write completed successfully.');
        } catch (error) {
            handleError(error);
        }
    });

export {};

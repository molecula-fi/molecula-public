import { task } from 'hardhat/config';

task('deployCarbon_ethereum', 'Deploys Carbon on Ethereum')
    .addOptionalParam('environment', 'Deployment environment')
    .setAction(async (taskArgs, hre) => {
        console.log('\n Ethereum Deployment');
        console.log('Environment:', taskArgs.environment); // Now using environment variable
        console.log('Network:', hre.network.name);

        // Import required modules inside the async function
        const { handleError, readFromFile, getEnvironment } = await import(
            '../scripts/utils/deployUtils'
        );

        const environment = getEnvironment(taskArgs.environment);
        const contractsCore = await readFromFile(`${environment}/contracts_core.json`);

        try {
            const deployCarbonOnEth = (await import('../scripts/deployCarbon')).deployCarbon;

            // Execute deployment
            await deployCarbonOnEth(environment, {
                supplyManagerAddress: contractsCore.eth.supplyManager,
                moleculaPoolAddress: contractsCore.eth.moleculaPool,
            });

            console.log('Deployment and file write completed successfully.');
        } catch (error) {
            handleError(error);
        }

        // TO:DO add writeToFile
    });

export {};

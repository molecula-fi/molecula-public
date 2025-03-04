import { task } from 'hardhat/config';

task('deployCarbon_tron', 'Deploys Carbon on Tron')
    .addParam('environment', 'Deployment environment')
    .addParam('privateKey', 'Deployer private key')
    .setAction(async (taskArgs, hre) => {
        console.log('\n TRON Deployment');
        console.log('Environment:', taskArgs.environment);
        console.log('Network:', hre.network.name);

        // Import necessary deployment utilities
        const { handleError, readFromFile, getEnvironment } = await import(
            '../scripts/utils/deployUtils'
        );

        const deployEnvFlag = getEnvironment(taskArgs.environment || '1');
        console.log(deployEnvFlag);
        const contractsCore = await readFromFile(`${deployEnvFlag}/contracts_carbon.json`);

        try {
            const { deployCarbon } = await import('../scripts/deployCarbonTron');

            // Execute deployment
            await deployCarbon(taskArgs.privateKey, deployEnvFlag, {
                agentLZ: contractsCore.eth.agentLZ,
                wmUSDT: contractsCore.eth.wmUSDT,
            });

            console.log('Deployment and file write completed successfully.');
        } catch (error) {
            handleError(error);
        }
    });

export {};

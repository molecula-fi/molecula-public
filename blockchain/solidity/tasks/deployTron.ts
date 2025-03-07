import { scope } from 'hardhat/config';

import { deployCarbon } from '../scripts/tron/deploy/deployCarbonTron';
import {
    handleError,
    writeToFile,
    readFromFile,
    getEnvironment,
} from '../scripts/utils/deployUtils';

const tronMajorScope = scope('tronMajorScope', 'Scope for major ethereum deployment flow');

tronMajorScope
    .task('deployCarbon', 'Deploys Carbon on Tron')
    .addParam('environment', 'Deployment environment')
    .addParam('privatekey', 'Deployer private key')
    .setAction(async (taskArgs, hre) => {
        console.log('\n TRON Deployment');
        console.log('Environment:', taskArgs.environment);
        console.log('Network:', hre.network.name);

        const environment = getEnvironment(hre, taskArgs.environment);

        try {
            const contractsCore = await readFromFile(`${environment}/contracts_carbon.json`);
            // Execute deployment
            const tron = await deployCarbon(taskArgs.privateKey, environment, {
                agentLZ: contractsCore.eth.agentLZ,
                wmUSDT: contractsCore.eth.wmUSDT,
            });
            const result = { tron };

            writeToFile(`${environment}/contracts_carbon.json`, result);

            console.log('Deployment and file write completed successfully.');
        } catch (error) {
            handleError(error);
        }
    });

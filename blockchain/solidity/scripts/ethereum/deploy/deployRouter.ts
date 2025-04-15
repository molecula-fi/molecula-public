import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import type { ContractsNitrogen, NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { DEPLOY_GAS_LIMIT } from '../../../configs/ethereum/constants';

import { getConfig } from '../../utils/deployUtils';

export async function deployRouter(
    hre: HardhatRuntimeEnvironment,
    environment: NetworkType,
    contractsNitrogen: ContractsNitrogen,
) {
    const { config, account } = await getConfig(hre, environment);

    const Router = await hre.ethers.getContractFactory('Router');
    const router = await Router.deploy(
        account.address, // Set correct owner later
        contractsNitrogen.eth.rebaseToken,
        config.GUARDIAN_ADDRESS,
        { gasLimit: DEPLOY_GAS_LIMIT },
    );
    await router.waitForDeployment();

    const routerAddress = await router.getAddress();
    console.log('Router address: ', routerAddress);

    return routerAddress;
}

export async function deployRouterAgent(
    hre: HardhatRuntimeEnvironment,
    environment: NetworkType,
    contractsNitrogen: ContractsNitrogen,
    tokenAddress: string,
) {
    const { account } = await getConfig(hre, environment);

    const RouterAgent = await hre.ethers.getContractFactory('RouterAgent');
    const routerAgent = await RouterAgent.deploy(
        account.address, // Set correct owner later
        contractsNitrogen.eth.router,
        contractsNitrogen.eth.supplyManager,
    );
    await routerAgent.waitForDeployment();
    const routerAgentAddress = await routerAgent.getAddress();
    console.log('RouterAgent address: ', routerAgentAddress);

    console.log('Setting token address...');
    const tx = await routerAgent.setErc20Token(tokenAddress);
    await tx.wait();

    return routerAgentAddress;
}

import { keccak256 } from 'ethers';
import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import type { ContractsNitrogen, NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { getConfig, readFromFile } from '../utils/deployUtils';

export async function setupRouter(
    hre: HardhatRuntimeEnvironment,
    environment: NetworkType,
    minDepositValue: bigint,
    minRedeemShares: bigint,
    tokenName: string,
) {
    const { account } = await getConfig(hre, environment);
    const contractsNitrogen: ContractsNitrogen = await readFromFile(
        `${environment}/contracts_nitrogen.json`,
    );

    // @ts-ignore
    const routerAgentAddress: string = contractsNitrogen.eth.routerAgents[tokenName];
    if (routerAgentAddress === undefined || routerAgentAddress === '') {
        throw new Error(`Unexpected tokenName: ${tokenName}.`);
    }
    console.log('routerAgentAddress: ', routerAgentAddress);

    const routerAgent = await hre.ethers.getContractAt('RouterAgent', routerAgentAddress);
    const router = await hre.ethers.getContractAt('Router', contractsNitrogen.eth.router);
    const rebaseToken = await hre.ethers.getContractAt(
        'RebaseToken',
        contractsNitrogen.eth.rebaseToken,
    );
    const supplyManager = await hre.ethers.getContractAt(
        'SupplyManager',
        contractsNitrogen.eth.supplyManager,
    );

    if ((await routerAgent.owner()) !== account.address) {
        throw new Error(`Bad routerAgent's owner ${await routerAgent.owner()}`);
    }
    if ((await router.owner()) !== account.address) {
        throw new Error(`Bad router's owner ${await router.owner()}`);
    }
    if ((await rebaseToken.owner()) !== account.address) {
        throw new Error(`Bad rebaseToken's owner: ${await rebaseToken.owner()}`);
    }
    if ((await supplyManager.owner()) !== account.address) {
        throw new Error(`Bad supplyManager's owner: ${await supplyManager.owner()}`);
    }

    // Add agent in Router
    const codeHash = keccak256((await routerAgent.getDeployedCode())!);
    const isInWhiteList = await router.agentCodeHashWhiteList(codeHash);
    if (!isInWhiteList) {
        console.log("Adding RouterAgent's code hash in white list...");
        const tx = await router.setAgentCodeHashInWhiteList(codeHash, true);
        await tx.wait();
    }
    console.log('Adding agent in Router...');
    let tx = await router.addAgent(
        routerAgent.getAddress(),
        false,
        false,
        minDepositValue,
        minRedeemShares,
    );
    await tx.wait();

    console.log('Adding agent in SupplyManager...');
    tx = await supplyManager.setAgent(routerAgent.getAddress(), true);
    await tx.wait();

    console.log('Setting Router as new owner of RebaseToken...');
    tx = await rebaseToken.transferOwnership(router.getAddress());
    await tx.wait();
}

import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import {
    MoleculaPoolVersion,
    type EnvironmentType,
    type ContractsNitrogen,
    type ContractAccountantAgent,
} from '@molecula-monorepo/blockchain.addresses';

import { getConfig, readFromFile, writeToFile } from '../utils/deployUtils';

async function ensureNoValueToRedeem(
    hre: HardhatRuntimeEnvironment,
    version: MoleculaPoolVersion,
    address: string,
    token: string,
) {
    switch (version) {
        case MoleculaPoolVersion.v10: {
            const moleculaPool = await hre.ethers.getContractAt('MoleculaPool', address);
            if ((await moleculaPool.valueToRedeem()) >= 0.5 * 10 ** 18) {
                throw new Error('Unprocessed redeem requests to migrate');
            }
            break;
        }
        case MoleculaPoolVersion.v11: {
            const moleculaPool = await hre.ethers.getContractAt('MoleculaPoolTreasury', address);
            const tokenInfo = await moleculaPool.poolMap(token);
            if (tokenInfo.valueToRedeem !== 0n) {
                throw new Error('Unprocessed redeem requests to migrate');
            }
            break;
        }
        default:
            throw new Error();
    }
}

export async function migrateNitrogenAgent(
    hre: HardhatRuntimeEnvironment,
    environment: EnvironmentType,
    version: MoleculaPoolVersion,
) {
    const accountantAgentAddress = (
        (await readFromFile(`${environment}/accountant_agent.json`)) as ContractAccountantAgent
    ).accountantAgent;

    if (accountantAgentAddress.length === 0) {
        throw new Error('Firstly deploy accountantAgentAddress');
    }

    const contractsNitrogen: ContractsNitrogen = await readFromFile(
        `${environment}/contracts_nitrogen.json`,
    );

    const newAgent = await hre.ethers.getContractAt('AccountantAgent', accountantAgentAddress);
    const oldAgent = await hre.ethers.getContractAt(
        'AgentAccountant',
        contractsNitrogen.eth.accountantAgent,
    );
    const rebaseToken = await hre.ethers.getContractAt(
        'RebaseToken',
        contractsNitrogen.eth.rebaseToken,
    );
    const supplyManager = await hre.ethers.getContractAt(
        'SupplyManager',
        contractsNitrogen.eth.supplyManager,
    );

    const { account } = await getConfig(hre, environment);

    if ((await rebaseToken.owner()) !== account.address) {
        throw new Error('Bad rebaseToken owner');
    }
    if ((await supplyManager.owner()) !== account.address) {
        throw new Error('Bad supplyManager owner');
    }

    const token = await newAgent.getERC20Token();

    // 1. Disable a previous Agent in SupplyManager
    if (await supplyManager.agents(oldAgent)) {
        const tx = await supplyManager.setAgent(oldAgent, false);
        await tx.wait();
    }

    // 2. Again ensure to satisfy all pending requests
    await ensureNoValueToRedeem(hre, version, contractsNitrogen.eth.moleculaPool, token);

    // 3. Change accountant agent in RebaseToken
    let tx = await rebaseToken.setAccountant(newAgent);
    await tx.wait();

    // 4. Add new accountant agent to SupplyManager
    if (!(await supplyManager.agents(newAgent))) {
        tx = await supplyManager.setAgent(newAgent, true);
        await tx.wait();
    }

    // 5. Update deploy file.
    contractsNitrogen.eth.accountantAgent = await newAgent.getAddress();
    writeToFile(`${environment}/contracts_nitrogen.json`, contractsNitrogen);
}

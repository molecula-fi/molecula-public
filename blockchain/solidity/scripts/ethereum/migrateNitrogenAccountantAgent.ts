import { type HDNodeWallet } from 'ethers';
import { ethers } from 'hardhat';

import {
    MoleculaPoolVersion,
    type NetworkType,
    type AccountantAgentContract,
    type ContractsNitrogen,
} from '@molecula-monorepo/blockchain.addresses';

import {
    getArgValue,
    getNetwork,
    getVersion,
    handleError,
    readFromFile,
    writeToFile,
    getProviderAndAccount,
} from '../utils/deployUtils';

async function ensureNoValueToRedeem(
    version: MoleculaPoolVersion,
    address: string,
    account: HDNodeWallet,
    token: string,
) {
    switch (version) {
        case MoleculaPoolVersion.v10: {
            const moleculaPool = await ethers.getContractAt('MoleculaPool', address, account);
            if ((await moleculaPool.valueToRedeem()) !== 0n) {
                throw new Error('moleculaPool.valueToRedeem() !== 0');
            }
            break;
        }
        case MoleculaPoolVersion.v11: {
            const moleculaPool = await ethers.getContractAt(
                'MoleculaPoolTreasury',
                address,
                account,
            );
            const tokenInfo = await moleculaPool.poolMap(token);
            if (tokenInfo.valueToRedeem !== 0n) {
                throw new Error('tokenInfo.valueToRedeem !== 0n');
            }
            break;
        }
        default:
            throw new Error();
    }
}

async function run(phrase: string, network: NetworkType, version: MoleculaPoolVersion) {
    const { account } = await getProviderAndAccount(phrase, network);

    const accountantAgentAddress = (
        (await readFromFile(`${network}/accountant_agent.json`)) as typeof AccountantAgentContract
    ).accountantAgent;
    if (accountantAgentAddress.length === 0) {
        throw new Error('Firstly deploy accountantAgentAddress');
    }

    const contractsNitrogen: typeof ContractsNitrogen = await readFromFile(
        `${network}/contracts_nitrogen.json`,
    );
    const newAgent = await ethers.getContractAt('AccountantAgent', accountantAgentAddress, account);
    const oldAgent = await ethers.getContractAt(
        'AgentAccountant',
        contractsNitrogen.eth.accountantAgent,
        account,
    );
    const rebaseToken = await ethers.getContractAt(
        'RebaseToken',
        contractsNitrogen.eth.rebaseToken,
        account,
    );
    const supplyManager = await ethers.getContractAt(
        'SupplyManager',
        contractsNitrogen.eth.supplyManager,
        account,
    );
    const moleculaPool = await ethers.getContractAt(
        'Ownable',
        contractsNitrogen.eth.moleculaPool,
        account,
    );
    if ((await newAgent.owner()) !== account.address) {
        throw new Error('Bad newAgent owner');
    }
    if ((await oldAgent.owner()) !== account.address) {
        throw new Error('Bad oldAgent owner');
    }
    if ((await rebaseToken.owner()) !== account.address) {
        throw new Error('Bad rebaseToken owner');
    }
    if ((await supplyManager.owner()) !== account.address) {
        throw new Error('Bad supplyManager owner');
    }
    if ((await moleculaPool.owner()) !== account.address) {
        throw new Error('Bad moleculaPool owner');
    }

    const token = await newAgent.getERC20Token();

    // 1. Disable a previous Agent in SupplyManager
    if (await supplyManager.agents(oldAgent)) {
        const tx = await supplyManager.setAgent(oldAgent, false);
        await tx.wait();
    }

    // 2. Again ensure to satisfy all pending requests
    await ensureNoValueToRedeem(version, contractsNitrogen.eth.moleculaPool, account, token);

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
    writeToFile(`${network}/contracts_nitrogen.json`, contractsNitrogen);
}

const ethPhrase = getArgValue('--ethPhrase');
const network = getNetwork();
const version = getVersion();

run(ethPhrase, network, version).catch(handleError);

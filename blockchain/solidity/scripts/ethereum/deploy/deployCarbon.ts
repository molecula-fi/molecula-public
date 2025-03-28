import { Options } from '@layerzerolabs/lz-v2-utilities';
import { type HardhatRuntimeEnvironment } from 'hardhat/types';
import TronWeb from 'tronweb';

import type { NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { DEPLOY_GAS_LIMIT } from '../../../configs/ethereum/constants';
import { getTronNetworkConfig, getConfig, getNonce } from '../../utils/deployUtils';

export async function deployCarbon(
    hre: HardhatRuntimeEnvironment,
    environment: NetworkType,
    contracts: {
        supplyManagerAddress: string;
        moleculaPoolAddress: string;
    },
) {
    const { config, account } = await getConfig(hre, environment);

    // calc agent LZ future address
    const trxCount = await getNonce(account);
    const agentLZFutureAddress = hre.ethers.getCreateAddress({
        from: account.address,
        nonce: trxCount,
    });

    // make options
    const GAS_LIMIT = 200000;
    const MSG_VALUE = 0;
    const options = Options.newOptions().addExecutorLzReceiveOption(GAS_LIMIT, MSG_VALUE);
    console.log('Options set:', options.toHex());

    // deploy agentLZ
    const AgentLZ = await hre.ethers.getContractFactory('AgentLZ');
    const agentLZ = await AgentLZ.deploy(
        account.address,
        // Correct auth LZ Configurator address is set up latter. Because we need to call `setAgentAccountant`, etc.
        account.address,
        config.LAYER_ZERO_ENDPOINT,
        contracts.supplyManagerAddress,
        config.LAYER_ZERO_TRON_EID,
        config.USDT_ADDRESS,
        config.USDT_OFT,
        { gasLimit: DEPLOY_GAS_LIMIT },
    );
    await agentLZ.waitForDeployment();
    console.log('AgentLZ deployed: ', await agentLZ.getAddress());

    if ((await agentLZ.getAddress()) !== agentLZFutureAddress) {
        throw new Error(`AgentLZ address is not correct, future address: ${agentLZFutureAddress}`);
    }

    // set agent LZ to supply manager
    const supplyManager = await hre.ethers.getContractAt(
        'SupplyManager',
        contracts.supplyManagerAddress,
    );
    console.log('setAgent...');
    const tx1 = await supplyManager.setAgent(await agentLZ.getAddress(), true);
    await tx1.wait();
    console.log('Done setAgent');

    console.log('Agent deployed: ', await agentLZ.getAddress());
    console.log('SupplyManager: ', contracts.supplyManagerAddress);
    console.log('MoleculaPool: ', contracts.moleculaPoolAddress);

    return {
        moleculaPool: contracts.moleculaPoolAddress,
        agentLZ: await agentLZ.getAddress(),
        supplyManager: contracts.supplyManagerAddress,
        poolKeeper: config.POOL_KEEPER,
    };
}

export async function setAccountant(
    hre: HardhatRuntimeEnvironment,
    environment: NetworkType,
    contracts: {
        agentLZ: string;
        accountantLZ: string;
    },
) {
    const config = getTronNetworkConfig(environment);

    // Create TronWeb instance
    const tronWeb = new TronWeb({
        fullHost: config.RPC_URL,
    });
    const accountantLzHexaDecimal = tronWeb.address
        .toHex(contracts.accountantLZ)
        .replace(/^(41)/, '0x') as string;

    const agentLZContract = await hre.ethers.getContractAt('AgentLZ', contracts.agentLZ);

    const response = await agentLZContract.setAccountant(accountantLzHexaDecimal);

    await response.wait();

    console.log(`\tSet accountantLZ for contract AgentLZ ${contracts.agentLZ}.`);
}

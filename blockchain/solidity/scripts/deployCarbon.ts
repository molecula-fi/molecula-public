import { Options } from '@layerzerolabs/lz-v2-utilities';
import { ethers } from 'hardhat';

import type { NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { DEPLOY_GAS_LIMIT } from '../configs/ethereum';

// import { getProviderAndAccount, getNetworkConfig } from './utils/deployUtils';
import { getConfig, getNonce } from './utils/deployUtils';

import {
    CONFIRM_DEPOSIT,
    CONFIRM_REDEEM,
    DISTRIBUTE_YIELD,
    CONFIRM_DEPOSIT_AND_UPDATE_ORACLE,
    DISTRIBUTE_YIELD_AND_UPDATE_ORACLE,
    UPDATE_ORACLE,
    SWAP_WMUSDT,
} from './utils/lzMsgTypes';

export async function deployCarbon(
    environment: NetworkType,
    contracts: {
        supplyManagerAddress: string;
        moleculaPoolAddress: string;
    },
) {
    const { config, account } = await getConfig(environment);

    // calc agent LZ future address
    const trxCount = await getNonce(account);
    const agentLZFutureAddress = ethers.getCreateAddress({
        from: account,
        nonce: trxCount + 1,
    });

    // make options
    const GAS_LIMIT = 200000;
    const MSG_VALUE = 0;
    const options = Options.newOptions().addExecutorLzReceiveOption(GAS_LIMIT, MSG_VALUE);
    console.log('Options set:', options.toHex());
    // deploy wmUSDT token
    const WMUSDTToken = await ethers.getContractFactory('WmUsdtToken');
    const wmUSDT = await WMUSDTToken.deploy(
        0,
        {
            initialOwner: account,
            agentAddress: agentLZFutureAddress,
            poolKeeperAddress: contracts.moleculaPoolAddress,
            server: config.AUTHORIZED_WMUSDT_SERVER,
        },
        {
            endpoint: config.LAYER_ZERO_ENDPOINT,
            // Correct auth LZ Configurator address is set up latter. Because we need to call `setGasLimit`, etc.
            authorizedLZConfigurator: account,
            // Set the base options without specifying the gas limit
            // The value bellow is received from:
            // const options = Options.newOptions().addExecutorLzReceiveOption(GAS_LIMIT, MSG_VALUE);
            // trimmed at the end in order to remove the GAS_LIMIT value which is to be specified
            // separately for each LayerZero message.
            // See: https://github.com/molecula-fi/molecula-monorepo/blob/57fbcf1e54d70d18667bebc3b5074c41d340dcba/contracts/networks/tron/contracts/common/OptionsLZ.sol#L60
            lzBaseOpt: '0x000301001101',
            lzDstEid: config.LAYER_ZERO_TRON_EID,
        },
        {
            usdtTokenAddress: config.USDT_ADDRESS,
            swftBridgeAddress: config.SWFT_BRIDGE,
            swftDest: '', // don't forget to update it after shasta contracts are deployed
        },
        { gasLimit: DEPLOY_GAS_LIMIT },
    );
    await wmUSDT.waitForDeployment();
    console.log('wmUSDT deployed: ', await wmUSDT.getAddress());

    // deploy agentLZ
    const AgentLZ = await ethers.getContractFactory('AgentLZ');
    const agentLZ = await AgentLZ.deploy(
        account,
        // Correct auth LZ Configurator address is set up latter. Because we need to call `setGasLimit`, etc.
        account,
        config.AUTHORIZED_AGENT_SERVER,
        config.LAYER_ZERO_ENDPOINT,
        contracts.supplyManagerAddress,
        config.LAYER_ZERO_TRON_EID,
        await wmUSDT.getAddress(),
        // Set the base options without specifying the gas limit
        // The value bellow is received from:
        // const options = Options.newOptions().addExecutorLzReceiveOption(GAS_LIMIT, MSG_VALUE);
        // trimmed at the end in order to remove the GAS_LIMIT value which is to be specified
        // separately for each LayerZero message.
        // See: https://github.com/molecula-fi/molecula-monorepo/blob/57fbcf1e54d70d18667bebc3b5074c41d340dcba/contracts/networks/tron/contracts/common/OptionsLZ.sol#L60
        '0x000301001101',
        { gasLimit: DEPLOY_GAS_LIMIT },
    );
    await agentLZ.waitForDeployment();
    console.log('AgentLZ deployed: ', await agentLZ.getAddress());

    if ((await agentLZ.getAddress()) !== agentLZFutureAddress) {
        throw new Error(`AgentLZ address is not correct, future address: ${agentLZFutureAddress}`);
    }

    // set agen LZ to supply manager
    const supplyManager = await ethers.getContractAt(
        'SupplyManager',
        contracts.supplyManagerAddress,
    );
    console.log('setAgent...');
    const tx1 = await supplyManager.setAgent(await agentLZ.getAddress(), true);
    await tx1.wait();
    console.log('Done setAgent');
    console.log('setAgent');

    // add wmUSDT to molecula pool
    const moleculaPool = await ethers.getContractAt(
        'MoleculaPoolTreasury',
        contracts.moleculaPoolAddress,
    );
    // add new erc20 token
    const tx2 = await moleculaPool.addToken(await wmUSDT.getAddress(), 12);
    await tx2.wait();
    console.log('addPool20');

    // Set LZ options
    let txGl = await agentLZ.setGasLimit(CONFIRM_DEPOSIT, 200_000n, 0n);
    await txGl.wait();
    console.log('setGasLimit CONFIRM_DEPOSIT');
    txGl = await agentLZ.setGasLimit(CONFIRM_DEPOSIT_AND_UPDATE_ORACLE, 200_000n, 0n);
    await txGl.wait();
    console.log('setGasLimit CONFIRM_DEPOSIT_AND_UPDATE_ORACLE');
    txGl = await agentLZ.setGasLimit(DISTRIBUTE_YIELD, 200_000n, 50_000n);
    await txGl.wait();
    console.log('setGasLimit DISTRIBUTE_YIELD');
    txGl = await agentLZ.setGasLimit(DISTRIBUTE_YIELD_AND_UPDATE_ORACLE, 200_000n, 50_000n);
    await txGl.wait();
    console.log('setGasLimit DISTRIBUTE_YIELD_AND_UPDATE_ORACLE');
    txGl = await agentLZ.setGasLimit(CONFIRM_REDEEM, 200_000n, 0n);
    await txGl.wait();
    console.log('setGasLimit CONFIRM_REDEEM');
    txGl = await agentLZ.setGasLimit(UPDATE_ORACLE, 10n, 0n);
    await txGl.wait();
    console.log('setGasLimit UPDATE_ORACLE');

    // set authorized lz configurator
    txGl = await agentLZ.setAuthorizedLZConfigurator(config.AGENT_AUTHORIZED_LZ_CONFIGURATOR);
    await txGl.wait();
    console.log('agent setAuthorizedLZConfigurator');

    // Set wmUSDT LZ options
    await wmUSDT.setGasLimit(SWAP_WMUSDT, 100_000n, 0n);
    console.log('setGasLimit SWAP_WMUSDT');

    // set authorized lz configurator
    txGl = await wmUSDT.setAuthorizedLZConfigurator(config.WMUSDT_AUTHORIZED_LZ_CONFIGURATOR);
    await txGl.wait();
    console.log('wmUSDT setAuthorizedLZConfigurator');

    console.log('Agent deployed: ', await agentLZ.getAddress());
    console.log('wmUSDT deployed: ', await wmUSDT.getAddress());
    console.log('SupplyManager: ', contracts.supplyManagerAddress);
    console.log('MoleculaPool: ', contracts.moleculaPoolAddress);
    console.log('SwftBridge: ', config.SWFT_BRIDGE);

    return {
        moleculaPool: contracts.moleculaPoolAddress,
        agentLZ: await agentLZ.getAddress(),
        wmUSDT: await wmUSDT.getAddress(),
        supplyManager: contracts.supplyManagerAddress,
        poolKeeper: config.POOL_KEEPER,
        swftBridge: config.SWFT_BRIDGE,
    };
}

export async function setPeerWithNetwork(environment: NetworkType, oApp: string, oapp: string) {
    // get config
    console.log('Environment:', environment);
    const { config } = await getConfig(environment);

    console.log('Block #', await ethers.provider.getBlockNumber());

    const agentLZ = await ethers.getContractAt('OApp', oApp);
    const value = ethers.zeroPadValue(`0x${oapp}`, 32);
    const tx = await agentLZ.setPeer(config.LAYER_ZERO_TRON_EID, value);
    await tx.wait();

    console.log('setPeer Done');
}

export async function setSwftDestinationWithNetwork(
    environment: NetworkType,
    wmUsdt: string,
    dst: string,
) {
    console.log('Environment:', environment);

    console.log('Block #', await ethers.provider.getBlockNumber());

    const contract = await ethers.getContractAt('WmUsdtToken', wmUsdt);
    const tx = await contract.setSwftDestination(dst);
    await tx.wait();

    console.log('setSwftDestination Done');
}

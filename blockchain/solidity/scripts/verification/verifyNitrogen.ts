import { ethers, network } from 'hardhat';

import { NetworkType } from '@molecula-monorepo/blockchain.addresses';
import type {
    ContractsNitrogen,
    MainBetaContractsNitrogen,
    MainProdContractsNitrogen,
} from '@molecula-monorepo/blockchain.addresses/deploy';

import { readFromFile, verifyContract, getConfig, unitePool20And4626 } from '../utils/deployUtils';

async function runVerify() {
    const networkType =
        network.name === 'sepolia' ? NetworkType.devnet : NetworkType['mainnet/beta'];
    const { config } = await getConfig(networkType);

    const contractsCore = await readFromFile(`${networkType}/contracts_core.json`);

    const contractsConfig:
        | typeof ContractsNitrogen
        | typeof MainBetaContractsNitrogen
        | typeof MainProdContractsNitrogen = await readFromFile(
        `${networkType}/contracts_nitrogen.json`,
    );

    const pools20 = [...config.POOLS20];
    if (contractsConfig.eth.mUSDe !== '') {
        pools20.push({ pool: contractsConfig.eth.mUSDe, n: 0 });
    }

    await verifyContract('MUSDLock', contractsConfig.eth.mUSDLock, [
        contractsConfig.eth.rebaseToken,
    ]);

    await verifyContract('MUSDE', contractsConfig.eth.mUSDe, [
        config.SUSDE_ADDRESS,
        contractsConfig.eth.poolKeeper,
    ]);

    await verifyContract('MoleculaPool', contractsConfig.eth.moleculaPool, [
        config.DEPLOYER_ADDRESS,
        config.AUTHORIZED_REDEEMER,
        pools20,
        config.POOLS4626,
        contractsConfig.eth.poolKeeper,
        contractsConfig.eth.supplyManager,
    ]);

    await verifyContract('MoleculaPoolTreasury', contractsConfig.eth.moleculaPool, [
        config.DEPLOYER_ADDRESS,
        unitePool20And4626(pools20, config.POOLS4626),
        contractsConfig.eth.poolKeeper,
        contractsConfig.eth.supplyManager,
        config.WHITE_LIST,
        config.USDT_ADDRESS,
        config.GUARDIAN_ADDRESS,
    ]);

    await verifyContract('AccountantAgent', contractsConfig.eth.accountantAgent, [
        config.OWNER,
        contractsConfig.eth.rebaseToken,
        contractsConfig.eth.supplyManager,
        config.USDT_ADDRESS,
        config.GUARDIAN_ADDRESS,
    ]);

    await verifyContract('AgentAccountant', contractsConfig.eth.accountantAgent, [
        config.DEPLOYER_ADDRESS,
        contractsConfig.eth.rebaseToken,
        contractsConfig.eth.supplyManager,
        config.USDT_ADDRESS,
    ]);

    await verifyContract('SupplyManager', contractsConfig.eth.supplyManager, [
        config.DEPLOYER_ADDRESS,
        config.POOL_KEEPER,
        contractsCore.eth.moleculaPool,
        config.APY_FORMATTER.toString(),
    ]);

    const INITIAL_SHARES_SUPPLY = ethers.parseUnits(config.INITIAL_USDT_SUPPLY.toString(), 12);

    await verifyContract('RebaseToken', contractsConfig.eth.rebaseToken, [
        config.DEPLOYER_ADDRESS,
        contractsConfig.eth.accountantAgent,
        INITIAL_SHARES_SUPPLY,
        contractsConfig.eth.supplyManager,
        config.MUSD_TOKEN_NAME,
        config.MUSD_TOKEN_SYMBOL,
        config.MUSD_TOKEN_DECIMALS,
        config.MUSD_TOKEN_MIN_DEPOSIT,
        config.MUSD_TOKEN_MIN_REDEEM,
    ]);
}

runVerify().catch(error => {
    console.error('Failed to verify:', error);
    process.exit(1);
});

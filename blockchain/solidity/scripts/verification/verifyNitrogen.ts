import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import { type EVMAddress, NetworkType } from '@molecula-monorepo/blockchain.addresses';
import type {
    ContractsNitrogen,
    MainBetaContractsNitrogen,
    MainProdContractsNitrogen,
} from '@molecula-monorepo/blockchain.addresses/deploy';

import { readFromFile, getNetworkConfig } from '../utils/deployUtils';

import { verifyContract } from './verificationUtils';

export async function runVerify(hre: HardhatRuntimeEnvironment) {
    const networkType =
        hre.network.name === 'sepolia' ? NetworkType.devnet : NetworkType['mainnet/beta'];
    const config = getNetworkConfig(networkType);

    const contractsCore = await readFromFile(`${networkType}/contracts_core.json`);

    const account = (await hre.ethers.getSigners())[0]!;

    const contractsConfig:
        | typeof ContractsNitrogen
        | typeof MainBetaContractsNitrogen
        | typeof MainProdContractsNitrogen = await readFromFile(
        `${networkType}/contracts_nitrogen.json`,
    );

    const tokens = [...config.TOKENS];
    if (contractsConfig.eth.mUSDe !== '') {
        tokens.push({ token: contractsConfig.eth.mUSDe as EVMAddress, n: 0 });
    }

    await verifyContract(hre, 'MUSDLock', contractsConfig.eth.mUSDLock, [
        contractsConfig.eth.rebaseToken,
    ]);

    await verifyContract(hre, 'MUSDE', contractsConfig.eth.mUSDe, [
        config.SUSDE_ADDRESS,
        contractsConfig.eth.poolKeeper,
    ]);

    await verifyContract(hre, 'MoleculaPoolTreasury', contractsConfig.eth.moleculaPool, [
        account.address,
        tokens.map(x => x.token),
        contractsConfig.eth.poolKeeper,
        contractsConfig.eth.supplyManager,
        config.WHITE_LIST,
        config.GUARDIAN_ADDRESS,
    ]);

    await verifyContract(hre, 'AccountantAgent', contractsConfig.eth.accountantAgent, [
        account.address,
        contractsConfig.eth.rebaseToken,
        contractsConfig.eth.supplyManager,
        config.USDT_ADDRESS,
        config.GUARDIAN_ADDRESS,
    ]);

    await verifyContract(hre, 'SupplyManager', contractsConfig.eth.supplyManager, [
        account.address,
        config.POOL_KEEPER,
        contractsCore.eth.moleculaPool,
        config.APY_FORMATTER.toString(),
    ]);

    const INITIAL_SHARES_SUPPLY = hre.ethers.parseUnits(config.INITIAL_USDT_SUPPLY.toString(), 12);

    await verifyContract(hre, 'RebaseToken', contractsConfig.eth.rebaseToken, [
        account.address,
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

async function main() {
    const hardhat = await import('hardhat');
    const hre: HardhatRuntimeEnvironment = hardhat.default;

    await runVerify(hre);
}

main().catch(error => {
    console.error('Failed to verify:', error);
    process.exit(1);
});

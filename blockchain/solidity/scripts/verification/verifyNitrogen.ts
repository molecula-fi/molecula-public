/* eslint-disable no-restricted-syntax, no-await-in-loop */

import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import {
    type ContractsCore,
    type EVMAddress,
    NetworkType,
} from '@molecula-monorepo/blockchain.addresses';
import type { ContractsNitrogen } from '@molecula-monorepo/blockchain.addresses/deploy';

import { readFromFile, getNetworkConfig } from '../utils/deployUtils';

import { verifyContract } from './verificationUtils';

export async function runVerify(hre: HardhatRuntimeEnvironment) {
    const networkType =
        hre.network.name === 'sepolia' ? NetworkType.devnet : NetworkType['mainnet/beta'];
    const config = getNetworkConfig(networkType);

    const contractsCore: ContractsCore = await readFromFile(`${networkType}/contracts_core.json`);

    const account = (await hre.ethers.getSigners())[0]!;

    const contractsNitrogen: ContractsNitrogen = await readFromFile(
        `${networkType}/contracts_nitrogen.json`,
    );

    const tokens = [...config.TOKENS];
    if (contractsNitrogen.eth.mUSDe !== '') {
        tokens.push({ token: contractsNitrogen.eth.mUSDe as EVMAddress, n: 0 });
    }

    await verifyContract(hre, 'MUSDLock', contractsNitrogen.eth.mUSDLock, [
        contractsNitrogen.eth.rebaseToken,
    ]);

    await verifyContract(hre, 'MUSDE', contractsNitrogen.eth.mUSDe, [
        config.SUSDE_ADDRESS,
        contractsNitrogen.eth.poolKeeper,
    ]);

    await verifyContract(hre, 'MoleculaPoolTreasury', contractsNitrogen.eth.moleculaPool, [
        account.address,
        tokens.map(x => x.token),
        contractsNitrogen.eth.poolKeeper,
        contractsNitrogen.eth.supplyManager,
        config.WHITE_LIST,
        config.GUARDIAN_ADDRESS,
    ]);

    await verifyContract(hre, 'AccountantAgent', contractsNitrogen.eth.accountantAgent, [
        account.address,
        contractsNitrogen.eth.rebaseToken,
        contractsNitrogen.eth.supplyManager,
        config.USDT_ADDRESS,
        config.GUARDIAN_ADDRESS,
    ]);

    await verifyContract(hre, 'SupplyManager', contractsNitrogen.eth.supplyManager, [
        account.address,
        config.POOL_KEEPER,
        contractsCore.eth.moleculaPool,
        config.APY_FORMATTER.toString(),
    ]);

    const INITIAL_SHARES_SUPPLY = hre.ethers.parseUnits(config.INITIAL_USDT_SUPPLY.toString(), 12);

    await verifyContract(hre, 'RebaseToken', contractsNitrogen.eth.rebaseToken, [
        account.address,
        contractsNitrogen.eth.accountantAgent,
        INITIAL_SHARES_SUPPLY,
        contractsNitrogen.eth.supplyManager,
        config.MUSD_TOKEN_NAME,
        config.MUSD_TOKEN_SYMBOL,
        config.MUSD_TOKEN_DECIMALS,
        config.MUSD_TOKEN_MIN_DEPOSIT,
        config.MUSD_TOKEN_MIN_REDEEM,
    ]);

    if (contractsNitrogen.eth.router !== '') {
        await verifyContract(hre, 'Router', contractsNitrogen.eth.router, [
            account.address,
            contractsNitrogen.eth.rebaseToken,
            config.GUARDIAN_ADDRESS,
        ]);
    }

    for (const routerAgentAddress of Object.values(contractsNitrogen.eth.routerAgents)) {
        await verifyContract(hre, 'RouterAgent', routerAgentAddress as string, [
            account.address,
            contractsNitrogen.eth.router,
            contractsNitrogen.eth.rebaseToken,
            contractsNitrogen.eth.supplyManager,
        ]);
    }
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

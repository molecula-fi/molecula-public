/* eslint-disable no-await-in-loop, no-restricted-syntax, no-bitwise */

import type { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
    type ContractsNitrogen,
    type EnvironmentType,
} from '@molecula-monorepo/blockchain.addresses';

import { getConfig, readFromFile, writeToFile } from '../utils/deployUtils';

export async function migrateNitrogenMoleculaPoolTreasury(
    hre: HardhatRuntimeEnvironment,
    environment: EnvironmentType,
) {
    const { account } = await getConfig(hre, environment);

    const moleculaPoolTreasuryAddress = (
        await readFromFile(`${environment}/molecula_pool_treasury.json`)
    ).moleculaPoolTreasury as string;
    if (moleculaPoolTreasuryAddress.length === 0) {
        throw new Error('Firstly deploy MoleculaPoolTreasury');
    }

    const contractsNitrogen: ContractsNitrogen = await readFromFile(
        `${environment}/contracts_nitrogen.json`,
    );
    const supplyManager = await hre.ethers.getContractAt(
        'SupplyManager',
        contractsNitrogen.eth.supplyManager,
    );
    const oldMoleculaPool = await hre.ethers.getContractAt(
        'MoleculaPool',
        contractsNitrogen.eth.moleculaPool,
    );

    // 1.1. Check SupplyManager's owner
    if ((await supplyManager.owner()) !== account.address) {
        throw new Error("Bad SupplyManager's owner");
    }

    // 1.2. Check allowance
    for (const { pool } of [
        ...(await oldMoleculaPool.getPools20()),
        ...(await oldMoleculaPool.getPools4626()),
    ]) {
        const erc20 = await hre.ethers.getContractAt('IERC20', pool);
        const { poolKeeper } = contractsNitrogen.eth;
        const balance = await erc20.balanceOf(poolKeeper);
        if (balance > 0) {
            const allowance = await erc20.allowance(poolKeeper, moleculaPoolTreasuryAddress);
            if (allowance !== (1n << 256n) - 1n) {
                throw new Error(`Bad allowance:
                balance: ${balance}
                allowance: ${allowance}
                token: ${pool}
                poolKeeper: ${poolKeeper}`);
            }
        }
    }

    // 2. Set new MoleculaPoolTreasury
    const tx = await supplyManager.setMoleculaPool(moleculaPoolTreasuryAddress);
    await tx.wait();

    // 3. Update deploy file.
    contractsNitrogen.eth.moleculaPool = moleculaPoolTreasuryAddress;
    writeToFile(`${environment}/contracts_nitrogen.json`, contractsNitrogen);
}

import { ethers, type JsonRpcProvider } from 'ethers';

import type { EVMAddress } from '@molecula-monorepo/common.evm-utilities';

import { EvmContractSafeFactory } from '../factory';

/**
 * Function to get pool address from the factory.
 * @param options - options to get the pool address with.
 * @returns found pool address if any.
 */
export async function viewCurvePoolAddress(
    options: {
        /**
         * The address of the Curve factory contract.
         */
        factoryAddress: string;

        /**
         * The address of the first token to add liquidity for.
         */
        token1Address: string;

        /**
         * The address of the second token to add liquidity for.
         */
        token2Address: string;

        /**
         * An optional provider to interact with Ethereum.
         */
        ethereumProvider: JsonRpcProvider;

        /**
         * The amplification coefficient of the pool.
         */
        A: bigint;

        /**
         * The fee of the pool.
         */
        fee: bigint;
    },
    i: number = 0, // private parameter ;)
): Promise<EVMAddress | undefined> {
    // Destructure options
    const { factoryAddress, token1Address, token2Address, ethereumProvider, A, fee } = options;

    // Get the pool on 'i' index
    const factory = EvmContractSafeFactory.ICurveStableSwapFactoryNG(
        factoryAddress,
        ethereumProvider,
    );
    const poolAddress = await factory.safeViewCall(
        'find_pool_for_coins',
        token1Address,
        token2Address,
        i,
    );

    // Check if the pool is present
    if (poolAddress === ethers.ZeroAddress) {
        // Return undefined if no pool found
        return undefined;
    }

    // Check if the pool has a right A parameter
    const pool = EvmContractSafeFactory.ICurveStableSwapNG(poolAddress, ethereumProvider);
    const poolA = await pool.safeViewCall('A');
    if (poolA !== A) {
        // Continue searching if the pool is not the right one
        return viewCurvePoolAddress(options, i + 1);
    }

    // Check if the pool has a right fee parameter
    const poolFee = await pool.safeViewCall('fee');
    if (poolFee !== fee) {
        // Continue searching if the pool is not the right one
        return viewCurvePoolAddress(options, i + 1);
    }

    // It's the one we need
    return poolAddress as EVMAddress;
}

import { ContractsCarbon, MainBetaContractsCarbon, MainProdContractsCarbon } from '../../deploy';

import { TronChainIDs } from './chains';

import type { TronAddress } from './types';

/**
 * Supported TRON token static addresses.
 */
export const tronStaticTokenAddress: Record<'USDT', Record<TronChainIDs, TronAddress>> = {
    USDT: {
        [TronChainIDs.Mainnet]: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        [TronChainIDs.Shasta]: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
    },
} as const;

/**
 * Supported TRON molecula contract addresses.
 */
export const tronMoleculaContractAddresses = {
    RebaseToken: {
        [TronChainIDs.Mainnet]: {
            prod: MainProdContractsCarbon.tron.rebaseToken as TronAddress,
            beta: MainBetaContractsCarbon.tron.rebaseToken as TronAddress,
        },
        [TronChainIDs.Shasta]: ContractsCarbon.tron.rebaseToken as TronAddress,
    },
    Oracle: {
        [TronChainIDs.Mainnet]: {
            prod: MainProdContractsCarbon.tron.oracle as TronAddress,
            beta: MainBetaContractsCarbon.tron.oracle as TronAddress,
        },
        [TronChainIDs.Shasta]: ContractsCarbon.tron.oracle as TronAddress,
    },
    AccountantLZ: {
        [TronChainIDs.Mainnet]: {
            prod: MainProdContractsCarbon.tron.accountantLZ as TronAddress,
            beta: MainBetaContractsCarbon.tron.accountantLZ as TronAddress,
        },
        [TronChainIDs.Shasta]: ContractsCarbon.tron.accountantLZ as TronAddress,
    },
    MUSDLock: {
        [TronChainIDs.Mainnet]: {
            prod: MainProdContractsCarbon.tron.mUSDLock as TronAddress,
            beta: MainBetaContractsCarbon.tron.mUSDLock as TronAddress,
        },
        [TronChainIDs.Shasta]: ContractsCarbon.tron.mUSDLock as TronAddress,
    },
    SwftBridge: {
        [TronChainIDs.Mainnet]: {
            prod: MainProdContractsCarbon.tron.swftBridge as TronAddress,
            beta: MainBetaContractsCarbon.tron.swftBridge as TronAddress,
        },
        [TronChainIDs.Shasta]: ContractsCarbon.tron.swftBridge as TronAddress,
    },
} as const;

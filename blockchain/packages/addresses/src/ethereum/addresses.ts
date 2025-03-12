import {
    ContractsCarbon,
    ContractsNitrogen,
    MainBetaContractsCarbon,
    MainBetaContractsNitrogen,
} from '../../deploy';

import { MainProdContractsCarbon, MainProdContractsNitrogen } from '../../deploy/mainnet/prod';

import { EVMChainIDs } from './chains';

import type { EVMAddress } from './types';

/**
 * Supported EVM token static addresses.
 */
export const evmStaticTokenAddresses = {
    USDT: {
        [EVMChainIDs.Mainnet]: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        [EVMChainIDs.Sepolia]: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
    },
    DAI: {
        [EVMChainIDs.Mainnet]: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        [EVMChainIDs.Sepolia]: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
    },
    sDAI: {
        [EVMChainIDs.Mainnet]: '0x83f20f44975d03b1b09e64809b757c47f942beea',
        [EVMChainIDs.Sepolia]: undefined,
    },
    spDAI: {
        [EVMChainIDs.Mainnet]: '0x4DEDf26112B3Ec8eC46e7E31EA5e123490B05B8B',
        [EVMChainIDs.Sepolia]: undefined,
    },
    USDe: {
        [EVMChainIDs.Mainnet]: '0x4c9edd5852cd905f086c759e8383e09bff1e68b3',
        [EVMChainIDs.Sepolia]: '0x3882Ef2d84B0aA75b1565Bb99A8fb90e52612b92',
    },
    sUSDe: {
        [EVMChainIDs.Mainnet]: '0x9d39a5de30e57443bff2a8307a4256c8797a3497',
        [EVMChainIDs.Sepolia]: '0x572d3e6b50BB4B2CB4061db7aa233Ae50d9ab258',
    },
    aEthUSDT: {
        [EVMChainIDs.Mainnet]: '0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a',
        [EVMChainIDs.Sepolia]: '0xAF0F6e8b0Dc5c913bbF4d14c22B4E78Dd14310B6',
    },
    sFRAX: {
        [EVMChainIDs.Mainnet]: '0xa663b02cf0a4b149d2ad41910cb81e23e1c41c32',
        [EVMChainIDs.Sepolia]: undefined,
    },
    USDC: {
        [EVMChainIDs.Mainnet]: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        [EVMChainIDs.Sepolia]: '0x13fA158A117b93C27c55b8216806294a0aE88b6D',
    },
} as const;

/**
 * Supported EVM token molecula addresses.
 */
export const evmMoleculaTokenAddresses = {
    mUSDe: {
        [EVMChainIDs.Mainnet]: {
            beta: MainBetaContractsNitrogen.eth.mUSDe as EVMAddress,
            prod: MainProdContractsNitrogen.eth.mUSDe as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: ContractsNitrogen.eth.mUSDe as EVMAddress,
    },
} as const;

/**
 * Supported EVM static contract addresses.
 */
export const evmStaticContractAddresses = {
    SparkPool: {
        [EVMChainIDs.Mainnet]: '0xC13e21B648A5Ee794902342038FF3aDAB66BE987',
        [EVMChainIDs.Sepolia]: undefined,
    },
    AavePool: {
        [EVMChainIDs.Mainnet]: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        [EVMChainIDs.Sepolia]: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
    },
} as const;

/**
 * Supported EVM molecula contract addresses.
 */
export const evmMoleculaContractAddresses = {
    SupplyManager: {
        [EVMChainIDs.Mainnet]: {
            beta: MainBetaContractsNitrogen.eth.supplyManager as EVMAddress,
            prod: MainProdContractsNitrogen.eth.supplyManager as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: ContractsNitrogen.eth.supplyManager as EVMAddress,
    },
    PoolKeeper: {
        [EVMChainIDs.Mainnet]: {
            beta: MainBetaContractsNitrogen.eth.poolKeeper as EVMAddress,
            prod: MainProdContractsNitrogen.eth.poolKeeper as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: ContractsNitrogen.eth.poolKeeper as EVMAddress,
    },
    MoleculaPool: {
        [EVMChainIDs.Mainnet]: {
            beta: MainBetaContractsNitrogen.eth.moleculaPool as EVMAddress,
            prod: MainProdContractsNitrogen.eth.moleculaPool as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: ContractsNitrogen.eth.moleculaPool as EVMAddress,
    },
    AccountantAgent: {
        [EVMChainIDs.Mainnet]: {
            beta: MainBetaContractsNitrogen.eth.accountantAgent as EVMAddress,
            prod: MainProdContractsNitrogen.eth.accountantAgent as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: ContractsNitrogen.eth.accountantAgent as EVMAddress,
    },
    RebaseToken: {
        [EVMChainIDs.Mainnet]: {
            beta: MainBetaContractsNitrogen.eth.rebaseToken as EVMAddress,
            prod: MainProdContractsNitrogen.eth.rebaseToken as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: ContractsNitrogen.eth.rebaseToken as EVMAddress,
    },
    MUSDLock: {
        [EVMChainIDs.Mainnet]: {
            beta: MainBetaContractsNitrogen.eth.mUSDLock as EVMAddress,
            prod: MainProdContractsNitrogen.eth.mUSDLock as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: ContractsNitrogen.eth.mUSDLock as EVMAddress,
    },
    AgentLZ: {
        [EVMChainIDs.Mainnet]: {
            beta: MainBetaContractsCarbon.eth.agentLZ as EVMAddress,
            prod: MainProdContractsCarbon.eth.agentLZ as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: ContractsCarbon.eth.agentLZ as EVMAddress,
    },
    SwftBridge: {
        [EVMChainIDs.Mainnet]: undefined,
        [EVMChainIDs.Sepolia]: ContractsCarbon.eth.swftBridge as EVMAddress,
    },
} as const;

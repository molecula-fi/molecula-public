import { evmMoleculaTokenAddresses, evmStaticTokenAddresses } from '../addresses';

import { EVMChainIDs } from '../chains';

import type { PoolCurrency } from '../currencies';

import type { PoolData } from './types';

// Testnet

/**
 * Static PoolERC20 Currencies addresses for Retail for Testnet.
 */
export const staticPoolERC20CurrenciesRetailTestnet = {
    USDT: {
        pool: evmStaticTokenAddresses.USDT[EVMChainIDs.Sepolia],
        n: 12,
    },
    USDC: {
        pool: evmStaticTokenAddresses.USDC[EVMChainIDs.Sepolia],
        n: 12,
    },
    DAI: {
        pool: evmStaticTokenAddresses.DAI[EVMChainIDs.Sepolia],
        n: 0,
    },
    USDe: {
        pool: evmStaticTokenAddresses.USDe[EVMChainIDs.Sepolia],
        n: 0,
    },
    aEthUSDT: {
        pool: evmStaticTokenAddresses.aEthUSDT[EVMChainIDs.Sepolia],
        n: 12,
    },
    aEthUSDC: {
        pool: evmStaticTokenAddresses.aEthUSDC[EVMChainIDs.Sepolia],
        n: 12,
    },
    aEthDAI: {
        pool: evmStaticTokenAddresses.aEthDAI[EVMChainIDs.Sepolia],
        n: 12,
    },
} satisfies { [token in PoolCurrency]?: PoolData };

/**
 * PoolERC20 Currencies addresses for Retail for Testnet.
 */
export const poolERC20CurrenciesRetailTestnet = {
    ...staticPoolERC20CurrenciesRetailTestnet,
    mUSDe: {
        pool: evmMoleculaTokenAddresses.mUSDe[EVMChainIDs.Sepolia],
        n: 0,
    },
} satisfies { [token in PoolCurrency]?: PoolData };

/**
 * PoolERC4626 Currencies addresses for Retail for Testnet.
 */
export const poolERC4626CurrenciesRetailTestnet = {
    sUSDe: {
        pool: evmStaticTokenAddresses.sUSDe[EVMChainIDs.Sepolia],
        n: 0,
    },
} satisfies { [token in PoolCurrency]?: PoolData };

/**
 * A type annotation for ERC-20 tokens which can be used by Pool Keeper in Retail Testnet.
 */
export type PoolsERC20TokensRetailTestnet = keyof typeof poolERC20CurrenciesRetailTestnet;

/**
 * A type annotation for ERC-4626 tokens which can be used by Pool Keeper in Retail Mainnet.
 */
export type PoolsERC4626TokensRetailTestnet = keyof typeof poolERC4626CurrenciesRetailTestnet;

/**
 * A type annotation for all tokens which can be used by Pool Keeper in Retail Testnet.
 */
export type PoolsTokensRetailTestnet =
    | PoolsERC20TokensRetailTestnet
    | PoolsERC4626TokensRetailTestnet;

// Mainnet

/**
 * Static PoolERC20 Currencies addresses for Retail for Mainnet.
 */
export const staticPoolERC20CurrenciesRetailMainnet = {
    DAI: {
        pool: evmStaticTokenAddresses.DAI[EVMChainIDs.Mainnet],
        n: 0,
    },
    USDT: {
        pool: evmStaticTokenAddresses.USDT[EVMChainIDs.Mainnet],
        n: 12,
    },
    USDC: {
        pool: evmStaticTokenAddresses.USDC[EVMChainIDs.Mainnet],
        n: 12,
    },
    spDAI: {
        pool: evmStaticTokenAddresses.spDAI[EVMChainIDs.Mainnet],
        n: 0,
    },
    USDe: {
        pool: evmStaticTokenAddresses.USDe[EVMChainIDs.Mainnet],
        n: 0,
    },
    aEthUSDT: {
        pool: evmStaticTokenAddresses.aEthUSDT[EVMChainIDs.Mainnet],
        n: 12,
    },
    aEthUSDC: {
        pool: evmStaticTokenAddresses.aEthUSDC[EVMChainIDs.Mainnet],
        n: 12,
    },
    aEthDAI: {
        pool: evmStaticTokenAddresses.aEthDAI[EVMChainIDs.Mainnet],
        n: 12,
    },
    FRAX: {
        pool: evmStaticTokenAddresses.FRAX[EVMChainIDs.Mainnet],
        n: 12,
    },
    USDS: {
        pool: evmStaticTokenAddresses.USDS[EVMChainIDs.Mainnet],
        n: 12,
    },
} satisfies { [token in PoolCurrency]?: PoolData };

/**
 * PoolERC20 Currencies addresses for Retail for Mainnet (prod).
 */
export const poolERC20CurrenciesRetailMainnetProd = {
    ...staticPoolERC20CurrenciesRetailMainnet,

    mUSDe: {
        pool: evmMoleculaTokenAddresses.mUSDe[EVMChainIDs.Mainnet].prod,
        n: 0,
    },
} satisfies { [token in PoolCurrency]?: PoolData };

/**
 * PoolERC20 Currencies addresses for Retail for Mainnet (beta).
 */
export const poolERC20CurrenciesRetailMainnetBeta = {
    ...staticPoolERC20CurrenciesRetailMainnet,

    mUSDe: {
        pool: evmMoleculaTokenAddresses.mUSDe[EVMChainIDs.Mainnet].beta,
        n: 0,
    },
} satisfies { [token in PoolCurrency]?: PoolData };

/**
 * PoolERC4626 Currencies addresses for Retail for Mainnet.
 */
export const poolERC4626CurrenciesRetailMainnet = {
    sDAI: {
        pool: evmStaticTokenAddresses.sDAI[EVMChainIDs.Mainnet],
        n: 0,
    },
    sUSDe: {
        pool: evmStaticTokenAddresses.sUSDe[EVMChainIDs.Mainnet],
        n: 0,
    },
    sFRAX: {
        pool: evmStaticTokenAddresses.sFRAX[EVMChainIDs.Mainnet],
        n: 0,
    },
    sFrxUSD: {
        pool: evmStaticTokenAddresses.sFrxUSD[EVMChainIDs.Mainnet],
        n: 0,
    },
    sUSDS: {
        pool: evmStaticTokenAddresses.sUSDS[EVMChainIDs.Mainnet],
        n: 0,
    },
} satisfies { [token in PoolCurrency]?: PoolData };

/**
 * A type annotation for ERC-20 tokens which can be used by Pool Keeper in Retail Mainnet.
 */
export type PoolsERC20TokensRetailMainnet =
    | keyof typeof poolERC20CurrenciesRetailMainnetProd
    | keyof typeof poolERC20CurrenciesRetailMainnetBeta;

/**
 * A type annotation for ERC-4626 tokens which can be used by Pool Keeper in Retail Mainnet.
 */
export type PoolsERC4626TokensRetailMainnet = keyof typeof poolERC4626CurrenciesRetailMainnet;

/**
 * A type annotation for all tokens which can be used by Pool Keeper in Retail Mainnet.
 */
export type PoolsTokensRetailMainnet =
    | PoolsERC20TokensRetailMainnet
    | PoolsERC4626TokensRetailMainnet;

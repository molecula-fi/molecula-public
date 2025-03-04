import type { evmMoleculaTokenAddresses, evmStaticTokenAddresses } from './addresses';

/**
 * Supported by the Pool Keeper EVM tokens deployed by third-parties (hereby have static address).
 */
export type ThirdPartyPoolCurrency = keyof typeof evmStaticTokenAddresses;

/**
 * Supported by the Pool Keeper EVM tokens deployed by Molecula.
 */
export type MoleculaPoolCurrency = keyof typeof evmMoleculaTokenAddresses;

/**
 * A type annotation for all currencies supported by the Pool Keeper.
 */
export type PoolCurrency = ThirdPartyPoolCurrency | MoleculaPoolCurrency;

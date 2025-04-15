import type { EVMAddress } from '../types';

export type PoolData = {
    /**
     * Token address.
     */
    token: EVMAddress;

    /**
     * Decimal normalization to rebaseToken.decimals(),
     * e.g. `rebaseToken.decimals() - token.decimals() === 18 - token.decimals()`.
     */
    n: number;
};

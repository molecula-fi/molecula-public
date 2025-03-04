import type { EVMAddress } from '../types';

export type PoolData = {
    /**
     * Pool Currency address.
     */
    pool: EVMAddress;

    /**
     * Decimal normalization (to 18).
     */
    n: number;
};

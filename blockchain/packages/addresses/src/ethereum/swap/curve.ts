import { EVMChainIDs } from '../chains';
import type { EVMAddress } from '../types';

export const swapPoolFactoryAddressesCurve = {
    [EVMChainIDs.Mainnet]: '0x6A8cbed756804B16E05E741eDaBd5cB544AE21bf' as EVMAddress,
    [EVMChainIDs.Sepolia]: '0xfb37b8D939FFa77114005e61CFc2e543d6F49A81' as EVMAddress,
} as const;

// Curve constants
export const CURVE_POOL_A: { default: bigint; beta: bigint } = {
    default: 10000n,
    beta: 100n,
};

export const CURVE_POOL_FEE: { default: bigint; beta: bigint } = {
    default: 15000000n,
    beta: 0n,
};

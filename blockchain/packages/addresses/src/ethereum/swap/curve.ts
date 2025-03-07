import { EVMChainIDs } from '../chains';
import type { EVMAddress } from '../types';

export const swapPoolAddressesCurve = {
    [EVMChainIDs.Mainnet]: {
        prod: '0xd3bcd417aee942fd4611b8fe6ffca500019045cf' as EVMAddress,
        beta: '0x5bcaa8a1216d8120a59489f7df4585e834c90eaf' as EVMAddress,
    },
    [EVMChainIDs.Sepolia]: '0x99989F3CB6fB6d1d8432E265D1D69E27E28107cD' as EVMAddress,
} as const;

export const swapPoolFactoryAddressesCurve = {
    [EVMChainIDs.Mainnet]: '0x6A8cbed756804B16E05E741eDaBd5cB544AE21bf' as EVMAddress,
    [EVMChainIDs.Sepolia]: '0xfb37b8D939FFa77114005e61CFc2e543d6F49A81' as EVMAddress,
} as const;

import type { TronAddress } from '../types';

export function verifyTrxAddress(address: string): TronAddress | undefined {
    if (typeof address !== 'string') {
        return undefined;
    }

    if (!/(?:^(T)[a-km-zA-HJ-NP-Z1-9]{33}$)/.test(address)) {
        return undefined;
    }

    return address as TronAddress;
}

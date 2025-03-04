import type { EVMAddress } from './types';

export function verifyEthAddress(address: string): EVMAddress | undefined {
    if (typeof address !== 'string') {
        return undefined;
    }

    // Check address with ETH regex
    if (!/(?:^0x[a-fA-F0-9]{40}$)/.test(address)) {
        return undefined;
    }

    return address as EVMAddress;
}

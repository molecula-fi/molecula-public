import { TronWeb } from 'tronweb';

import type { TronAddress } from '@molecula-monorepo/blockchain.addresses';

/**
 * Normalize address
 * @param address - provided tron address
 * @returns normalized tron address
 */
export function normalizeAddress(address: TronAddress): TronAddress {
    const hexAddress = TronWeb.address.toHex(address);

    return TronWeb.address.fromHex(hexAddress) as TronAddress;
}

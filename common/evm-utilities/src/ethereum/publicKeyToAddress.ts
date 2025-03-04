import { addHexPrefix, bytesToHex, hexToBytes, publicToAddress } from '@ethereumjs/util';

import type { EVMAddress } from './types';

/**
 * Function to convert a HEX public key into an ETH-address string.
 * @param publicKey - a given public key.
 * @returns an ETH-address
 */
export async function publicKeyToAddress(publicKey: string): Promise<EVMAddress> {
    const publicKeyBytes = hexToBytes(addHexPrefix(publicKey));
    const addressBytes = publicToAddress(publicKeyBytes);
    return bytesToHex(addressBytes) as EVMAddress;
}

import { ethers } from 'ethers';

import type { EVMAddress } from '@molecula-monorepo/blockchain.addresses';

/**
 * Returns a normalized and checksumed address for provided address
 * @param address - provided evm address
 */
export function normalizeAddress(address: EVMAddress): EVMAddress {
    return ethers.getAddress(address) as EVMAddress;
}

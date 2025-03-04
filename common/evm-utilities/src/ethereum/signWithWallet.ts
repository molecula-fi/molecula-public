import type { ethers } from 'ethers';
import { keccak256 } from 'ethers';

/**
 * Sign data with wallet
 * @param wallet - HD wallet
 * @param data - data to sign
 * @returns signature
 */
export function signWithWallet(
    wallet: ethers.HDNodeWallet,
    data: { message: string; hash: string },
): string {
    if (keccak256(data.message) !== data.hash) {
        throw new Error('Invalid hash');
    }

    const sig = wallet.signingKey.sign(data.hash);
    return sig.serialized;
}

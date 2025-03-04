import { ethers } from 'ethers';

/**
 * Build wallet from seed phrase
 * @param seed - source seed
 * @returns address as Hex
 */
export function walletFromSeed(seed: string): ethers.HDNodeWallet {
    return ethers.Wallet.fromPhrase(seed);
}

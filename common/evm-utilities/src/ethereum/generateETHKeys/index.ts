import { bytesToHex, stripHexPrefix, privateToPublic } from '@ethereumjs/util';

import { generateSecretKey } from './generateSecretKey';

export type ETHKeys = {
    /**
     * Public key as per secp256k1 curve
     */
    publicKey: string;
    /**
     * Private key as per secp256k1 curve
     */
    secretKey: string;
};

/**
 * Function to generate SECP256k1 keys.
 */
export async function generateETHKeys(): Promise<ETHKeys> {
    // Generate the 256-bit private key array
    const secretKey = generateSecretKey();

    // Get public key
    const publicKey = privateToPublic(secretKey);

    // Return HEX-formatted keys
    return {
        publicKey: stripHexPrefix(bytesToHex(publicKey)),
        secretKey: stripHexPrefix(bytesToHex(secretKey)),
    };
}

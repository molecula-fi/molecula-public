import { webcrypto } from 'node:crypto';

/**
 * Function to generate the 256-bit private key array.
 */
export function generateSecretKey() {
    return webcrypto.getRandomValues(new Uint8Array(32));
}

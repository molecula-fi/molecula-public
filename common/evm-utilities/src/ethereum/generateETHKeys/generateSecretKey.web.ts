/**
 * Function to generate the 256-bit private key array.
 */
export function generateSecretKey() {
    return crypto.getRandomValues(new Uint8Array(32));
}

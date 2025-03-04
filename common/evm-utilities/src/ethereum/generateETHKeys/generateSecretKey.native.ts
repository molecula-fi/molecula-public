/**
 * Function to generate the 256-bit private key array.
 */
export function generateSecretKey() {
    // Note: `crypto` should be polyfilled with the "react-native-get-random-values" library.
    return crypto.getRandomValues(new Uint8Array(32));
}

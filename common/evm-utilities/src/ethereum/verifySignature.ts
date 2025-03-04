import {
    bytesToHex,
    ecrecover,
    fromRpcSig,
    hashPersonalMessage,
    publicToAddress,
    stripHexPrefix,
    utf8ToBytes,
} from '@ethereumjs/util';

import type { EVMAddress } from './types';

type VerifySignatureOptions = {
    /**
     * Unsigned message (in UTF8).
     */
    message: string;
    /**
     * Signature made when signing a message.
     */
    signature: string;
    /**
     * ETH-address corresponding to the keys the message was signed with.
     */
    address: EVMAddress;
};

type VerifySignatureResponse = {
    /**
     * A calculated public key in case the signature is valid.
     * Note: we are going to use its SHA256 as a userID when authorizing the user.
     */
    publicKey: string;
};

/**
 * Function to verify the signature made when signing a message with secp256k1 curve.
 * @param options - contain an unsigned message and a signature .
 * @returns a response with a calculated public key and ETH-address in case a signature is valid.
 * @throws an error in case the signature is invalid.
 */
export async function verifySignature({
    message,
    signature,
    address,
}: VerifySignatureOptions): Promise<VerifySignatureResponse> {
    // Find a message hash
    const messageBytes = utf8ToBytes(message);
    const messageHash = hashPersonalMessage(messageBytes);

    // Find an address corresponding to the signature and the message
    const { v, r, s } = fromRpcSig(signature);
    const publicKeyBytes = ecrecover(messageHash, v, r, s);
    const addressBytes = publicToAddress(publicKeyBytes);
    const calculatedAddress = bytesToHex(addressBytes);

    // Check if the given address equals to the calculated one (ignore case)
    if (address.toLowerCase() !== calculatedAddress.toLowerCase()) {
        throw new Error('Invalid options passed to verify the signature');
    }

    // Return a public key in response
    const publicKey = stripHexPrefix(bytesToHex(publicKeyBytes));
    return { publicKey };
}

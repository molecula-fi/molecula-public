import {
    addHexPrefix,
    ecsign,
    hashPersonalMessage,
    hexToBytes,
    toRpcSig,
    utf8ToBytes,
} from '@ethereumjs/util';

type SignMessageWithKeyOptions = {
    /**
     * Message to sign.
     */
    message: string;
    /**
     * Private key to use when signing.
     */
    privateKey: string;
};

type SignMessageWithKeyResponse = {
    /**
     * Signature received when signing the message with the private key.
     */
    signature: string;
};

/**
 * Function to sign the message with the given private key as per secp256k1.
 * @param options - contains a message to sign and the private key.
 * @returns a response with a received signature.
 */
export function signMessageWithKey({
    message,
    privateKey,
}: SignMessageWithKeyOptions): SignMessageWithKeyResponse {
    const messageBytes = utf8ToBytes(message);
    const messageHash = hashPersonalMessage(messageBytes);
    const { v, r, s } = ecsign(messageHash, hexToBytes(addHexPrefix(privateKey)));
    const signature = toRpcSig(v, r, s);
    return { signature };
}

import TronWeb from 'tronweb';

import { Log } from '@molecula-monorepo/common.utilities';

type Options = {
    address: string;
    signature: string;
    message: string;
    fullNode: string;
};

const signTemplate = `https://molecula.io wants you to sign in with your Tron account:
    $account

    Authorization in Atoms service

    URI: https://molecula.io
    Version: 1
    Chain ID: Tron
    Nonce: $nonce
    Issued At: $date`;

const log = new Log('Tron verify signature');

export function buildEIP4361SignMessage(tronAddress: string, nonce: string): string {
    return signTemplate
        .replace('$account', tronAddress)
        .replace('$nonce', nonce)
        .replace('$date', new Date().toISOString());
}

/**
 * Verify signature with message.
 * @param options - Options
 */
export async function verifyEIP4361Signature(options: Options): Promise<void> {
    const { message, address, signature, fullNode } = options;

    const tronWeb = new TronWeb({
        fullHost: fullNode,
    });

    const hexMessage = tronWeb.toHex(message);

    let recoveredAddress: string;

    try {
        recoveredAddress = await tronWeb.trx.verifyMessageV2(hexMessage, signature);
    } catch (error) {
        log.debug('Failed to verify the signature with error:', error);

        throw new Error(`Signature invalid`);
    }

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Signature mismatch');
    }
}

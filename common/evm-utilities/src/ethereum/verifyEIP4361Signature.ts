import { hashMessage, recoverAddress } from 'ethers';

import { SiweMessage } from 'siwe';

import { Log } from '@molecula-monorepo/common.utilities';

type Options = {
    address: string;
    signature: string;
    message: string;
};

const log = new Log('Evm verify signature');

export function buildEIP4361SignMessage(address: string, nonce: string): string {
    const siweMessage = new SiweMessage({
        scheme: 'https',
        domain: 'molecula.io',
        uri: 'https://molecula.io',
        statement: 'Authorization in Atoms service',
        version: '1',
        chainId: 1,
        address,
        nonce,
    });

    return siweMessage.prepareMessage();
}

/**
 * Verify signature with message.
 * @param options - Options
 */
export function verifyEIP4361Signature(options: Options): void {
    const { message, address, signature } = options;

    const messageHash = hashMessage(message);

    let recoveredAddress: string;
    try {
        recoveredAddress = recoverAddress(messageHash, signature);
    } catch (error) {
        log.debug('Failed to recover address with error:', error);

        throw new Error(`Signature invalid`);
    }

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Signature mismatch');
    }
}

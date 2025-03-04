import { isHexString } from 'ethers';

import type { Hex } from '../ethereum';

/**
 * Function to check source value for Hex format and make it one if needed.
 * @param input - a source string to check or bigint value to convert
 * @returns a hex string.
 */
export function prepareHex(input: string | bigint): Hex {
    let value: string;

    if (typeof input === 'bigint') {
        value = input.toString(16);
    } else {
        value = input;
    }

    if (isHexString(value)) {
        // Looks ok, return as is
        return value as Hex;
    }

    // Try to add `0x` prefix
    const prefixed: Hex = `0x${value}`;

    if (isHexString(prefixed)) {
        return prefixed;
    }

    throw new Error(`String does not look like bytes: ${input}`);
}

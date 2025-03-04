import BigNumber from 'bignumber.js';

import type { ExtendedBigNumber } from '../types';

/**
 * Function reflect the {@link ExtendedBigNumber} changes by appending the corresponding prefix.
 * @param number - a {@link ExtendedBigNumber} to append the corresponding prefix to its string.
 */
export function reflectValueChanges(number: ExtendedBigNumber): ExtendedBigNumber {
    const { value, string } = number;

    // Check if there is a value and a string
    if (!value || !string) {
        // Return the number with no change
        return number;
    }

    // Add the prefix as per the design
    let prefix: string;
    if (value.gt(new BigNumber(0))) {
        prefix = '↑ ';
    } else if (value.lt(new BigNumber(0))) {
        prefix = '↓ ';
    } else {
        prefix = ''; // no prefix for zero value
    }

    // Return the number with the new string
    return {
        value,
        // Get rid of `-` sign and convert the value into the percentage with the found prefix
        string: `${prefix}${string.startsWith('-') ? string.slice(1) : string}`,
    };
}

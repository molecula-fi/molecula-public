import BigNumber from 'bignumber.js';

import type { ExtendedBigNumber } from '../types';

// TODO: uncomment if needed
// const percentsLocaleOptions: Intl.NumberFormatOptions = {
//     style: 'percent',
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
// };

/**
 * Function to locale the percentage of the {@link value}.
 * @param value - a value to locale.
 * @returns the localized percentage string.
 */
export function localePercentage(value: BigNumber) {
    return `${value.times(new BigNumber(100)).toFixed(2)}%`;
    // OR
    // return value.toNumber().toLocaleString('en-US', percentsLocaleOptions);
}

/**
 * Function to calculate and locale the percentage of the {@link value} to the {@link total}.
 * @param value - a value to find the percentage of.
 * @param total - a total value to get the percentage to.
 * @returns the percentage value with the localized string.
 */
export function calculateAndLocalePercentage(
    value: BigNumber,
    total: BigNumber,
): ExtendedBigNumber {
    // Check if the total value equals to zero (since we cannot divide by zero)
    if (total.eq(new BigNumber(0))) {
        // If the provided value is not equal to the total value (zero) then something is wrong
        if (!value.eq(total)) {
            throw new Error('Provided value is not equal to zero while the total value is');
        }

        // Consider the percentage of the zero value to be equal to zero
        const percentage = new BigNumber(0);
        return {
            value: percentage,
            string: localePercentage(percentage),
        };
    }

    // Calculate the percentage and locale
    const percentage = value.div(total);
    return {
        value: percentage,
        string: localePercentage(percentage),
    };
}

import BigNumber from 'bignumber.js';

// [Nano-]Tokens Conversion
export function convertTokensToNanoTokens(tokens: BigNumber): BigNumber {
    const ratio = new BigNumber('1e9');
    return tokens.times(ratio);
}

export function convertNanoTokensToTokens(nanoTokens: BigNumber): BigNumber {
    const ratio = new BigNumber('1e9');
    return new BigNumber(nanoTokens.div(ratio).toFixed(9));
}

/**
 * A utility to convert the value with decimals into the atomic amount.
 * @param value - a value with decimals to convert.
 * @param decimals - a decimals to convert for.
 */
export function convertValueToWei(value: BigNumber | string | number, decimals: number): bigint {
    return BigInt(new BigNumber(value).times(10 ** decimals).toFixed(0));
}

/**
 * A utility to convert the atomic amount to a proper value with decimals.
 * @param wei - an atomic amount to convert.
 * @param decimals - a decimals to convert for.
 */
export function convertWeiToValue(wei: bigint | string | BigNumber, decimals: number): BigNumber {
    return new BigNumber(wei.toString()).div(10 ** decimals);
}

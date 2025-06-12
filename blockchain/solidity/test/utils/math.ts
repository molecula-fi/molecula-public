import { expect } from 'chai';
import { ethers } from 'hardhat';

// Check that numbers are equal to`precision` fractional digits.
// `abs(b - a) / 10**decimals < 1 / 10**precision`
export function expectEqualBigInt(
    a: bigint,
    b: bigint,
    decimals: bigint = 18n,
    precision: bigint = 17n,
) {
    expect(decimals).to.be.greaterThanOrEqual(precision);
    if (a > b) {
        expectEqualBigInt(b, a, decimals, precision);
        return;
    }
    expect(a).to.be.greaterThanOrEqual(0n);
    expect(b).to.be.greaterThanOrEqual(0n);
    // (b - a) / 10**decimals < 1 / 10**precision
    // (b - a) < 10**decimals / 10**precision
    // (b - a) < 10**(decimals - precision)
    if (b - a >= 10n ** (decimals - precision)) {
        throw new Error(
            `a: ${ethers.formatUnits(a, decimals)}, b: ${ethers.formatUnits(b, decimals)}, |b-a|: ${ethers.formatUnits(b - a, decimals)}  decimal: ${decimals}, precision: ${precision}`,
        );
    }
}

export function expectEqual(a: bigint, b: bigint, decimals: number = 18, precision: number = 17) {
    expectEqualBigInt(a, b, BigInt(decimals), BigInt(precision));
}

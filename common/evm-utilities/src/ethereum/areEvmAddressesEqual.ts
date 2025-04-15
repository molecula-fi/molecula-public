/**
 * Compare two provided addresses and return result
 * @param firstAddress - first provided address
 * @param secondAddress - second provided addresses
 * @returns true if equal
 */
export function areEvmAddressesEqual(firstAddress: string, secondAddress: string): boolean {
    return firstAddress.toLowerCase() === secondAddress.toLowerCase();
}

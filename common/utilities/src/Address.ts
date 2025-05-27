export function isTronAddress(address: string) {
    return /^(T)[a-km-zA-HJ-NP-Z1-9]{33}$/.test(address);
}

export function isTronHexAddress(address: string): boolean {
    return /^41[a-fA-F0-9]{40}$/.test(address);
}

export function isEvmAddress(address: string) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

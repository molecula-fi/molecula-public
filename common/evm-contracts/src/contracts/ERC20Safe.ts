import type { ERC20 } from '../../typechain';

import { EvmContractSafe, type SafeCallError } from '../safeCall';

export class ERC20Safe extends EvmContractSafe<ERC20> {
    /**
     * Function to get the ERC-20 token balance for an address.
     * @param address - An address to get the ERC-20 token balance of.
     * @returns the ERC-20 token balance.
     */
    public async balanceOf(address: string): Promise<bigint> {
        try {
            return await this.safeViewCall('balanceOf', address);
        } catch (error) {
            const safeError = error as SafeCallError;
            const code = safeError.parentError?.code;

            if (code === 'BAD_DATA' || code === 'UNCONFIGURED_NAME') {
                // A custom error message received from Full Node,
                // e.g. when a smart-contract is not deployed
                // Do not consider it to be an error, just return zero
                return 0n;
            }

            throw error;
        }
    }
}

import authorizedAddresses from './authorized.json';

import { EVMChainIDs } from './chains';
import type { EVMAddress } from './types';

/**
 * Supported EVM authorized addresses.
 */
export const evmAuthorizedAddresses = {
    AGENT_AUTHORIZED_LZ_CONFIGURATOR: {
        [EVMChainIDs.Mainnet]: {
            prod: authorizedAddresses['mainnet/prod']
                .AGENT_AUTHORIZED_LZ_CONFIGURATOR as EVMAddress,
            beta: authorizedAddresses['mainnet/beta']
                .AGENT_AUTHORIZED_LZ_CONFIGURATOR as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: authorizedAddresses.devnet
            .AGENT_AUTHORIZED_LZ_CONFIGURATOR as EVMAddress,
    },
} as const;

import authorizedAddresses from './authorized.json';

import { EVMChainIDs } from './chains';
import type { EVMAddress } from './types';

/**
 * Supported EVM authorized addresses.
 */
export const evmAuthorizedAddresses = {
    AUTHORIZED_REDEEMER: {
        [EVMChainIDs.Mainnet]: {
            prod: authorizedAddresses['mainnet/prod'].AUTHORIZED_REDEEMER as EVMAddress,
            beta: authorizedAddresses['mainnet/beta'].AUTHORIZED_REDEEMER as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: authorizedAddresses.devnet.AUTHORIZED_REDEEMER as EVMAddress,
    },
    AUTHORIZED_AGENT_SERVER: {
        [EVMChainIDs.Mainnet]: {
            prod: authorizedAddresses['mainnet/prod'].AUTHORIZED_AGENT_SERVER as EVMAddress,
            beta: authorizedAddresses['mainnet/beta'].AUTHORIZED_AGENT_SERVER as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: authorizedAddresses.devnet.AUTHORIZED_AGENT_SERVER as EVMAddress,
    },
    AUTHORIZED_WMUSDT_SERVER: {
        [EVMChainIDs.Mainnet]: {
            prod: authorizedAddresses['mainnet/prod'].AUTHORIZED_WMUSDT_SERVER as EVMAddress,
            beta: authorizedAddresses['mainnet/beta'].AUTHORIZED_WMUSDT_SERVER as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: authorizedAddresses.devnet.AUTHORIZED_WMUSDT_SERVER as EVMAddress,
    },
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
    WMUSDT_AUTHORIZED_LZ_CONFIGURATOR: {
        [EVMChainIDs.Mainnet]: {
            prod: authorizedAddresses['mainnet/prod']
                .WMUSDT_AUTHORIZED_LZ_CONFIGURATOR as EVMAddress,
            beta: authorizedAddresses['mainnet/beta']
                .WMUSDT_AUTHORIZED_LZ_CONFIGURATOR as EVMAddress,
        },
        [EVMChainIDs.Sepolia]: authorizedAddresses.devnet
            .WMUSDT_AUTHORIZED_LZ_CONFIGURATOR as EVMAddress,
    },
} as const;

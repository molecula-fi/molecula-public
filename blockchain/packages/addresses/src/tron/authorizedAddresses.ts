import authorizedAddresses from './authorized.json';

import { TronChainIDs } from './chains';
import type { TronAddress } from './types';

/**
 * Supported Tron authorized addresses.
 */
export const tronAuthorizedAddresses = {
    ORACLE_AUTHORIZED_UPDATER: {
        [TronChainIDs.Mainnet]: {
            prod: authorizedAddresses['mainnet/prod'].ORACLE_AUTHORIZED_UPDATER as TronAddress,
            beta: authorizedAddresses['mainnet/beta'].ORACLE_AUTHORIZED_UPDATER as TronAddress,
        },
        [TronChainIDs.Shasta]: authorizedAddresses.devnet.ORACLE_AUTHORIZED_UPDATER as TronAddress,
    },
    ACCOUNTANT_AUTHORIZED_SERVER: {
        [TronChainIDs.Mainnet]: {
            prod: authorizedAddresses['mainnet/prod'].ACCOUNTANT_AUTHORIZED_SERVER as TronAddress,
            beta: authorizedAddresses['mainnet/beta'].ACCOUNTANT_AUTHORIZED_SERVER as TronAddress,
        },
        [TronChainIDs.Shasta]: authorizedAddresses.devnet
            .ACCOUNTANT_AUTHORIZED_SERVER as TronAddress,
    },
    TREASURY_AUTHORIZED_SERVER: {
        [TronChainIDs.Mainnet]: {
            prod: authorizedAddresses['mainnet/prod'].TREASURY_AUTHORIZED_SERVER as TronAddress,
            beta: authorizedAddresses['mainnet/beta'].TREASURY_AUTHORIZED_SERVER as TronAddress,
        },
        [TronChainIDs.Shasta]: authorizedAddresses.devnet.TREASURY_AUTHORIZED_SERVER as TronAddress,
    },
    ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR: {
        [TronChainIDs.Mainnet]: {
            prod: authorizedAddresses['mainnet/prod']
                .ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR as TronAddress,
            beta: authorizedAddresses['mainnet/beta']
                .ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR as TronAddress,
        },
        [TronChainIDs.Shasta]: authorizedAddresses.devnet
            .ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR as TronAddress,
    },
    TREASURY_AUTHORIZED_LZ_CONFIGURATOR: {
        [TronChainIDs.Mainnet]: {
            prod: authorizedAddresses['mainnet/prod']
                .TREASURY_AUTHORIZED_LZ_CONFIGURATOR as TronAddress,
            beta: authorizedAddresses['mainnet/beta']
                .TREASURY_AUTHORIZED_LZ_CONFIGURATOR as TronAddress,
        },
        [TronChainIDs.Shasta]: authorizedAddresses.devnet
            .TREASURY_AUTHORIZED_LZ_CONFIGURATOR as TronAddress,
    },
} as const;

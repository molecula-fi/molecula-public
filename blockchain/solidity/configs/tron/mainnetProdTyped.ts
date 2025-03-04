import { tronAuthorizedAddresses, TronChainIDs } from '@molecula-monorepo/blockchain.addresses';

import type { TronNetworkConfig } from './types';

export const tronMainnetProdConfig: TronNetworkConfig = {
    RPC_URL: 'https://api.trongrid.io/',

    // Layer zero
    LAYER_ZERO_TRON_ENDPOINT: 'TAy9xwjYjBBN6kutzrZJaAZJHCAejjK1V9',
    LAYER_ZERO_ETHEREUM_EID: 30101,
    LAYER_ZERO_TRON_EID: 30420,

    // System contracts
    USDT_ADDRESS: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    SWFT_BRIDGE_ADDRESS: 'TPwezUWpEGmFBENNWJHwXHRG1D2NCEEt5s',

    // Authorized wallets
    OWNER: 'TRe77oDAPYpxfdAZtswUfeqqjJ5ABcMs6S',
    ORACLE_AUTHORIZED_UPDATER:
        tronAuthorizedAddresses.ORACLE_AUTHORIZED_UPDATER[TronChainIDs.Mainnet].prod,
    ACCOUNTANT_AUTHORIZED_SERVER:
        tronAuthorizedAddresses.ACCOUNTANT_AUTHORIZED_SERVER[TronChainIDs.Mainnet].prod,
    TREASURY_AUTHORIZED_SERVER:
        tronAuthorizedAddresses.TREASURY_AUTHORIZED_SERVER[TronChainIDs.Mainnet].prod,
    ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR:
        tronAuthorizedAddresses.ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR[TronChainIDs.Mainnet].prod,
    TREASURY_AUTHORIZED_LZ_CONFIGURATOR:
        tronAuthorizedAddresses.TREASURY_AUTHORIZED_LZ_CONFIGURATOR[TronChainIDs.Mainnet].prod,

    // Token info
    MUSD_TOKEN_NAME: 'Molecula USD',
    MUSD_TOKEN_SYMBOL: 'mUSD',
    MUSD_TOKEN_DECIMALS: 18,
    MUSD_TOKEN_MIN_DEPOSIT: 1_000_000n,
    MUSD_TOKEN_MIN_REDEEM: 500_000_000_000_000_000n,
    MUSD_TOKEN_INITIAL_SUPPLY: 10_000_000_000_000_000_000n,
};

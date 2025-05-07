import { tronAuthorizedAddresses, TronChainIDs } from '@molecula-monorepo/blockchain.addresses';

import type { TronNetworkConfig } from './types';

export const tronMainnetBetaConfig: TronNetworkConfig = {
    RPC_URL: 'https://api.trongrid.io/',

    /**
     * LayerZero Tron configuration parameters.
     * Endpoint is a primary entrypoint into LayerZero V2 responsible for managing cross-chain communications.
     * Executor is a contract responsible for executing received cross-chain messages automatically
     * https://docs.layerzero.network/v2/deployments/deployed-contracts?chains=tron
     */
    LAYER_ZERO_TRON_ENDPOINT: 'TAy9xwjYjBBN6kutzrZJaAZJHCAejjK1V9',
    LAYER_ZERO_TRON_EXECUTOR: '0x67DE40af19C0C0a6D0278d96911889fAF4EBc1Bc',
    LAYER_ZERO_ETHEREUM_EID: 30101,
    LAYER_ZERO_TRON_EID: 30420,
    LAYER_ZERO_ARBITRUM_EID: 30110,
    LAYER_ZERO_CELO_EID: 30125,

    // System contracts
    USDT_ADDRESS: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    USDT_OFT: 'TNUNom8gxjzLvyquXTKsS74DN2k1t9nTPP',

    // Authorized wallets
    OWNER: 'TULz7cGhfbBWJr7SYkhFhVkGL9ezjUivjx',
    ORACLE_AUTHORIZED_UPDATER:
        tronAuthorizedAddresses.ORACLE_AUTHORIZED_UPDATER[TronChainIDs.Mainnet].beta,
    ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR:
        tronAuthorizedAddresses.ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR[TronChainIDs.Mainnet].beta,

    // Token info
    MUSD_TOKEN_NAME: 'mUSD release candidate',
    MUSD_TOKEN_SYMBOL: 'mUSDrec',
    MUSD_TOKEN_DECIMALS: 18,
    MUSD_TOKEN_MIN_DEPOSIT: 1_000_000n,
    MUSD_TOKEN_MIN_REDEEM: 500_000_000_000_000_000n,
    MUSD_TOKEN_INITIAL_SUPPLY: 10_000_000_000_000_000_000n,
};

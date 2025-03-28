import { tronAuthorizedAddresses, TronChainIDs } from '@molecula-monorepo/blockchain.addresses';

import type { TronNetworkConfig } from './types';

export const shastaConfig: TronNetworkConfig = {
    RPC_URL: 'https://api.shasta.trongrid.io/',

    // Layer zero
    LAYER_ZERO_TRON_ENDPOINT: 'TCT5FvMTuUCspdY689LbKbUThCwBVUw4tM',
    LAYER_ZERO_ETHEREUM_EID: 40161, // sepolia
    LAYER_ZERO_TRON_EID: 40420, // shasta
    LAYER_ZERO_ARBITRUM_EID: 40231, // arbitrum sepolia
    LAYER_ZERO_CELO_EID: 40125, // celo testnet

    // System contracts
    USDT_ADDRESS: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
    USDT_OFT: 'TQ98oncUwBiBa5FUQwcrtv6zNr2QTGGkx4',

    // Authorized wallets
    OWNER: 'TNSphg4KJNTvhNzZZsvAXDpUESC11HT4T3',
    ORACLE_AUTHORIZED_UPDATER:
        tronAuthorizedAddresses.ORACLE_AUTHORIZED_UPDATER[TronChainIDs.Shasta],
    ACCOUNTANT_AUTHORIZED_SERVER:
        tronAuthorizedAddresses.ACCOUNTANT_AUTHORIZED_SERVER[TronChainIDs.Shasta],
    TREASURY_AUTHORIZED_SERVER:
        tronAuthorizedAddresses.TREASURY_AUTHORIZED_SERVER[TronChainIDs.Shasta],
    ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR:
        tronAuthorizedAddresses.ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR[TronChainIDs.Shasta],
    TREASURY_AUTHORIZED_LZ_CONFIGURATOR:
        tronAuthorizedAddresses.TREASURY_AUTHORIZED_LZ_CONFIGURATOR[TronChainIDs.Shasta],

    // Token info
    MUSD_TOKEN_DECIMALS: 18,
    MUSD_TOKEN_MIN_DEPOSIT: 1000000n,
    MUSD_TOKEN_MIN_REDEEM: 1_000_000_000_000_000_000n,
    MUSD_TOKEN_INITIAL_SUPPLY: 10_000_000_000_000_000_000n,
};

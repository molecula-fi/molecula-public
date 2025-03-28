import type { TronAddress } from '@molecula-monorepo/blockchain.addresses';

export type TronNetworkConfig = {
    RPC_URL: string;
    // Layer zero
    LAYER_ZERO_TRON_ENDPOINT: TronAddress;
    LAYER_ZERO_ETHEREUM_EID: number;
    LAYER_ZERO_TRON_EID: number;
    LAYER_ZERO_ARBITRUM_EID: number;
    LAYER_ZERO_CELO_EID: number;

    // System contracts
    USDT_ADDRESS: TronAddress;
    USDT_OFT: TronAddress;
    // Authorized wallets
    OWNER: TronAddress;
    ORACLE_AUTHORIZED_UPDATER: TronAddress;
    ACCOUNTANT_AUTHORIZED_SERVER: TronAddress;
    TREASURY_AUTHORIZED_SERVER: TronAddress;
    ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR: TronAddress;
    TREASURY_AUTHORIZED_LZ_CONFIGURATOR: TronAddress;
    // Token info
    MUSD_TOKEN_DECIMALS: number;
    MUSD_TOKEN_MIN_DEPOSIT: bigint;
    MUSD_TOKEN_MIN_REDEEM: bigint;
    MUSD_TOKEN_INITIAL_SUPPLY: bigint;
};

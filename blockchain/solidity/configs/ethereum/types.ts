import type { EVMAddress } from '@molecula-monorepo/common.evm-utilities';

export type EthereumNetworkConfig = {
    JSON_RPC: string;
    JSON_RPC_ID: number;
    DEPLOYER_ADDRESS: EVMAddress;

    // LAYER ZERO
    LAYER_ZERO_ENDPOINT: EVMAddress;
    LAYER_ZERO_TRON_EID: number;
    LAYER_ZERO_ETHEREUM_EID: number;
    LAYER_ZERO_TRON_MAINNET_OAPP_MOCK: string;

    // Bridge address
    SWFT_BRIDGE: EVMAddress;

    // Token addresses
    USDT_ADDRESS: EVMAddress;
    USDC_ADDRESS: EVMAddress;
    USDE_ADDRESS: EVMAddress;
    SUSDE_ADDRESS: EVMAddress;

    // Deploy params
    INITIAL_DAI_SUPPLY: bigint;
    DAI_TOKEN_DECIMALS: number;
    INITIAL_USDT_SUPPLY: bigint;
    DAI_ADDRESS: EVMAddress;

    POOLS20: { pool: string; n: number }[];
    POOLS4626: { pool: string; n: number }[];
    WHITE_LIST: string[];

    GUARDIAN_ADDRESS: EVMAddress;

    APY_FORMATTER: number;

    OWNER: EVMAddress;
    POOL_KEEPER: EVMAddress;

    MUSD_TOKEN_DECIMALS: number;
    MUSD_TOKEN_NAME: string;
    MUSD_TOKEN_SYMBOL: string;
    MUSD_TOKEN_MIN_DEPOSIT: bigint;
    MUSD_TOKEN_MIN_REDEEM: bigint;

    AUTHORIZED_REDEEMER: EVMAddress;
    AUTHORIZED_AGENT_SERVER: EVMAddress;
    AUTHORIZED_WMUSDT_SERVER: EVMAddress;
    AGENT_AUTHORIZED_LZ_CONFIGURATOR: EVMAddress;
    WMUSDT_AUTHORIZED_LZ_CONFIGURATOR: EVMAddress;
};

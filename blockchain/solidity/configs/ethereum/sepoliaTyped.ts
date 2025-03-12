import {
    EVMChainIDs,
    evmAuthorizedAddresses,
    evmStaticTokenAddresses,
    poolERC4626CurrenciesRetailTestnet,
    staticPoolERC20CurrenciesRetailTestnet,
} from '@molecula-monorepo/blockchain.addresses';

import type { EthereumNetworkConfig } from './types';

/** Sepolia config. */
export const sepoliaConfig: EthereumNetworkConfig = {
    /** JSON RPC provider. */
    JSON_RPC: 'https://sepolia.infura.io/v3/cfb5ebe1abe04a4394021b44d5417473',
    // 'https://ethereum-sepolia-rpc.publicnode.com',
    /** Network Id. */
    JSON_RPC_ID: 11155111,

    /** Address of deployer account. */
    DEPLOYER_ADDRESS: '0x99EC47D28FB39d1888b025Cf4B33765043c41353',

    /** layerzero sepolia endpoint. */
    LAYER_ZERO_ENDPOINT: '0x6EDCE65403992e310A62460808c4b910D972f10f',

    /** SHASTA EID. */
    LAYER_ZERO_TRON_EID: 40420,

    /** SEPOLIA EID. */
    LAYER_ZERO_ETHEREUM_EID: 40161,

    /** Shashta test layerzero contract. */
    LAYER_ZERO_TRON_MAINNET_OAPP_MOCK: '0x7ac3dfc5ebee8fae7282553ffc6c36f373952614',

    /** Swift bridge address. */
    SWFT_BRIDGE: '0xee0B035c9B9d97F69Ae207be6AE342319Cc94387', // Mock address

    /** USDT token address on Ethereum Sepolia. */
    USDT_ADDRESS: evmStaticTokenAddresses.USDT[EVMChainIDs.Sepolia],

    /** USDC token address on Ethereum Sepolia. */
    USDC_ADDRESS: evmStaticTokenAddresses.USDC[EVMChainIDs.Sepolia],

    /** USDe token address on Ethereum Sepolia. */
    USDE_ADDRESS: evmStaticTokenAddresses.USDe[EVMChainIDs.Sepolia],

    /** Staked USDe (sUSDe) token address on Ethereum Sepolia. */
    SUSDE_ADDRESS: evmStaticTokenAddresses.sUSDe[EVMChainIDs.Sepolia],

    /**  DAI token address on Ethereum Sepolia. */
    DAI_ADDRESS: evmStaticTokenAddresses.DAI[EVMChainIDs.Sepolia],

    /** @deprecated Dai initial supply. */
    INITIAL_DAI_SUPPLY: 100_000_000_000_000_000_000n,

    /** @deprecated decimals for DAI solution. */
    DAI_TOKEN_DECIMALS: 18,

    /** Initial Supply Manager balance. */
    INITIAL_USDT_SUPPLY: 100_000_000n,

    /** Pools ERC20 config for retail testnet solutions. */
    POOLS20: Object.values(staticPoolERC20CurrenciesRetailTestnet),

    /** Pools ERC4626 config for retail testnet solutions. */
    POOLS4626: Object.values(poolERC4626CurrenciesRetailTestnet),

    /** White list of address callable by MoleculaPoolFactory contract. */
    WHITE_LIST: [],

    /** Guardian address that can pause MoleculaPoolTreasury contract. */
    GUARDIAN_ADDRESS: '0xd4e9c83EA2f1571311246920e2B1a670a8a3080A', // TODO: change guardian address

    /** (APY_FORMATTER / 10_000) * 100% is the percentage of revenue retained by all mUSD holder. */
    APY_FORMATTER: 8_000,

    /** Owner address. Must specify it before the deployment. */
    OWNER: '0xd4e9c83EA2f1571311246920e2B1a670a8a3080A',

    /** Pool keeper address. Must specify it before the deployment. */
    POOL_KEEPER: '0x51fFFb7a28734D7Abb70a30012ce86646E39E269',

    /** mUSD token decimals. */
    MUSD_TOKEN_DECIMALS: 18,

    /** MUSD token name. */
    MUSD_TOKEN_NAME: 'mUSD retail test v0.13',

    /** mUSD token symbol. */
    MUSD_TOKEN_SYMBOL: 'mUSDretS',

    /** mUSD token minimum deposit. */
    MUSD_TOKEN_MIN_DEPOSIT: 1_000_000n,

    /** mUSD token minimum redeem. */
    MUSD_TOKEN_MIN_REDEEM: 500_000_000_000_000_000n,

    /** Authorized redeemer address. */
    AUTHORIZED_REDEEMER: evmAuthorizedAddresses.AUTHORIZED_REDEEMER[EVMChainIDs.Sepolia],

    /** Authorized agent server address. */
    AUTHORIZED_AGENT_SERVER: evmAuthorizedAddresses.AUTHORIZED_AGENT_SERVER[EVMChainIDs.Sepolia],

    /** Authorized wmUSDT server address. */
    AUTHORIZED_WMUSDT_SERVER: evmAuthorizedAddresses.AUTHORIZED_WMUSDT_SERVER[EVMChainIDs.Sepolia],

    /** Agent Authorized lz configurator address. */
    AGENT_AUTHORIZED_LZ_CONFIGURATOR:
        evmAuthorizedAddresses.AGENT_AUTHORIZED_LZ_CONFIGURATOR[EVMChainIDs.Sepolia],

    /** WmUSDT Authorized lz configurator address. */
    WMUSDT_AUTHORIZED_LZ_CONFIGURATOR:
        evmAuthorizedAddresses.WMUSDT_AUTHORIZED_LZ_CONFIGURATOR[EVMChainIDs.Sepolia],
};

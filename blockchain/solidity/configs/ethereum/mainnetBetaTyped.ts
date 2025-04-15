import {
    evmAuthorizedAddresses,
    EVMChainIDs,
    evmStaticTokenAddresses,
    staticPoolCurrenciesRetailMainnet,
} from '@molecula-monorepo/blockchain.addresses';

import type { EthereumNetworkConfig } from './types';

/** Ethereum Mainnet config for beta. */
export const ethMainnetBetaConfig: EthereumNetworkConfig = {
    /** LayerZero Ethereum endpoint. */
    LAYER_ZERO_ENDPOINT: '0x1a44076050125825900e736c501f859c50fE728c',

    /** LayerZero Tron EID. */
    LAYER_ZERO_TRON_EID: 30420,

    /** Layer Zero EID Ethereum Mainnet. */
    LAYER_ZERO_ETHEREUM_EID: 30101,

    /** ARBITRUM EID. */
    LAYER_ZERO_ARBITRUM_EID: 30110,

    /** CELO EID. */
    LAYER_ZERO_CELO_EID: 30125,

    /** MOCK Layer Zero OAPP Tron Mainnet */
    LAYER_ZERO_TRON_MAINNET_OAPP_MOCK:
        '0x51408ca3b420462a5b3f0bf75b6934a521ea3fe4dc2dce5614a995a89f54fcef',

    /** USDT_OFT address. */
    USDT_OFT: '0x811ed79dB9D34E83BDB73DF6c3e07961Cfb0D5c0',

    /** USDT token address on Ethereum Mainnet. */
    USDT_ADDRESS: evmStaticTokenAddresses.USDT[EVMChainIDs.Mainnet],

    /** USDC token address on Ethereum Mainnet. */
    USDC_ADDRESS: evmStaticTokenAddresses.USDC[EVMChainIDs.Mainnet],

    /** USDe token address on Ethereum Mainnet. */
    USDE_ADDRESS: evmStaticTokenAddresses.USDe[EVMChainIDs.Mainnet],

    /** Staked USDe (sUSDe) token address on Ethereum Mainnet. */
    SUSDE_ADDRESS: evmStaticTokenAddresses.sUSDe[EVMChainIDs.Mainnet],

    /**  DAI token address on Ethereum Mainnet. */
    DAI_ADDRESS: evmStaticTokenAddresses.DAI[EVMChainIDs.Mainnet],

    /** @deprecated Dai initial supply. */
    INITIAL_DAI_SUPPLY: 5_000_000_000_000_000_000n,

    /** @deprecated decimals for DAI solution. */
    DAI_TOKEN_DECIMALS: 18,

    /** Initial Supply Manager balance. */
    INITIAL_USDT_SUPPLY: 10_000_000n,

    /** Pools Currencies config for retail solutions. */
    TOKENS: Object.values(staticPoolCurrenciesRetailMainnet),

    /** Default whitelist of addresses callable by MoleculaPoolFactory contract. */
    WHITE_LIST: [
        '0xcf5540fffcdc3d510b18bfca6d2b9987b0772559', // ODOS router
        '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2', // AAVE POOL v3
    ],

    /** Guardian address that can pause MoleculaPoolTreasury contract. */
    GUARDIAN_ADDRESS: '0xD3C1bE6FC208270D43B64083552564955cC1120b', // TODO: change guardian address

    /** (APY_FORMATTER / 10_000) * 100% is the percentage of revenue retained by all mUSD holder. */
    APY_FORMATTER: 8_000,

    /** Owner address. */
    OWNER: '0xD3C1bE6FC208270D43B64083552564955cC1120b',

    /** Pool keeper address. */
    POOL_KEEPER: '0xFA9113efcaD2e08F868b7B00dF67ed404Ec9a00c',

    /** mUSD token decimals. */
    MUSD_TOKEN_DECIMALS: 18,

    /** MUSD token name. */
    MUSD_TOKEN_NAME: 'mUSD release candidate',

    /** MUSD token symbol. */
    MUSD_TOKEN_SYMBOL: 'mUSDrec',

    /** mUSD token minimum deposit. */
    MUSD_TOKEN_MIN_DEPOSIT: 1_000_000n,

    /** mUSD token minimum redeem. */
    MUSD_TOKEN_MIN_REDEEM: 500_000_000_000_000_000n,

    /** Authorized redeemer address. */
    AUTHORIZED_REDEEMER: evmAuthorizedAddresses.AUTHORIZED_REDEEMER[EVMChainIDs.Mainnet].beta,

    /** Authorized agent server address. */
    AUTHORIZED_AGENT_SERVER:
        evmAuthorizedAddresses.AUTHORIZED_AGENT_SERVER[EVMChainIDs.Mainnet].beta,

    /** Authorized wmUSDT server address. */
    AUTHORIZED_WMUSDT_SERVER:
        evmAuthorizedAddresses.AUTHORIZED_WMUSDT_SERVER[EVMChainIDs.Mainnet].beta,

    /** Agent Authorized lz configurator address. */
    AGENT_AUTHORIZED_LZ_CONFIGURATOR:
        evmAuthorizedAddresses.AGENT_AUTHORIZED_LZ_CONFIGURATOR[EVMChainIDs.Mainnet].beta,
};

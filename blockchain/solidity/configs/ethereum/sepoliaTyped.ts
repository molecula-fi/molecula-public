import {
    EVMChainIDs,
    evmAuthorizedAddresses,
    evmStaticTokenAddresses,
    staticPoolCurrenciesRetailTestnet,
} from '@molecula-monorepo/blockchain.addresses';

import type { EthereumNetworkConfig } from './types';

/** Sepolia config. */
export const sepoliaConfig: EthereumNetworkConfig = {
    /**
     * LayerZero Ethereum configuration parameters.
     * Endpoint is a primary entrypoint into LayerZero V2 responsible for managing cross-chain communications.
     * Executor is a contract responsible for executing received cross-chain messages automatically
     * https://docs.layerzero.network/v2/deployments/deployed-contracts?chains=sepolia
     */
    LAYER_ZERO_ENDPOINT: '0x6EDCE65403992e310A62460808c4b910D972f10f',
    LAYER_ZERO_EXECUTOR: '0x718B92b5CB0a5552039B593faF724D182A881eDA',
    LAYER_ZERO_ETHEREUM_REQUIERED_DVNS: [
        '0x8eebf8b423b73bfca51a1db4b7354aa0bfca9193', // LayerZero Labs DVN address
    ],

    /** SHASTA EID. */
    LAYER_ZERO_TRON_EID: 40420,

    /** SEPOLIA EID. */
    LAYER_ZERO_ETHEREUM_EID: 40161,

    /** ARBITRUM SEPOLIA EID. */
    LAYER_ZERO_ARBITRUM_EID: 40231,

    /** CELO TESTNET EID. */
    LAYER_ZERO_CELO_EID: 40125,

    /** Shashta test layerzero contract. */
    LAYER_ZERO_TRON_MAINNET_OAPP_MOCK: '0x7ac3dfc5ebee8fae7282553ffc6c36f373952614',

    /** USDT_OFT address. */
    USDT_OFT: '0x101760Fd9486AcC415f6f8c52f78f1cC1318A41a',

    /** USDT token address on Ethereum Sepolia. */
    USDT_ADDRESS: evmStaticTokenAddresses.USDT[EVMChainIDs.Sepolia],

    /** USDC token address on Ethereum Sepolia. */
    USDC_ADDRESS: evmStaticTokenAddresses.USDC[EVMChainIDs.Sepolia],

    /** USDe token address on Ethereum Sepolia. */
    USDE_ADDRESS: evmStaticTokenAddresses.USDe[EVMChainIDs.Sepolia],

    /** Staked USDe (sUSDe) token address on Ethereum Sepolia. */
    SUSDE_ADDRESS: evmStaticTokenAddresses.sUSDe[EVMChainIDs.Sepolia],

    /** Wrapped ETH (WETH) token address on Ethereum Sepolia. */
    WETH_ADDRESS: '0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c',

    /** AAVE Token for WETH (AToken) token address on Ethereum Sepolia. */
    AWETH_ADDRESS: '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a',

    /** Compound Token for WETH (cWETHv3) token address on Ethereum Sepolia. */
    CWETH_V3: '0x2943ac1216979aD8dB76D9147F64E61adc126e96',

    /**  DAI token address on Ethereum Sepolia. */
    DAI_ADDRESS: evmStaticTokenAddresses.DAI[EVMChainIDs.Sepolia],

    /** @deprecated Dai initial supply. */
    INITIAL_DAI_SUPPLY: 100_000_000_000_000_000_000n,

    /** Initial Supply Manager balance. */
    INITIAL_USDT_SUPPLY: 100_000_000n,

    /** Pools Currencies config for retail testnet solutions. */
    TOKENS: Object.values(staticPoolCurrenciesRetailTestnet),

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

    /** Agent Authorized lz configurator address. */
    AGENT_AUTHORIZED_LZ_CONFIGURATOR:
        evmAuthorizedAddresses.AGENT_AUTHORIZED_LZ_CONFIGURATOR[EVMChainIDs.Sepolia],

    /** AAVE v3 Pool Address. */
    AAVE_POOL: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',

    /** EigenPodManager contract address. */
    EIGEN_POD_MANAGER: '0x2E3D6c0744b10eb0A4e6F679F71554a39Ec47a5D',
    WMUSD_TOKEN_NAME: 'Wrapped mUSD test',
    WMUSD_TOKEN_SYMBOL: 'wmUSDt',

    LMUSD_TOKEN_NAME: 'Locked mUSD test',
    LMUSD_TOKEN_SYMBOL: 'lmUSDt',
    LMUSD_PERIODS: [],
    LMUSD_MULTIPLIERS: [],
};

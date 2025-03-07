/* eslint-disable import/no-extraneous-dependencies */
import * as dotenv from 'dotenv';
import type { HardhatUserConfig } from 'hardhat/config';
import '@typechain/hardhat';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-ethers';
import 'hardhat-gas-reporter';

// import tasks
import './tasks';
import { tronMainnetProdConfig } from './configs/tron/mainnetProdTyped';
import { shastaConfig } from './configs/tron/shastaTyped';

dotenv.config({ path: '.env.test' });

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: '0.8.28',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 400,
                    },
                },
            },
            {
                version: '0.8.22',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 400,
                    },
                },
            },
        ],
    },
    networks: {
        hardhat: {
            gasPrice: 40_000_000_000,
            forking: {
                url: process.env.JSON_RPC_URL as string,
                blockNumber: 21772906,
            },
        },
        sepolia: {
            url: process.env.JSON_RPC_URL_SEPOLIA as string,
            accounts: {
                mnemonic: process.env.ETHEREUM_SEED_PHRASE as string,
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                passphrase: '',
            },
        },
        ethereum: {
            url: process.env.JSON_RPC_URL as string,
            accounts: {
                mnemonic: process.env.ETHEREUM_SEED_PHRASE as string,
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                passphrase: '',
            },
        },
        shasta: {
            url: shastaConfig.RPC_URL,
            accounts: {
                mnemonic: process.env.TRON_SEED_PHRASE as string,
                path: "m/44'/195'/0'/0/0",
                initialIndex: 0,
                count: 20,
                passphrase: '',
            },
        },
        tron: {
            url: tronMainnetProdConfig.RPC_URL,
            accounts: {
                mnemonic: process.env.TRON_SEED_PHRASE as string,
                path: "m/44'/195'/0'/0/0",
                initialIndex: 0,
                count: 20,
                passphrase: '',
            },
        },
    },
    etherscan: {
        apiKey: {
            sepolia: process.env.ETHEREUM_API_KEY as string,
            ethereum: process.env.ETHEREUM_API_KEY as string,
        },
    },

    mocha: {
        timeout: 10 * 60 * 1000, // 10 min
    },
    gasReporter: {
        outputFile: 'gas-usage.txt',
        gasPrice: 1.75, // in Gwei
        currency: 'USD',
        tokenPrice: '2637', // 2637 usd/eth
    },
};

export default config;

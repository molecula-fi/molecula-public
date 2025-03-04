/* eslint-disable import/no-extraneous-dependencies */
import type { HardhatUserConfig } from 'hardhat/config';
import '@typechain/hardhat';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-ethers';
import 'hardhat-gas-reporter';

import {
    jsonRpcURL,
    jsonRpcURLSepolia,
    ethereumApiKey,
    sepoliaPrivateKey,
} from './configs/ethereum';

// import deploy tasks
// import './tasks/deployNitrogen';
// import './tasks/deployCore';
// import './tasks/deployCarbonMultichain';
// import './tasks/deployCarbon_tron';
// import './tasks/deployCarbon_ethereum';
// import './tasks/deployAccountantAgent';
import './tasks/deployEthereum';

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: '0.8.28',
                settings: {
                    optimizer: {
                        enabled: true,
                    },
                },
            },
            {
                version: '0.8.22',
                settings: {
                    optimizer: {
                        enabled: true,
                    },
                },
            },
        ],
    },
    networks: {
        hardhat: {
            gasPrice: 40_000_000_000,
            forking: {
                url: jsonRpcURL,
                blockNumber: 21772906,
            },
        },
        sepolia: {
            url: jsonRpcURLSepolia,
            accounts: [sepoliaPrivateKey],
        },
        ethereum: {
            url: jsonRpcURL,
            accounts: [sepoliaPrivateKey],
        },
    },
    etherscan: {
        apiKey: {
            sepolia: ethereumApiKey,
            ethereum: ethereumApiKey,
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

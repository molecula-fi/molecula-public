/* eslint-disable import/no-extraneous-dependencies */
import type { HardhatUserConfig } from 'hardhat/config';
import '@typechain/hardhat';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-ethers';
import 'hardhat-gas-reporter';

import { jsonRpcURL } from '@molecula-monorepo/solidity/configs/ethereum';

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: '0.8.28',
                settings: { optimizer: { enabled: true } },
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
    },
    mocha: {
        timeout: 10 * 60 * 1000, // 10 min
        // reporter: 'eth-gas-reporter',
        // reporterOptions: {
        //     token: 'ETH',
        //     gasPriceApi: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice',
        //     enabled: true,
        // },
    },
    // gasReporter: {
    //     token: 'ETH',
    //     gasPriceApi: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice',
    //     enabled: true,
    // },
};

export default config;

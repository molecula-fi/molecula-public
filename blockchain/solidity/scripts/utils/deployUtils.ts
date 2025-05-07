/* eslint-disable no-restricted-syntax, @typescript-eslint/no-explicit-any */

import { readFile, writeFileSync, mkdirSync, existsSync } from 'fs';

import { type HardhatRuntimeEnvironment } from 'hardhat/types';
import * as path from 'path';
import { TronWeb } from 'tronweb';

import {
    EnvironmentType,
    MoleculaPoolVersion,
    getMoleculaPoolVersion,
} from '@molecula-monorepo/blockchain.addresses';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';
import { ethMainnetProdConfig } from '../../configs/ethereum/mainnetProdTyped';
import { sepoliaConfig } from '../../configs/ethereum/sepoliaTyped';
import { tronMainnetBetaConfig } from '../../configs/tron/mainnetBetaTyped';
import { tronMainnetProdConfig } from '../../configs/tron/mainnetProdTyped';
import { shastaConfig } from '../../configs/tron/shastaTyped';
import type { IERC20 } from '../../typechain-types';

export function getVersion(param: string): MoleculaPoolVersion {
    const version = Object.values(MoleculaPoolVersion).find(x => x === param);
    if (version === undefined) {
        throw new Error(
            `Unexpected value '${param}' ': '${getMoleculaPoolVersion().join("', '")}'.`,
        );
    }
    return version;
}

export function verifyEnvironment(network: string, environment: string) {
    if ((network === 'sepolia' || network === 'shasta') && environment !== 'devnet') {
        throw new Error(
            `Expected network and environment set correctly: network ${network} couldn't be used in this environment ${environment}`,
        );
    }
    if (
        (network === 'ethereum' || network === 'tron') &&
        environment !== 'mainnet/beta' &&
        environment !== 'mainnet/prod'
    ) {
        throw new Error(
            `Expected network and environment set correctly: network ${network} couldn't be used in this environment ${environment}`,
        );
    }
}

export function getEnvironment(hre: HardhatRuntimeEnvironment, network: string) {
    const environment = EnvironmentType[network as keyof typeof EnvironmentType];
    if (environment === undefined) {
        const expectedValues = Object.values(EnvironmentType).filter(item => {
            return isNaN(Number(item));
        });
        throw new Error(
            `Unexpected value '${environment}' for '${network}' cmd-line parameter.\nExpected values for '${network}': '${expectedValues.join("', '")}'.`,
        );
    }
    verifyEnvironment(hre.network.name, environment);
    return environment;
}

export const handleError = (error: Error) => {
    console.error('Failed to run script with error:', error);
    process.exit(1);
};

export const writeToFile = (file: string, json: object) => {
    writeToFileImpl(file, json, '../../../packages/addresses/deploy');
};

export function ensureDirectoryExists(directory: string) {
    if (existsSync(directory)) {
        return;
    }
    mkdirSync(directory, { recursive: true });
}

export function ensurePathToFileExists(filePath: string) {
    const dirname = path.dirname(filePath);
    ensureDirectoryExists(dirname);
}

// `relativePath` - is relative path from `deployment/src` to `deployment/deploy/...`
const writeToFileImpl = (fileName: string, json: object, relativePath: string) => {
    const jsonData = `${JSON.stringify(json, null, 4)}\n`;

    const dirPath = path.resolve(__dirname, relativePath);
    const pathToFile = path.join(dirPath, fileName);
    ensurePathToFileExists(pathToFile);

    writeFileSync(pathToFile, jsonData, 'utf8');
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readFromFile = (fileName: string): Promise<any> => {
    const dirPath = path.resolve(__dirname, '../../../packages/addresses/deploy');
    return new Promise((resolve, reject) => {
        readFile(`${dirPath}/${fileName}`, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            try {
                const jsonData = JSON.parse(data.toString());
                resolve(jsonData);
            } catch (parseError) {
                reject(parseError);
            }
        });
    });
};

export function getEnvironmentConfig(network: EnvironmentType) {
    switch (network) {
        case EnvironmentType['mainnet/beta']:
            return ethMainnetBetaConfig;
        case EnvironmentType['mainnet/prod']:
            return ethMainnetProdConfig;
        case EnvironmentType.devnet:
            return sepoliaConfig;
        default:
            throw new Error('Unsupported network type!');
    }
}

export function getTronEnvironmentConfig(network: EnvironmentType) {
    switch (network) {
        case EnvironmentType['mainnet/beta']:
            return tronMainnetBetaConfig;
        case EnvironmentType['mainnet/prod']:
            return tronMainnetProdConfig;
        case EnvironmentType.devnet:
            return shastaConfig;
        default:
            throw new Error('Unsupported network type!');
    }
}

export async function getConfig(hre: HardhatRuntimeEnvironment, network: EnvironmentType) {
    console.log('Network:', network);

    const config = getEnvironmentConfig(network);

    const USDT = await hre.ethers.getContractAt('IERC20', config.USDT_ADDRESS);
    const account = (await hre.ethers.getSigners())[0]!;

    // print wallet balances
    console.log('Wallet address: ', account.address);
    console.log(
        'ETH balance: ',
        hre.ethers.formatEther(await hre.ethers.provider.getBalance(account.address)),
    );
    console.log('USDT balance: ', hre.ethers.formatUnits(await USDT.balanceOf(account.address), 6));
    return {
        config,
        account,
        USDT,
    };
}

// If `target` does not have enough erc20Token tokens, then transfer them
export async function increaseBalance(
    name: string,
    target: string,
    initSupply: bigint,
    erc20Token: IERC20,
) {
    let balance = await erc20Token.balanceOf(target);
    if (balance < initSupply) {
        const val = initSupply - balance;
        const tx = await erc20Token.transfer(target, val);
        await tx.wait();
    }
    balance = await erc20Token.balanceOf(target);
    if (balance !== initSupply) {
        console.error(`${name} has wrong erc20Token balance: `, balance);
        console.error('Expected INITIAL_USDT_SUPPLY: ', initSupply);
        process.exit(1);
    }
}

export async function getDeployerPrivateKey(hre: HardhatRuntimeEnvironment) {
    const accounts = hre.network.config.accounts as string[];
    return accounts[0] || '';
}

export function getEthereumAddress(environment: EnvironmentType, contract: string) {
    const config = getTronEnvironmentConfig(environment);

    // Create TronWeb instance
    const tronWeb = new TronWeb({
        fullHost: config.RPC_URL,
    });

    return tronWeb.address.toHex(contract).replace(/^(41)/, '0x') as string;
}

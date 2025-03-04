/* eslint-disable no-await-in-loop, no-restricted-syntax, @typescript-eslint/no-explicit-any */

import { readFile, writeFileSync, mkdirSync, existsSync } from 'fs';

import { ethers, run } from 'hardhat';
import * as path from 'path';

import { NetworkType, MoleculaPoolVersion } from '@molecula-monorepo/blockchain.addresses';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';
import { ethMainnetProdConfig } from '../../configs/ethereum/mainnetProdTyped';
import { sepoliaConfig } from '../../configs/ethereum/sepoliaTyped';
import type { IERC20 } from '../../typechain-types';
import type { TokenAndNStruct } from '../../typechain-types/contracts/core/MoleculaPoolTreasury';

export function chooseParam(param: string, expectedValues: string[]) {
    const value = getArgValue(param);
    if (expectedValues.find(x => x === value) === undefined) {
        throw new Error(
            `Unexpected value '${value}' for '${param}' cmd-line parameter.\nExpected values for '${param}': '${expectedValues.join("' ")}'.`,
        );
    }
    return value;
}

export function getVersion(): MoleculaPoolVersion {
    const param = '--version';
    const value = getArgValue(param);
    const version = Object.values(MoleculaPoolVersion).find(x => x === value);
    if (version === undefined) {
        const expectedValues = Object.values(MoleculaPoolVersion).filter(item => {
            return isNaN(Number(item));
        });
        throw new Error(
            `Unexpected value '${value}' for '${param}' cmd-line parameter.\nExpected values for '${param}': '${expectedValues.join("', '")}'.`,
        );
    }
    return version;
}

export function getNetwork() {
    const param = '--network';
    const value = getArgValue(param);
    const network = NetworkType[value as keyof typeof NetworkType];
    if (network === undefined) {
        const expectedValues = Object.values(NetworkType).filter(item => {
            return isNaN(Number(item));
        });
        throw new Error(
            `Unexpected value '${value}' for '${param}' cmd-line parameter.\nExpected values for '${param}': '${expectedValues.join("', '")}'.`,
        );
    }
    return network;
}

export function getEnvironment(network: string) {
    const environment = NetworkType[network as keyof typeof NetworkType];
    if (environment === undefined) {
        const expectedValues = Object.values(NetworkType).filter(item => {
            return isNaN(Number(item));
        });
        throw new Error(
            `Unexpected value '${environment}' for '${network}' cmd-line parameter.\nExpected values for '${network}': '${expectedValues.join("', '")}'.`,
        );
    }
    return environment;
}

export const hasFlag = (flag: string) => {
    const index = process.argv.indexOf(flag);
    return index !== -1;
};

export const getArgValue = (flag: string) => {
    const index = process.argv.indexOf(flag);
    if (index !== -1 && index + 1 < process.argv.length && process.argv[index + 1]) {
        return process.argv[index + 1]!;
    }
    throw new Error(`Expected command-line option: ${flag}`);
};

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

export async function verifyContract(
    contractName: string,
    address: string,
    constructorArguments: any[],
) {
    try {
        await run('verify:verify', {
            address,
            constructorArguments,
        });
    } catch (e) {
        console.error(`Failed to verify "${contractName}" with error:`, e);
    }
    console.log(`${contractName} is verified! ${address}`);
}

export function getNetworkConfig(network: NetworkType) {
    switch (network) {
        case NetworkType['mainnet/beta']:
            return ethMainnetBetaConfig;
        case NetworkType['mainnet/prod']:
            return ethMainnetProdConfig;
        case NetworkType.devnet:
            return sepoliaConfig;
        default:
            throw new Error('Unsupported network type!');
    }
}

export async function getProviderAndAccount(phrase: string, network: NetworkType) {
    console.log('Network:', network);
    const config = getNetworkConfig(network);
    // create provider
    const provider = new ethers.JsonRpcProvider(config.JSON_RPC, config.JSON_RPC_ID);
    console.log('Block #', await provider.getBlockNumber());
    // get wallet
    const wallet = ethers.Wallet.fromPhrase(phrase).connect(provider);
    const account = wallet;

    // check is correct deployer address used in network config
    if (config.DEPLOYER_ADDRESS !== account.address) {
        console.log(
            `Warning: Incorrect DEPLOYER_ADDRESS for ${network}. Expected: ${config.DEPLOYER_ADDRESS}, but got: ${account.address}`,
        );
    }

    // get USDT contract
    const USDT: IERC20 = (await ethers.getContractAt('IERC20', config.USDT_ADDRESS)).connect(
        account,
    );
    // print wallet balances
    console.log('Wallet address: ', account.address);
    console.log('ETH balance: ', ethers.formatEther(await provider.getBalance(account.address)));
    console.log('USDT balance: ', ethers.formatUnits(await USDT.balanceOf(account.address), 6));
    return {
        config,
        provider,
        account,
        USDT,
    };
}

export function unitePool20And4626(
    pool20: { pool: string; n: number }[],
    pool4626: { pool: string; n: number }[],
) {
    const pool: TokenAndNStruct[] = [];
    pool20.forEach(p20 => {
        pool.push({
            token: p20.pool,
            n: p20.n,
        });
    });
    pool4626.forEach(p4626 => {
        pool.push({
            token: p4626.pool,
            n: p4626.n,
        });
    });
    return pool;
}

export async function getConfig(network: NetworkType) {
    console.log('Network:', network);

    const config = getNetworkConfig(network);

    const USDT = await ethers.getContractAt('IERC20', config.USDT_ADDRESS);
    const account = config.DEPLOYER_ADDRESS;

    // print wallet balances
    console.log('Wallet address: ', account);
    console.log('ETH balance: ', ethers.formatEther(await ethers.provider.getBalance(account)));
    console.log('USDT balance: ', ethers.formatUnits(await USDT.balanceOf(account), 6));
    return {
        config,
        account,
        USDT,
    };
}

export async function getNonce(account: string) {
    const nonce = await ethers.provider.getTransactionCount(account);
    return nonce;
}

export async function setOwnerFromConfig(
    environment: NetworkType,
    contracts: { addr: string; name: string }[],
) {
    const { account, config } = await getConfig(environment);
    console.log(`Setting owner ${config.OWNER} for the contracts:`);
    for (const contract of contracts) {
        const ownableContract = await ethers.getContractAt('Ownable', contract.addr);
        const currentOwner = await ownableContract.owner();
        if (currentOwner === config.OWNER) {
            console.log(
                `\tContract ${contract.name} ${contract.addr} has already the owner. Skipped.`,
            );
        } else if (currentOwner === account) {
            const response = await ownableContract.transferOwnership(config.OWNER);
            await response.wait();
            console.log(`\tSet owner for contract ${contract.name} ${contract.addr}.`);
        } else {
            throw Error(
                `\tContract ${contract.name} ${contract.addr} has ${currentOwner} owner. It's impossible to change the owner.`,
            );
        }
    }
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

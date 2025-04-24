/* eslint-disable no-await-in-loop, no-restricted-syntax */
import { type HardhatRuntimeEnvironment } from 'hardhat/types';
import TronWeb from 'tronweb';

import { type NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { getTronNetworkConfig } from '../../utils/deployUtils';

import { deployAccountantLZ, setUnderlyingToken } from './deployAccountantLZ';
import { deployOracle, setOracleAccountant } from './deployOracle';
import { deployRebaseToken } from './deployRebaseToken';
import { deploymUSDLock } from './deploymUSDLock';

export async function getTronWeb(mnemonic: string, path: string, network: NetworkType) {
    // get config
    const config = getTronNetworkConfig(network);

    // Create TronWeb instance
    const tronWeb = new TronWeb({
        fullHost: config.RPC_URL,
    });

    const accountInfo = tronWeb.fromMnemonic(mnemonic, path);

    if (accountInfo instanceof Error) {
        throw new Error('Invalid account information returned from fromMnemonic.');
    }

    const privateKey = accountInfo.privateKey.substring(2);

    console.log('Deploy wallet address: ', accountInfo.address);

    return { config, tronWeb, privateKey };
}

export async function deployCarbon(
    hre: HardhatRuntimeEnvironment,
    mnemonic: string,
    path: string,
    network: NetworkType,
) {
    const { config, tronWeb, privateKey } = await getTronWeb(mnemonic, path, network);

    // get initial owner
    const initialOwner = tronWeb.address.fromPrivateKey(privateKey);
    console.log('Initial owner:', initialOwner);

    // deploy Oracle
    const oracle = await deployOracle(
        hre,
        tronWeb,
        privateKey,
        config.MUSD_TOKEN_INITIAL_SUPPLY,
        config.MUSD_TOKEN_INITIAL_SUPPLY,
        initialOwner,
        initialOwner, // accountant update latter
        config.ORACLE_AUTHORIZED_UPDATER,
    );
    console.log('Oracle deployed:', oracle);

    // deploy Swap Accountant LZ
    const accountantLZ = await deployAccountantLZ(hre, tronWeb, privateKey, {
        initialOwner,
        authorizedLZConfiguratorAddress: initialOwner, // update after lz configuration
        endpoint: config.LAYER_ZERO_TRON_ENDPOINT,
        lzDstEid: config.LAYER_ZERO_ETHEREUM_EID,
        usdtAddress: config.USDT_ADDRESS,
        usdtOFTAddress: config.USDT_OFT,
        oracleAddress: oracle,
    });
    console.log('Swap Accountant LZ deployed:', accountantLZ);

    // Set Accountant to Oracle
    await setOracleAccountant(tronWeb, privateKey, oracle, accountantLZ);
    console.log('Oracle accountant set:', accountantLZ);

    // deploy RebaseToken
    const rebaseToken = await deployRebaseToken(hre, tronWeb, privateKey, {
        initialOwner,
        accountantAddress: accountantLZ,
        initialShares: 0n, // set to zero, the initial shares are present only in Nitrogen
        oracleAddress: oracle,
        tokenName: config.MUSD_TOKEN_NAME,
        tokenSymbol: config.MUSD_TOKEN_SYMBOL,
        tokenDecimals: config.MUSD_TOKEN_DECIMALS,
        minDeposit: config.MUSD_TOKEN_MIN_DEPOSIT,
        minRedeem: config.MUSD_TOKEN_MIN_REDEEM,
    });
    console.log('RebaseToken deployed:', rebaseToken);

    // set vault for swap driver
    await setUnderlyingToken(tronWeb, privateKey, {
        accountantLZ,
        moleculaToken: rebaseToken,
    });

    // deploy mUSDLock
    const mUSDLock = await deploymUSDLock(hre, tronWeb, privateKey, rebaseToken);

    // all done
    console.log('Contracts deployed:');
    console.log('RebaseToken:', rebaseToken);
    console.log('Oracle:', oracle);
    console.log('accountantLZ:', accountantLZ);
    console.log('mUSDLock:', mUSDLock);
    console.log('accountantLZHex:', tronWeb.address.toHex(accountantLZ).slice(2));

    return {
        tron: {
            rebaseToken,
            oracle,
            accountantLZ,
            mUSDLock,
        },
        accountantLZHex: tronWeb.address.toHex(accountantLZ).slice(2),
    };
}

export async function setTronOwnerFromConfig(
    hre: HardhatRuntimeEnvironment,
    privateKey: string,
    network: NetworkType,
    contracts: { name: string; addr: string }[],
) {
    const config = getTronNetworkConfig(network);
    // Create TronWeb instance
    const tronWeb = new TronWeb({
        fullHost: config.RPC_URL,
    });

    tronWeb.setPrivateKey(privateKey);
    console.log(`Setting owner ${config.OWNER} for the contracts:`);
    const initialOwner = tronWeb.address.fromPrivateKey(privateKey);
    for (const contract of contracts) {
        // Get ABI
        const artifact = await hre.artifacts.readArtifact('Ownable');

        const ownableContract = tronWeb.contract(artifact.abi, contract.addr);
        // @ts-ignore (Missing types for contracts)
        const currentOwner = tronWeb.address.fromHex(await ownableContract.owner().call());
        if (currentOwner === config.OWNER) {
            console.log(
                `\tContract ${contract.name} ${contract.addr} has already the owner. Skipped.`,
            );
        } else if (currentOwner === initialOwner) {
            // @ts-ignore (Missing types for contracts)
            await ownableContract.transferOwnership(config.OWNER).send();
            console.log(`\tSet owner for contract ${contract.name} ${contract.addr}.`);
        } else {
            throw Error(
                `\tContract ${contract.name} ${contract.addr} has ${currentOwner} owner. It's impossible to change the owner.`,
            );
        }
    }
}

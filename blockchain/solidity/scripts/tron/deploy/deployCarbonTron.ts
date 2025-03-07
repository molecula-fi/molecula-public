/* eslint-disable no-await-in-loop, no-restricted-syntax */

import { type HardhatRuntimeEnvironment } from 'hardhat/types';
import TronWeb from 'tronweb';

import { type NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { abi as OWNABLE_ABI } from '../../../artifacts/@openzeppelin/contracts/access/Ownable.sol/Ownable.json';

import { getTronNetworkConfig, getDeployerPrivateKey } from '../../utils/deployUtils';

import {
    deployAccountantLZ,
    setPeer,
    setMoleculaToken,
    setTreasury,
    setGasLimit,
    setAuthorizedLZConfigurator,
} from './deployAccountantLZ';
import { deployOracle, setOracleAccountant } from './deployOracle';
import { deployRebaseToken } from './deployRebaseToken';
import {
    deployTreasury,
    treasurySetAuthorizedLZConfigurator,
    treasurySetGasLimit,
} from './deployTreasury';
import { deploymUSDLock } from './deploymUSDLock';

function to32BytesHexString(hexString: string) {
    const resString = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
    return `0x${resString.padStart(64, '0')}`;
}

export async function getTronWeb(hre: HardhatRuntimeEnvironment, network: NetworkType) {
    // get config
    const config = getTronNetworkConfig(network);
    // Create TronWeb instance
    const tronWeb = new TronWeb({
        fullHost: config.RPC_URL,
    });
    // Get private key
    const privateKey = await getDeployerPrivateKey(hre);

    tronWeb.setPrivateKey(privateKey);
    return { config, tronWeb, privateKey };
}

export async function deployCarbon(
    hre: HardhatRuntimeEnvironment,
    network: NetworkType,
    params: {
        agentLZ: string;
        wmUSDT: string;
    },
) {
    const { config, tronWeb, privateKey } = await getTronWeb(hre, network);

    // get initial owner
    const initialOwner = tronWeb.address.fromPrivateKey(privateKey);
    console.log('Initial owner:', initialOwner);

    // deploy Oracle
    const oracle = await deployOracle(
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
    const accountantLZ = await deployAccountantLZ(tronWeb, privateKey, {
        initialOwner,
        authorizedLZConfigurator: initialOwner, // update after lz configuration
        authorizedServer: config.ACCOUNTANT_AUTHORIZED_SERVER,
        lzEndpoint: config.LAYER_ZERO_TRON_ENDPOINT,
        lzDstEid: config.LAYER_ZERO_ETHEREUM_EID,
        token: initialOwner, // set latter setMoleculaToken
        treasuryAddress: initialOwner, // set latter setTreasury
        erc20Address: config.USDT_ADDRESS,
        // Set the base options without specifying the gas limit
        // The value bellow is received from:
        // const options = Options.newOptions().addExecutorLzReceiveOption(GAS_LIMIT, MSG_VALUE);
        // trimmed at the end in order to remove the GAS_LIMIT value which is to be specified
        // separately for each LayerZero message.
        // See: https://github.com/molecula-fi/molecula-monorepo/blob/57fbcf1e54d70d18667bebc3b5074c41d340dcba/contracts/networks/tron/contracts/common/OptionsLZ.sol#L60
        lzOptions: '0x000301001101',
        oracle,
    });
    console.log('Swap Accountant LZ deployed:', accountantLZ);

    // Set Accountant to Oracle
    await setOracleAccountant(tronWeb, oracle, accountantLZ);
    console.log('Oracle accountant set:', accountantLZ);

    // deploy RebaseToken
    const rebaseToken = await deployRebaseToken(tronWeb, privateKey, {
        initialOwner,
        accountantAddress: accountantLZ,
        initialShares: config.MUSD_TOKEN_INITIAL_SUPPLY,
        oracleAddress: oracle,
        tokenName: config.MUSD_TOKEN_NAME,
        tokenSymbol: config.MUSD_TOKEN_SYMBOL,
        tokenDecimals: config.MUSD_TOKEN_DECIMALS,
        minDeposit: config.MUSD_TOKEN_MIN_DEPOSIT,
        minRedeem: config.MUSD_TOKEN_MIN_REDEEM,
    });
    console.log('RebaseToken deployed:', rebaseToken);

    // deploy Treasury
    const treasury = await deployTreasury(tronWeb, privateKey, {
        initialOwner,
        authorizedServer: config.TREASURY_AUTHORIZED_SERVER,
        lzEndpoint: config.LAYER_ZERO_TRON_ENDPOINT,
        accountantAddress: accountantLZ,
        tokenAddress: config.USDT_ADDRESS,
        // Set the base options without specifying the gas limit
        // The value bellow is received from:
        // const options = Options.newOptions().addExecutorLzReceiveOption(GAS_LIMIT, MSG_VALUE);
        // trimmed at the end in order to remove the GAS_LIMIT value which is to be specified
        // separately for each LayerZero message.
        // See: https://github.com/molecula-fi/molecula-monorepo/blob/57fbcf1e54d70d18667bebc3b5074c41d340dcba/contracts/networks/tron/contracts/common/OptionsLZ.sol#L60
        lzOpt: '0x000301001101',
        authorizedLZConfigurator: initialOwner, // set latter
        lzDstEid: config.LAYER_ZERO_ETHEREUM_EID,
        swftBridgeAddress: config.SWFT_BRIDGE_ADDRESS,
        swftDest: params.wmUSDT,
    });
    console.log('Treasury deployed:', treasury);

    // set treasury for accountantLZ
    await setTreasury(tronWeb, {
        accountantLZ,
        treasury,
    });

    // set vault for swap driver
    await setMoleculaToken(tronWeb, {
        accountantLZ,
        moleculaToken: rebaseToken,
    });

    // set peer to accountantLZ
    const peer = to32BytesHexString(params.agentLZ);
    await setPeer(tronWeb, {
        oApp: accountantLZ,
        eid: config.LAYER_ZERO_ETHEREUM_EID,
        peer,
    });

    // set peer to Treasury
    const treasuryPeer = to32BytesHexString(params.wmUSDT);
    await setPeer(tronWeb, {
        oApp: treasury,
        eid: config.LAYER_ZERO_ETHEREUM_EID,
        peer: treasuryPeer,
    });

    // set gas limit for accountantLZ
    await setGasLimit(tronWeb, {
        accountantLZ,
        msgType: 1, // REQUEST_DEPOSIT
        baseValue: 300000,
        unitValue: 0,
    });
    await setGasLimit(tronWeb, {
        accountantLZ,
        msgType: 3, // REQUEST_REDEEM
        baseValue: 200000,
        unitValue: 0,
    });

    // set gas limit for treasury
    await treasurySetGasLimit(tronWeb, {
        treasury,
        msgType: 9, // SWAP_USDT
        baseValue: 100000,
        unitValue: 0,
    });

    // Set authorizedLZConfigurator for accountantLZ
    await setAuthorizedLZConfigurator(tronWeb, {
        accountantLZ,
        authorizedLZConfigurator: config.ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR,
    });

    // Set authorizedLZConfigurator for treasury
    await treasurySetAuthorizedLZConfigurator(tronWeb, {
        treasury,
        authorizedLZConfigurator: config.TREASURY_AUTHORIZED_LZ_CONFIGURATOR,
    });

    // deploy mUSDLock
    const mUSDLock = await deploymUSDLock(tronWeb, privateKey, rebaseToken);

    // all done
    console.log('Contracts deployed:');
    console.log('RebaseToken:', rebaseToken);
    console.log('Oracle:', oracle);
    console.log('accountantLZ:', accountantLZ);
    console.log('treasury:', treasury);
    console.log('mUSDLock:', mUSDLock);
    console.log('accountantLZHex:', tronWeb.address.toHex(accountantLZ).slice(2));
    console.log('treasuryHex:', tronWeb.address.toHex(treasury).slice(2));
    console.log('swftBridge: ', config.SWFT_BRIDGE_ADDRESS);

    return {
        tron: {
            rebaseToken,
            oracle,
            accountantLZ,
            treasury,
            mUSDLock,
            swftBridge: config.SWFT_BRIDGE_ADDRESS,
        },
        accountantLZHex: tronWeb.address.toHex(accountantLZ).slice(2),
        treasuryHex: tronWeb.address.toHex(treasury).slice(2),
    };
}

export async function setTronOwnerFromConfig(
    privateKey: string,
    network: NetworkType,
    contracts: { name: string; addr: string }[],
) {
    const config = getTronNetworkConfig(network);
    // Create TronWeb instance
    const tronWeb = new TronWeb({
        fullHost: config.RPC_URL,
    });
    // Ge
    tronWeb.setPrivateKey(privateKey);
    console.log(`Setting owner ${config.OWNER} for the contracts:`);
    const initialOwner = tronWeb.address.fromPrivateKey(privateKey);
    for (const contract of contracts) {
        const ownableContract = tronWeb.contract(OWNABLE_ABI, contract.addr);
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

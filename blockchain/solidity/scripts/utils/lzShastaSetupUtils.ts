import { ethers } from 'hardhat';
import type TronWeb from 'tronweb';
import type { TronContract } from 'tronweb/interfaces';

import { abi as oAppABI } from '../../artifacts/@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppCore.sol/OAppCore.json';
import { abi as usdtOftABI } from '../../artifacts/contracts/common/UsdtOFT.sol/UsdtOFT.json';

export const REQUEST_DEPOSIT = '0x01';
export const CONFIRM_DEPOSIT = '0x02';
export const REQUEST_REDEEM = '0x03';
export const CONFIRM_REDEEM = '0x04';
export const DISTRIBUTE_YIELD = '0x05';
export const CONFIRM_DEPOSIT_AND_UPDATE_ORACLE = '0x06';
export const DISTRIBUTE_YIELD_AND_UPDATE_ORACLE = '0x07';
export const UPDATE_ORACLE = '0x08';

export async function setPeer(
    tronWeb: TronWeb,
    oappAddress: string,
    remoteEid: number,
    oAppRemoteAddress: string,
) {
    const oAppContract = tronWeb.contract(oAppABI, oappAddress);
    const bytes32FromAddress = ethers.zeroPadValue(oAppRemoteAddress, 32);
    // @ts-ignore
    await oAppContract.setPeer(remoteEid, bytes32FromAddress).send();
    console.log(`\tSet peer for the contract ${oappAddress}.`);
}

export async function setUsdtOftFee(tronWeb: TronWeb, usdtOftAddress: string) {
    const usdtOftContract = tronWeb.contract(usdtOftABI, usdtOftAddress);
    // @ts-ignore
    await usdtOftContract.setFeeBps(10).send();
    console.log(`\tSet fee for the contract ${usdtOftAddress}.`);
}

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function setReceiveConfig(
    tronWeb: TronWeb,
    lzEndpoint: TronContract,
    remoteEid: number,
    oappAddress: string,
    receiveLibAddress: string,
) {
    // Configuration
    const ulnConfig = {
        confirmations: 1,
        requiredDVNCount: 1,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        // get DVNs from https://docs.layerzero.network/v2/developers/evm/technical-reference/dvn-addresses
        requiredDVNs: ['0xC6b1A264D9bB30A8d19575B0Bb3BA525A3a6FC93'],
        optionalDVNs: [],
    };

    // Encode UlnConfig using defaultAbiCoder
    const configTypeUlnStruct =
        'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
    // @ts-ignore
    const encodedUlnConfig = tronWeb.utils.abi.encodeParams([configTypeUlnStruct], [ulnConfig]);
    console.log('encodedUlnConfig', encodedUlnConfig);
    // Define the SetConfigParam
    const setConfigParam = [
        remoteEid,
        2, // RECEIVE_CONFIG_TYPE
        encodedUlnConfig,
    ];
    try {
        const tx = await lzEndpoint
            // @ts-ignore
            .setConfig(oappAddress, receiveLibAddress, [setConfigParam])
            .send();
        console.log('Transaction sent:', tx);
    } catch (error) {
        console.error('Transaction failed:', error);
    }
}

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function setSendConfig(
    tronWeb: TronWeb,
    lzEndpoint: TronContract,
    remoteEid: number,
    oappAddress: string,
    sendLibAddress: string,
) {
    // Configuration
    const ulnConfig = {
        confirmations: 1,
        requiredDVNCount: 1,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        // get DVNs from https://docs.layerzero.network/v2/developers/evm/technical-reference/dvn-addresses
        requiredDVNs: ['0xC6b1A264D9bB30A8d19575B0Bb3BA525A3a6FC93'],
        optionalDVNs: [],
    };

    // get from lzEndpoint.getConfig call
    const executorConfig = {
        maxMessageSize: 10000,
        executorAddress: '0xd9F0144AC7cED407a12dE2649b560b0a68a59A3D',
    };

    // Encode UlnConfig using defaultAbiCoder
    const configTypeUlnStruct =
        'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
    // @ts-ignore
    const encodedUlnConfig = tronWeb.utils.abi.encodeParams([configTypeUlnStruct], [ulnConfig]);

    // Encode ExecutorConfig using defaultAbiCoder
    const configTypeExecutorStruct = 'tuple(uint32 maxMessageSize, address executorAddress)';
    // @ts-ignore
    const encodedExecutorConfig = tronWeb.utils.abi.encodeParams(
        [configTypeExecutorStruct],
        [executorConfig],
    );

    // Define the SetConfigParam structs
    const setConfigParamUln = [
        remoteEid,
        2, // ULN_CONFIG_TYPE
        encodedUlnConfig,
    ];

    const setConfigParamExecutor = [
        remoteEid,
        1, // EXECUTOR_CONFIG_TYPE
        encodedExecutorConfig,
    ];

    // Send the transaction
    try {
        const tx = await lzEndpoint
            // @ts-ignore
            .setConfig(
                oappAddress,
                sendLibAddress,
                [setConfigParamUln, setConfigParamExecutor], // Array of SetConfigParam structs
            )
            .send();
        console.log('Transaction sent:', tx);
    } catch (error) {
        console.error('Transaction failed:', error);
    }
}

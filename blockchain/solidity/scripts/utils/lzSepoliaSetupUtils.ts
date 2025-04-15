import type { AddressLike } from 'ethers';
import { ethers } from 'hardhat';
import TronWeb from 'tronweb';

import type { ILayerZeroEndpointV2 } from '../../typechain-types/@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2';
// Create ABI coder
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

export async function setPeer(
    sourceOAppAddress: AddressLike,
    remoteEid: number,
    oappAddress: AddressLike,
) {
    const sourceContract = await ethers.getContractAt('IOAppCore', sourceOAppAddress as string);
    const addressInBytes32 = ethers.zeroPadValue(
        TronWeb.address.toHex(oappAddress as string).replace(/^(41)/, '0x') as string,
        32,
    );
    const response = await sourceContract.setPeer(remoteEid, addressInBytes32);
    await response.wait();
    console.log(`\tSet peer for the contract ${oappAddress}.`);
}

export async function setUsdtOftFee(usdtOftAddress: AddressLike) {
    const sourceContract = await ethers.getContractAt('UsdtOFT', usdtOftAddress as string);

    const response = await sourceContract.setFeeBps(10);
    await response.wait();
    console.log(`\tSet fee for the contract ${usdtOftAddress}.`);
}

export async function setEnforcedOptions(
    sourceOAppAddress: AddressLike,
    remoteEid: number,
    msgType: number,
    options: string,
) {
    const sourceContract = await ethers.getContractAt(
        'IOAppOptionsType3',
        sourceOAppAddress as string,
    );
    const enforcedOptions = {
        eid: remoteEid,
        msgType,
        options,
    };
    const response = await sourceContract.setEnforcedOptions([enforcedOptions]);
    await response.wait();
    console.log(
        `\tSet enforced options for the contract ${sourceOAppAddress}, tx: ${response.hash}`,
    );
}

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function setReceiveConfig(
    lzEndpoint: ILayerZeroEndpointV2,
    remoteEid: number,
    oappAddress: string,
    receiveLibAddress: string,
) {
    // Configuration
    // https://docs.layerzero.network/v2/developers/evm/protocol-gas-settings/default-config#setting-send-config
    const ulnConfig = {
        confirmations: 1,
        requiredDVNCount: 1,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        // get DVNs from https://docs.layerzero.network/v2/developers/evm/technical-reference/dvn-addresses
        requiredDVNs: ['0x8eebf8b423b73bfca51a1db4b7354aa0bfca9193'],
        optionalDVNs: [],
    };

    // Encode UlnConfig using defaultAbiCoder
    const configTypeUlnStruct =
        'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
    const encodedUlnConfig = abiCoder.encode([configTypeUlnStruct], [ulnConfig]);

    // Define the SetConfigParam struct
    const setConfigParam = {
        eid: remoteEid,
        configType: 2, // RECEIVE_CONFIG_TYPE
        config: encodedUlnConfig,
    };

    // Send the transaction
    try {
        const tx = await lzEndpoint.setConfig(
            oappAddress,
            receiveLibAddress,
            [setConfigParam], // This should be an array of SetConfigParam structs
        );

        console.log('Transaction sent:', tx.hash);
        await tx.wait();
        console.log('Transaction confirmed!');
    } catch (error) {
        console.error('Transaction failed:', error);
    }
}

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function setSendConfig(
    lzEndpoint: ILayerZeroEndpointV2,
    remoteEid: number,
    oappAddress: string,
    sendLibAddress: string,
) {
    // Configuration
    // https://docs.layerzero.network/v2/developers/evm/protocol-gas-settings/default-config#setting-send-config
    // get DVNs from https://docs.layerzero.network/v2/developers/evm/technical-reference/dvn-addresses
    const ulnConfig = {
        confirmations: 1,
        requiredDVNCount: 1,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: ['0x8eebf8b423b73bfca51a1db4b7354aa0bfca9193'],
        optionalDVNs: [],
    };

    // get from lzEndpoint.getConfig call
    const executorConfig = {
        maxMessageSize: 10000,
        executorAddress: '0x718B92b5CB0a5552039B593faF724D182A881eDA',
    };

    // Encode UlnConfig using defaultAbiCoder
    const configTypeUlnStruct =
        'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
    const encodedUlnConfig = abiCoder.encode([configTypeUlnStruct], [ulnConfig]);

    // Encode ExecutorConfig using defaultAbiCoder
    const configTypeExecutorStruct = 'tuple(uint32 maxMessageSize, address executorAddress)';
    const encodedExecutorConfig = abiCoder.encode([configTypeExecutorStruct], [executorConfig]);

    // Define the SetConfigParam structs
    const setConfigParamUln = {
        eid: remoteEid,
        configType: 2, // ULN_CONFIG_TYPE
        config: encodedUlnConfig,
    };

    const setConfigParamExecutor = {
        eid: remoteEid,
        configType: 1, // EXECUTOR_CONFIG_TYPE
        config: encodedExecutorConfig,
    };

    // Send the transaction
    try {
        const tx = await lzEndpoint.setConfig(
            oappAddress,
            sendLibAddress,
            [setConfigParamUln, setConfigParamExecutor], // Array of SetConfigParam structs
        );

        console.log('Transaction sent:', tx.hash);
        await tx.wait();
        console.log('Transaction confirmed!');
    } catch (error) {
        console.error('Transaction failed:', error);
    }
}

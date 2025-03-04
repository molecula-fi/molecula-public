import { ethers } from 'hardhat';

import { sepoliaConfig } from '../../configs/ethereum/sepoliaTyped';
import type { ILayerZeroEndpointV2 } from '../../typechain-types/@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2';

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function setReceiveConfig(
    lzEndpoint: ILayerZeroEndpointV2,
    remoteEid: number,
    oappAddress: string,
    receiveLibAddress: string,
) {
    // Create ABI coder
    const abiCoder = new ethers.AbiCoder();
    // Configuration
    // https://docs.layerzero.network/v2/developers/evm/protocol-gas-settings/default-config#setting-send-config
    const ulnConfig = {
        confirmations: 20,
        requiredDVNCount: 3,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        // get DVNs from https://docs.layerzero.network/v2/developers/evm/technical-reference/dvn-addresses
        requiredDVNs: [
            '0x25f492a35ec1e60ebcf8a3dd52a815c2d167f4c3',
            '0x4f675c48fad936cb4c3ca07d7cbf421ceeae0c75',
            '0x8eebf8b423b73bfca51a1db4b7354aa0bfca9193',
        ],
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
async function setSendConfig(
    lzEndpoint: ILayerZeroEndpointV2,
    remoteEid: number,
    oappAddress: string,
    sendLibAddress: string,
) {
    // Create ABI coder
    const abiCoder = new ethers.AbiCoder();

    // Configuration
    // https://docs.layerzero.network/v2/developers/evm/protocol-gas-settings/default-config#setting-send-config
    // get DVNs from https://docs.layerzero.network/v2/developers/evm/technical-reference/dvn-addresses
    const ulnConfig = {
        confirmations: 20,
        requiredDVNCount: 3,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: [
            '0x25f492a35ec1e60ebcf8a3dd52a815c2d167f4c3',
            '0x4f675c48fad936cb4c3ca07d7cbf421ceeae0c75',
            '0x8eebf8b423b73bfca51a1db4b7354aa0bfca9193',
        ],
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

async function getOAppConfig(
    lzEndpoint: ILayerZeroEndpointV2,
    remoteEid: number,
    oappAddress: string,
) {
    const executorConfigType = 1; // 1 for executor
    const ulnConfigType = 2; // 2 for UlnConfig

    // Get sender Library
    const sendLibAddress = await lzEndpoint.getSendLibrary(oappAddress, remoteEid);
    console.log('Send Library:', sendLibAddress);
    // Get receiver Library
    const receiveRes = await lzEndpoint.getReceiveLibrary(oappAddress, remoteEid);
    console.log('Receive Library:', receiveRes);
    const receiveLibAddress = receiveRes.lib;
    // Fetch and decode for sendLib (both Executor and ULN Config)
    const sendExecutorConfigBytes = await lzEndpoint.getConfig(
        oappAddress,
        sendLibAddress,
        remoteEid,
        executorConfigType,
    );

    const executorConfigAbi = ['tuple(uint32 maxMessageSize, address executorAddress)'];
    const abiCoder = new ethers.AbiCoder();
    const executorConfigArray = abiCoder.decode(executorConfigAbi, sendExecutorConfigBytes);
    console.log('Send Library Executor Config:', executorConfigArray);

    if (
        executorConfigArray[0][0] !== 10000n ||
        executorConfigArray[0][1] !== '0x718B92b5CB0a5552039B593faF724D182A881eDA'
    ) {
        throw new Error(
            'Fix executorConfig into setSendConfig! Executor config does not match expected values',
        );
    }

    const sendUlnConfigBytes = await lzEndpoint.getConfig(
        oappAddress,
        sendLibAddress,
        remoteEid,
        ulnConfigType,
    );
    const ulnConfigStructType = [
        'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
    ];
    const sendUlnConfigArray = abiCoder.decode(ulnConfigStructType, sendUlnConfigBytes);
    console.log('Send Library ULN Config:', sendUlnConfigArray);

    // Fetch and decode for receiveLib (only ULN Config)
    const receiveUlnConfigBytes = await lzEndpoint.getConfig(
        oappAddress,
        receiveLibAddress,
        remoteEid,
        ulnConfigType,
    );
    const receiveUlnConfigArray = abiCoder.decode(ulnConfigStructType, receiveUlnConfigBytes);
    console.log('Receive Library ULN Config:', receiveUlnConfigArray);

    return { sendLibAddress, receiveLibAddress };
}

export async function setupLayerZeroDVN() {
    console.log('Wallet address: ', sepoliaConfig.DEPLOYER_ADDRESS);
    console.log('Block #', await ethers.provider.getBlockNumber());
    console.log(
        'ETH balance: ',
        ethers.formatEther(await ethers.provider.getBalance(sepoliaConfig.DEPLOYER_ADDRESS)),
    );

    // Define the smart contract address and ABI
    const ethereumLzEndpointAddress = '0x6EDCE65403992e310A62460808c4b910D972f10f';
    if (sepoliaConfig.LAYER_ZERO_ENDPOINT !== ethereumLzEndpointAddress) {
        throw new Error('Wrong Layer Zero Endpoint!');
    }

    // Create a contract instance
    const lzEndpoint = await ethers.getContractAt(
        'ILayerZeroEndpointV2',
        ethereumLzEndpointAddress,
    );
    // Define the addresses and parameters
    const oappAddress = '0x67e17e5796FF421fA8F34fE66728f8ac15C4A3Ab'; // agentLZ
    const remoteEid = sepoliaConfig.LAYER_ZERO_TRON_EID; // Example target endpoint ID, Binance Smart Chain
    // Get OApp Config
    const { sendLibAddress, receiveLibAddress } = await getOAppConfig(
        lzEndpoint,
        remoteEid,
        oappAddress,
    );
    console.log('sendLibAddress:', sendLibAddress);
    console.log('receiveLibAddress:', receiveLibAddress);

    // TODO uncomment if needed
    // Set send config
    // await setSendConfig(lzEndpoint, remoteEid, oappAddress, sendLibAddress);
    // Set receive config
    // await setReceiveConfig(lzEndpoint, remoteEid, oappAddress, receiveLibAddress);

    console.log('Done');
}

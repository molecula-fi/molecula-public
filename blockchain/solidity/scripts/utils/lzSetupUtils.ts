import { ethers } from 'hardhat';
import TronWeb from 'tronweb';
import type { TronContract } from 'tronweb/interfaces';

import type { ILayerZeroEndpointV2 } from '../../typechain-types/@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2';

// Create ABI coder
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getTronOAppConfig(
    tronWeb: TronWeb,
    lzEndpoint: TronContract,
    remoteEid: number,
    oappAddress: string,
) {
    const executorConfigType = 1; // 1 for executor
    const ulnConfigType = 2; // 2 for UlnConfig

    // Get sender Library
    // @ts-ignore (Missing types for contracts)
    const sendLibRes = await lzEndpoint.getSendLibrary(oappAddress, remoteEid).call();
    const sendLibAddress = TronWeb.address.fromHex(sendLibRes[0]);
    console.log('Send Library:', sendLibAddress);

    // Get receiver Library
    // @ts-ignore (Missing types for contracts)
    const receiveRes = await lzEndpoint.getReceiveLibrary(oappAddress, remoteEid).call();
    const receiveLibAddress = TronWeb.address.fromHex(receiveRes[0]);
    console.log('Receive Library:', receiveLibAddress);

    // Fetch and decode for sendLib (both Executor and ULN Config)
    const sendExecutorConfigBytes = (
        await lzEndpoint
            // @ts-ignore
            .getConfig(oappAddress, sendLibAddress, remoteEid, executorConfigType)
            .call()
    )[0];
    // Define the ABI of the executor config
    const executorConfigAbi = ['tuple(uint32 maxMessageSize, address executorAddress)'];
    // @ts-ignore
    const executorConfigArray = tronWeb.utils.abi.decodeParams(
        [],
        executorConfigAbi,
        sendExecutorConfigBytes,
    )[0];
    console.log('Send Library Executor Config:', executorConfigArray);
    if (
        executorConfigArray.maxMessageSize !== 10000 ||
        executorConfigArray.executorAddress !== '0xd9F0144AC7cED407a12dE2649b560b0a68a59A3D'
    ) {
        throw new Error(
            'Fix executorConfig into setSendConfig! Executor config does not match expected values',
        );
    }

    // Fetch and decode for sendLib ULN Config
    const sendUlnConfigBytes = (
        await lzEndpoint
            // @ts-ignore
            .getConfig(oappAddress, sendLibAddress, remoteEid, ulnConfigType)
            .call()
    )[0];

    const ulnConfigStructType = [
        'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
    ];
    // @ts-ignore
    const sendUlnConfigArray = tronWeb.utils.abi.decodeParams(
        [],
        ulnConfigStructType,
        sendUlnConfigBytes,
    )[0];
    console.log('Send Library ULN Config:', sendUlnConfigArray);

    // Fetch and decode for receiveLib ULN Config
    const receiveUlnConfigBytes = (
        await lzEndpoint
            // @ts-ignore
            .getConfig(oappAddress, receiveLibAddress, remoteEid, ulnConfigType)
            .call()
    )[0];
    // @ts-ignore
    const receiveUlnConfigArray = tronWeb.utils.abi.decodeParams(
        [],
        ulnConfigStructType,
        receiveUlnConfigBytes,
    )[0];
    console.log('Receive Library ULN Config:', receiveUlnConfigArray);

    return { sendLibAddress, receiveLibAddress };
}

export async function getOAppConfig(
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

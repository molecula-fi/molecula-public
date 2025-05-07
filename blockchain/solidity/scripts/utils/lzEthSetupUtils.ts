import type { AddressLike } from 'ethers';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TronWeb } from 'tronweb';

import type { ILayerZeroEndpointV2 } from '../../typechain-types/@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2';

import { CONFIG_TYPE_EXECUTOR, CONFIG_TYPE_ULN, perChainConfig } from './lzSetupUtils';

export async function setPeer(
    hre: HardhatRuntimeEnvironment,
    sourceOAppAddress: AddressLike,
    remoteEid: number,
    peerOAppAddress: AddressLike,
) {
    const sourceContract = await hre.ethers.getContractAt('IOAppCore', sourceOAppAddress as string);
    const addressInBytes32 = hre.ethers.zeroPadValue(
        TronWeb.address.toHex(peerOAppAddress as string).replace(/^(41)/, '0x') as string,
        32,
    );
    const response = await sourceContract.setPeer(remoteEid, addressInBytes32);
    await response.wait();
    console.log(`\tSet peer for the contract ${peerOAppAddress}.`);
}

export async function setUsdtOftFee(hre: HardhatRuntimeEnvironment, usdtOftAddress: AddressLike) {
    const sourceContract = await hre.ethers.getContractAt('UsdtOFT', usdtOftAddress as string);

    const response = await sourceContract.setFeeBps(10);
    await response.wait();
    console.log(`\tSet fee for the contract ${usdtOftAddress}.`);
}

export async function setEnforcedOptions(
    hre: HardhatRuntimeEnvironment,
    sourceOAppAddress: AddressLike,
    remoteEid: number,
    msgType: number,
    options: string,
) {
    const sourceContract = await hre.ethers.getContractAt(
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function setReceiveConfig(
    hre: HardhatRuntimeEnvironment,
    lzEndpoint: ILayerZeroEndpointV2,
    remoteEid: number,
    oappAddress: string,
    receiveLibAddress: string,
) {
    // Create ABI coder
    const abiCoder = hre.ethers.AbiCoder.defaultAbiCoder();
    const config = perChainConfig[remoteEid];
    if (!config) {
        throw new Error(`No config found for remoteEid ${remoteEid}`);
    }

    // Encode UlnConfig using defaultAbiCoder
    const configTypeUlnStruct =
        'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
    const encodedUlnConfig = abiCoder.encode([configTypeUlnStruct], [config.ulnConfig]);

    // Define the SetConfigParam struct
    const setConfigParamUln = {
        eid: remoteEid,
        configType: 2, // RECEIVE_CONFIG_TYPE
        config: encodedUlnConfig,
    };

    // Send the transaction
    try {
        const tx = await lzEndpoint.setConfig(
            oappAddress,
            receiveLibAddress,
            [setConfigParamUln], // This should be an array of SetConfigParam structs
        );

        console.log('Transaction sent:', tx.hash);
        await tx.wait();
        console.log('Transaction confirmed!');
    } catch (error) {
        console.error('Transaction failed:', error);
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function setSendConfig(
    hre: HardhatRuntimeEnvironment,
    lzEndpoint: ILayerZeroEndpointV2,
    remoteEid: number,
    oappAddress: string,
    sendLibAddress: string,
) {
    // Create ABI coder
    const abiCoder = hre.ethers.AbiCoder.defaultAbiCoder();

    const config = perChainConfig[remoteEid];
    if (!config) {
        throw new Error(`No config found for remoteEid ${remoteEid}`);
    }

    // Encode UlnConfig using defaultAbiCoder
    const configTypeUlnStruct =
        'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
    const encodedUlnConfig = abiCoder.encode([configTypeUlnStruct], [config.ulnConfig]);

    // Encode ExecutorConfig using defaultAbiCoder
    const configTypeExecutorStruct = 'tuple(uint32 maxMessageSize, address executorAddress)';
    const encodedExecutorConfig = abiCoder.encode(
        [configTypeExecutorStruct],
        [config.executorConfig],
    );

    // Define the SetConfigParam structs
    const setConfigParamUln = {
        eid: remoteEid,
        configType: CONFIG_TYPE_ULN, // ULN_CONFIG_TYPE
        config: encodedUlnConfig,
    };

    const setConfigParamExecutor = {
        eid: remoteEid,
        configType: CONFIG_TYPE_EXECUTOR, // EXECUTOR_CONFIG_TYPE
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

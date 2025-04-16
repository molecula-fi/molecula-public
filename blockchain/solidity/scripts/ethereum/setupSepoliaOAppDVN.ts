// "setup:dvn:production": "dotenv  -e .env.production hardhat run scripts/ethereum/setupSepoliaOAppDVN.ts --network sepolia",
// "setup:dvn:test": "                                 hardhat run scripts/ethereum/setupSepoliaOAppDVN.ts --network sepolia",
import { ethers } from 'hardhat';

import { DevnetContractsCarbon } from '@molecula-monorepo/blockchain.addresses/deploy/devnet';

import { sepoliaConfig } from '../../configs/ethereum/sepoliaTyped';
import { setReceiveConfig, setSendConfig, setPeer } from '../utils/lzSepoliaSetupUtils';
import { getOAppConfig } from '../utils/lzSetupUtils';

export async function setupSepoliaOAppDVN() {
    const [deployer] = await ethers.getSigners();
    console.log('Wallet address: ', deployer!.address);
    console.log('Block #', await ethers.provider.getBlockNumber());
    console.log(
        'ETH balance: ',
        ethers.formatEther(await ethers.provider.getBalance(deployer!.address)),
    );

    // Create a contract instance
    const lzEndpoint = await ethers.getContractAt(
        'ILayerZeroEndpointV2',
        sepoliaConfig.LAYER_ZERO_ENDPOINT,
    );
    // Define the addresses and parameters
    const oappAddress = DevnetContractsCarbon.eth.agentLZ; // AgentLZ
    const remoteEid = sepoliaConfig.LAYER_ZERO_TRON_EID; // Example target endpoint ID, Binance Smart Chain
    // Get OApp Config
    const { sendLibAddress, receiveLibAddress } = await getOAppConfig(
        lzEndpoint,
        remoteEid,
        oappAddress,
    );
    console.log('AgentLZ sendLibAddress:', sendLibAddress);
    console.log('AgentLZ receiveLibAddress:', receiveLibAddress);

    // Set peer
    await setPeer(oappAddress, remoteEid, DevnetContractsCarbon.tron.accountantLZ);
    // Set send config
    await setSendConfig(lzEndpoint, remoteEid, oappAddress, sendLibAddress);
    // Set receive config
    await setReceiveConfig(lzEndpoint, remoteEid, oappAddress, receiveLibAddress);

    console.log('Done');
}

setupSepoliaOAppDVN()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

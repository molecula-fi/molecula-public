// "setup:dvn:production": "dotenv  -e .env.production hardhat run scripts/ethereum/setupSepoliaUsdtOFTDVN.ts --network sepolia",
// "setup:dvn:test": "                                 hardhat run scripts/ethereum/setupSepoliaUsdtOFTDVN.ts --network sepolia",
import { Options } from '@layerzerolabs/lz-v2-utilities';
import { ethers } from 'hardhat';

import { sepoliaConfig } from '../../configs/ethereum/sepoliaTyped';
import { shastaConfig } from '../../configs/tron/shastaTyped';
import {
    setPeer,
    setReceiveConfig,
    setSendConfig,
    setEnforcedOptions,
    setUsdtOftFee,
} from '../utils/lzSepoliaSetupUtils';
import { getOAppConfig } from '../utils/lzSetupUtils';

export async function setupSepoliaUsdtOFTDVN() {
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
    const usdtOFTAddress = sepoliaConfig.USDT_OFT; // USDT_OFT
    const remoteEid = sepoliaConfig.LAYER_ZERO_TRON_EID; // Example target endpoint ID, Binance Smart Chain
    // Get OApp Config
    const { sendLibAddress, receiveLibAddress } = await getOAppConfig(
        lzEndpoint,
        remoteEid,
        usdtOFTAddress,
    );
    console.log('usdtOFT sendLibAddress:', sendLibAddress);
    console.log('usdtOFT receiveLibAddress:', receiveLibAddress);

    // Set peer
    await setPeer(usdtOFTAddress, remoteEid, shastaConfig.USDT_OFT);
    // Set send config
    await setSendConfig(lzEndpoint, remoteEid, usdtOFTAddress, sendLibAddress);
    // Set receive config
    await setReceiveConfig(lzEndpoint, remoteEid, usdtOFTAddress, receiveLibAddress);
    // Set Fee for usdtOFT
    await setUsdtOftFee(usdtOFTAddress);

    console.log('Done');

    // Extra Options (LayerZero)
    const extraOption = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex();
    console.log('Setup Extra Options:', extraOption);

    await setEnforcedOptions(usdtOFTAddress, remoteEid, 3, extraOption);
}

setupSepoliaUsdtOFTDVN()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

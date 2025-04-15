// "setup:dvn:production": "dotenv  -e .env.production hardhat run scripts/tron/setupShastaUsdtOFTDVN.ts --network shasta",
// "setup:dvn:test": "                                 hardhat run scripts/tron/setupShastaUsdtOFTDVN.ts --network shasta",
import TronWeb from 'tronweb';

import { abi as lzEndpointABI } from '../../artifacts/@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol/ILayerZeroEndpointV2.json';
import { sepoliaConfig } from '../../configs/ethereum/sepoliaTyped';
import { shastaConfig } from '../../configs/tron/shastaTyped';
import { getTronOAppConfig } from '../utils/lzSetupUtils';
import {
    setPeer,
    setReceiveConfig,
    setSendConfig,
    setUsdtOftFee,
} from '../utils/lzShastaSetupUtils';

export async function setupShastaUsdtOFTDVN() {
    // Create TronWeb instance
    const tronWeb = new TronWeb({
        fullHost: shastaConfig.RPC_URL,
    });
    // Get private key
    const accountInfo = tronWeb.fromMnemonic(
        process.env.TRON_SEED_PHRASE as string,
        "m/44'/195'/0'/0/0",
    );
    if (accountInfo instanceof Error) {
        throw new Error('Invalid account information returned from fromMnemonic.');
    }
    const privateKey = accountInfo.privateKey.substring(2);
    tronWeb.setPrivateKey(privateKey);
    // get owner
    const initialOwner = tronWeb.address.fromPrivateKey(privateKey);
    console.log('Initial owner:', initialOwner);

    // Define the smart contract address and ABI
    const lzEndpointAddress = shastaConfig.LAYER_ZERO_TRON_ENDPOINT;
    const lzEndpoint = tronWeb.contract(lzEndpointABI, lzEndpointAddress);

    // Define the addresses and parameters
    const usdtOFTAddress = shastaConfig.USDT_OFT; // USDT_OFT
    // Remote EID
    const remoteEid = shastaConfig.LAYER_ZERO_ETHEREUM_EID;
    // Get OApp Config
    const { sendLibAddress, receiveLibAddress } = await getTronOAppConfig(
        tronWeb,
        lzEndpoint,
        remoteEid,
        usdtOFTAddress,
    );
    console.log('usdtOFT sendLibAddress:', sendLibAddress);
    console.log('usdtOFT receiveLibAddress:', receiveLibAddress);

    // Set Peer
    await setPeer(tronWeb, usdtOFTAddress, remoteEid, sepoliaConfig.USDT_OFT);
    // Set Receive Config
    await setReceiveConfig(tronWeb, lzEndpoint, remoteEid, usdtOFTAddress, receiveLibAddress);
    // Set Send Config
    await setSendConfig(tronWeb, lzEndpoint, remoteEid, usdtOFTAddress, sendLibAddress);
    // Set Fee for usdtOFT
    await setUsdtOftFee(tronWeb, usdtOFTAddress);

    console.log('Done');
}
setupShastaUsdtOFTDVN()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

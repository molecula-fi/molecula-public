import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import { NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { DEPLOY_GAS_LIMIT } from '../../../configs/ethereum/constants';
import { getConfig } from '../../utils/deployUtils';
import { verifyContract } from '../../verification/verificationUtils';

async function deployUSDT(hre: HardhatRuntimeEnvironment) {
    // deploy USDT
    const USDT = await hre.ethers.getContractFactory('UsdtEthereum');
    const usdt = await USDT.deploy(hre.ethers.formatUnits(1000000, 6), 'Tether token', 'USDT', 6, {
        gasLimit: DEPLOY_GAS_LIMIT,
    });
    await usdt.waitForDeployment();
    const usdtAddress = await usdt.getAddress();
    console.log('usdt deployed: ', usdtAddress);

    await verifyContract(hre, 'USDT', usdtAddress, []);
}

async function deployUsdtOFT(hre: HardhatRuntimeEnvironment) {
    const { config, account } = await getConfig(hre, NetworkType.devnet);

    // deploy UsdtOFT
    const UsdtOFT = await hre.ethers.getContractFactory('UsdtOFT');
    const usdtOFT = await UsdtOFT.deploy(
        config.LAYER_ZERO_ARBITRUM_EID,
        config.LAYER_ZERO_CELO_EID,
        config.LAYER_ZERO_ETHEREUM_EID,
        config.LAYER_ZERO_TRON_EID, // for ton testnet layerzero don't have eid
        config.LAYER_ZERO_TRON_EID,
        config.USDT_ADDRESS,
        config.LAYER_ZERO_ENDPOINT,
        account.address,
        { gasLimit: DEPLOY_GAS_LIMIT },
    );
    await usdtOFT.waitForDeployment();
    const usdtOftAddress = await usdtOFT.getAddress();
    console.log('usdt deployed: ', usdtOftAddress);

    await verifyContract(hre, 'UsdtOFT', usdtOftAddress, [
        config.LAYER_ZERO_ARBITRUM_EID,
        config.LAYER_ZERO_CELO_EID,
        config.LAYER_ZERO_ETHEREUM_EID,
        config.LAYER_ZERO_TRON_EID, // for ton testnet layerzero don't have eid
        config.LAYER_ZERO_TRON_EID,
        config.USDT_ADDRESS,
        config.LAYER_ZERO_ENDPOINT,
        account.address,
    ]);
}

async function main() {
    const hardhat = await import('hardhat');
    const hre: HardhatRuntimeEnvironment = hardhat.default;

    await deployUSDT(hre);
    await deployUsdtOFT(hre);
}

main().catch(error => {
    console.error('Failed to deploy:', error);
    process.exit(1);
});

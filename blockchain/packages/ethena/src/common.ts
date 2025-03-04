import { ethers } from 'hardhat';

import { sepoliaConfig } from '@molecula-monorepo/solidity/configs/ethereum/sepoliaTyped';

export async function getSepoliaWallet(secretSeedPhrase: string) {
    // create provider
    const provider = new ethers.JsonRpcProvider(sepoliaConfig.JSON_RPC, sepoliaConfig.JSON_RPC_ID);
    console.log('Block #', await provider.getBlockNumber());
    // get wallet
    const wallet = ethers.Wallet.fromPhrase(secretSeedPhrase);
    return wallet.connect(provider);
}

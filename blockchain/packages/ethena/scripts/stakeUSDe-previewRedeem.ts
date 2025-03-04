import { ethers } from 'hardhat';

import { ContractsEthenamUSDe } from '@molecula-monorepo/blockchain.addresses';

import { handleError } from '@molecula-monorepo/solidity/scripts/utils/deployUtils';

import { getSepoliaWallet } from '../src/common';

const secretSeedPhrase = process.env.ETHEREUM_SECRET_SEED_PHRASE as string;

async function previewRedeem(usdeAmount: bigint) {
    // create provider
    const account = await getSepoliaWallet(secretSeedPhrase);

    const susde = (
        await ethers.getContractAt('StakedUSDeV2', ContractsEthenamUSDe.ethena.sUSDe)
    ).connect(account);

    const mUSDe = await susde.previewRedeem(usdeAmount);

    console.log('usdeAmount:', usdeAmount);
    console.log('mUSDe:', mUSDe);
}

const usdeAmount = ethers.parseEther(process.argv[2]!);

previewRedeem(usdeAmount).catch(handleError);

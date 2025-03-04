import { ethers } from 'hardhat';

import { ContractsEthenamUSDe } from '@molecula-monorepo/blockchain.addresses';

import { handleError } from '@molecula-monorepo/solidity/scripts/utils/deployUtils';

import { getSepoliaWallet } from '../src/common';

const secretSeedPhrase = process.env.ETHEREUM_SECRET_SEED_PHRASE as string;

async function mintUSDe(beneficiary: string, usdeAmount: bigint) {
    const account = await getSepoliaWallet(secretSeedPhrase);

    const usde = (await ethers.getContractAt('USDe', ContractsEthenamUSDe.ethena.USDe)).connect(
        account,
    );

    console.log('Prev balance: ', await usde.balanceOf(beneficiary));
    const txResponse = await usde.mint(beneficiary, usdeAmount);
    await txResponse.wait();
    console.log('New balance: ', await usde.connect(account).balanceOf(beneficiary));
}

const beneficiary = process.argv[2]!;
const usdeAmount = ethers.parseEther(process.argv[3]!);

mintUSDe(beneficiary, usdeAmount).catch(handleError);

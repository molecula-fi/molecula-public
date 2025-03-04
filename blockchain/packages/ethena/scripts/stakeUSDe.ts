import { ethers } from 'hardhat';

import { ContractsEthenamUSDe } from '@molecula-monorepo/blockchain.addresses';

import { handleError } from '@molecula-monorepo/solidity/scripts/utils/deployUtils';

import { getSepoliaWallet } from '../src/common';

const secretSeedPhrase = process.env.ETHEREUM_SECRET_SEED_PHRASE as string;

async function mintUSDe(user: string, usdeAmount: bigint) {
    // create provider
    const account = await getSepoliaWallet(secretSeedPhrase);

    const usde = (await ethers.getContractAt('USDe', ContractsEthenamUSDe.ethena.USDe)).connect(
        account,
    );
    const susde = (
        await ethers.getContractAt('StakedUSDeV2', ContractsEthenamUSDe.ethena.sUSDe)
    ).connect(account);

    let txResponse = await usde.mint(account.address, usdeAmount);
    await txResponse.wait();
    txResponse = await usde.approve(await susde.getAddress(), usdeAmount);
    await txResponse.wait();

    txResponse = await susde.deposit(usdeAmount, user);
    await txResponse.wait();

    console.log('Balance:', await susde.balanceOf(user));
}

const user = process.argv[2]!;
const usdeAmount = ethers.parseEther(process.argv[3]!);

mintUSDe(user, usdeAmount).catch(handleError);

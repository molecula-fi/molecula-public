import type { HardhatRuntimeEnvironment } from 'hardhat/types';

export async function mintUSDe(
    hre: HardhatRuntimeEnvironment,
    usdeAddress: string,
    beneficiary: string,
    usdeAmount: bigint,
) {
    const usde = await hre.ethers.getContractAt('USDe', usdeAddress);
    console.log('Prev balance: ', await usde.balanceOf(beneficiary));
    const txResponse = await usde.mint(beneficiary, usdeAmount);
    await txResponse.wait();
    console.log('New balance: ', await usde.balanceOf(beneficiary));
}

export async function mintsUSDe(
    hre: HardhatRuntimeEnvironment,
    usdeAddress: string,
    susdeAddress: string,
    user: string,
    susdeAmount: bigint,
) {
    const account = (await hre.ethers.getSigners())[0]!;

    const usde = await hre.ethers.getContractAt('USDe', usdeAddress);
    const susde = await hre.ethers.getContractAt('StakedUSDeV2', susdeAddress);

    console.log('Prev balance:', await susde.balanceOf(user));

    const usdeAmount = 100n * (await susde.convertToAssets(susdeAmount));

    let txResponse = await usde.mint(account.address, usdeAmount);
    await txResponse.wait();

    txResponse = await usde.approve(await susde.getAddress(), usdeAmount);
    await txResponse.wait();

    txResponse = await susde.deposit(usdeAmount, account.address);
    await txResponse.wait();

    txResponse = await susde.transfer(user, susdeAmount);
    await txResponse.wait();

    console.log('New balance :', await susde.balanceOf(user));
}

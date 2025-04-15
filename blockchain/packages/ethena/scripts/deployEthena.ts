/* eslint-disable camelcase */
import type { HardhatRuntimeEnvironment } from 'hardhat/types';

export async function deployEthena(hre: HardhatRuntimeEnvironment, cooldownDuration: bigint) {
    const account = (await hre.ethers.getSigners())[0]!;

    // Deploy USDe
    const usdeFactory = await hre.ethers.getContractFactory('USDe');
    const usde = await usdeFactory.deploy(account.address);
    await usde.waitForDeployment();
    console.log('USDe address: ', await usde.getAddress());

    let txResponse = await usde.setMinter(account.address);
    await txResponse.wait();
    console.log('USDe minter: ', await usde.minter());

    // Deploy sUSDe
    const stakedUSDeV2Factory = await hre.ethers.getContractFactory('StakedUSDeV2');
    const stakedUSDeV2 = await stakedUSDeV2Factory.deploy(
        await usde.getAddress(),
        account.address,
        account.address,
    );
    await stakedUSDeV2.waitForDeployment();
    console.log('StakedUSDeV2 address: ', await stakedUSDeV2.getAddress());

    txResponse = await stakedUSDeV2.setCooldownDuration(cooldownDuration);
    await txResponse.wait();
    console.log('StakedUSDeV2 cooldownDuration (seconds): ', await stakedUSDeV2.cooldownDuration());

    return {
        USDe: await usde.getAddress(),
        sUSDe: await stakedUSDeV2.getAddress(),
    };
}

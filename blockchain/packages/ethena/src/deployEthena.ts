/* eslint-disable camelcase */
import type { HDNodeWallet } from 'ethers';

import { StakedUSDeV2__factory, USDe__factory } from '../typechain-types';

export async function deployEthena(account: HDNodeWallet, cooldownDuration: number) {
    // Deploy USDe
    const usdeFactory = new USDe__factory();
    const usde = await usdeFactory.connect(account).deploy(account.address);
    await usde.waitForDeployment();
    console.log('USDe address: ', await usde.getAddress());

    let txResponse = await usde.setMinter(account.address);
    await txResponse.wait();
    console.log('USDe minter: ', await usde.minter());

    // Deploy sUSDe
    const stakedUSDeV2Factory = new StakedUSDeV2__factory();
    const stakedUSDeV2 = await stakedUSDeV2Factory
        .connect(account)
        .deploy(await usde.getAddress(), account.address, account.address);
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

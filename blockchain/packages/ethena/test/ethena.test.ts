import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { formatEther } from 'ethers';
import { ethers } from 'hardhat';

import type { StakedUSDeV2, USDe } from '../typechain-types';

describe('Ethena', () => {
    async function initContracts() {
        const signers = await ethers.getSigners();
        const ethenaAmin: HardhatEthersSigner = signers.at(0)!;
        const user: HardhatEthersSigner = signers.at(1)!;

        const usde: USDe = await ethers.deployContract('USDe', [ethenaAmin]);
        await usde.setMinter(ethenaAmin);
        expect(await usde.minter()).to.be.eq(ethenaAmin);

        const stakedUSDeV2: StakedUSDeV2 = await ethers.deployContract('StakedUSDeV2', [
            await usde.getAddress(),
            ethenaAmin,
            ethenaAmin,
        ]);
        await stakedUSDeV2.setCooldownDuration(days(7));

        return { user, ethenaAmin, usde, stakedUSDeV2 };
    }

    it('Should deploy', async () => {
        await loadFixture(initContracts);
    });

    it('Should gen profit', async () => {
        const { user, ethenaAmin, usde, stakedUSDeV2 } = await loadFixture(initContracts);

        // Mint USDe for user
        const usdeAmount = ethers.parseEther('1');
        await usde.connect(ethenaAmin).mint(user.address, usdeAmount);

        // User stakes their USDe to stakedUSDeV2
        await usde.connect(user).approve(await stakedUSDeV2.getAddress(), usdeAmount);
        await stakedUSDeV2.connect(user).deposit(usdeAmount, user.address);

        // Generate profit
        await usde.connect(ethenaAmin).mint(await stakedUSDeV2.getAddress(), usdeAmount / 11n);

        // User redeems their assets
        await stakedUSDeV2.connect(user).cooldownShares(usdeAmount);
        const cooldownDuration = await stakedUSDeV2.cooldownDuration();
        await time.increase(cooldownDuration);
        await stakedUSDeV2.connect(user).unstake(user);

        // Check user profit
        const newUsdeAmount = await usde.balanceOf(user);
        console.log({
            prev_usde: formatEther(usdeAmount),
            new_usde: formatEther(newUsdeAmount),
            delta: formatEther(newUsdeAmount - usdeAmount),
        });
        expect(newUsdeAmount).to.be.greaterThan(usdeAmount);
    });
});

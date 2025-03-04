/* eslint-disable camelcase */

import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { grantERC20 } from '../utils/grant';

describe('Test Swft Mock', () => {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deploySwftMock() {
        // Contracts are deployed using the first signer/account by default
        const [owner, user] = await ethers.getSigners();
        expect(owner).to.exist;
        expect(user).to.exist;

        // deploy MockBridgeVault
        const SwftSwapFactory = await ethers.getContractFactory('MockSwftSwap');
        const swftSwap = await SwftSwapFactory.deploy(owner!.address);

        return {
            swftSwap,
            owner,
            user,
        };
    }

    describe('Deployment', () => {
        it('Should set the right owner', async () => {
            const { swftSwap, owner } = await loadFixture(deploySwftMock);
            expect(swftSwap.owner()).to.exist;
            expect(await swftSwap.owner()).to.equal(owner?.address);
        });
        it('Transfer USDT', async () => {
            const { swftSwap, user } = await loadFixture(deploySwftMock);
            const USDT = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.USDT_ADDRESS);

            const value = 10000000n; // 10e6
            const initUserBalance = await USDT.balanceOf(user!.address);

            await grantERC20(user!.address, USDT, value);
            expect(await USDT.balanceOf(user!.address)).to.equal(value + initUserBalance);
            expect(await USDT.balanceOf(swftSwap!.getAddress())).to.equal(0n);
            await USDT.connect(user!).transfer(swftSwap!.getAddress(), value);
            expect(await USDT.balanceOf(user!.address)).to.equal(initUserBalance);
            expect(await USDT.balanceOf(swftSwap!.getAddress())).to.equal(value);
            await swftSwap.withdraw(ethMainnetBetaConfig.USDT_ADDRESS, user!.address, value);
            expect(await USDT.balanceOf(user!.address)).to.equal(value + initUserBalance);
            expect(await USDT.balanceOf(swftSwap!.getAddress())).to.equal(0n);
        });
    });
});

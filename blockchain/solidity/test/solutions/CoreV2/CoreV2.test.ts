/* eslint-disable camelcase, max-lines, no-await-in-loop, no-restricted-syntax, no-bitwise, no-plusplus */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';

import { ethers } from 'ethers';

import { deployCoreV2 } from '../../utils/CoreV2';
import { findRequestRedeemEventV2 } from '../../utils/event';
import { grantERC20 } from '../../utils/grant';
import { expectEqual } from '../../utils/math';

describe('Core V2', () => {
    it('Tets gas usage for fulfillRedeemRequests', async () => {
        const {
            user0,
            tokenUSDCVault: tokenVault,
            rebaseTokenV2,
            USDC,
            mockDistributedPool,
        } = await loadFixture(deployCoreV2);

        const decimals: bigint = await USDC.decimals();
        const depositValue = 1_000_000n * 10n ** decimals;

        // Grand USD and approve tokens for tokenVault
        await grantERC20(user0, USDC, depositValue);
        await USDC.connect(user0).approve(tokenVault, depositValue);

        // Deposit assets in every way
        await tokenVault.connect(user0).requestDeposit(depositValue, user0, user0);
        const userShares = await rebaseTokenV2.sharesOf(user0);

        // requestRedeem
        const requestAmount = 2; // increase if it needs
        const requestIDs = [];
        for (let i = 0; i < requestAmount; i += 1) {
            const tx = await tokenVault
                .connect(user0)
                .requestRedeem(userShares / BigInt(requestAmount), user0, user0);
            const redeemEvent = await findRequestRedeemEventV2(tx);
            requestIDs.push(redeemEvent.operationId);
        }

        // fulfillRedeemRequests
        await mockDistributedPool.fulfillRedeemRequests(requestIDs);
    });

    it('Should deposit and redeem', async () => {
        const {
            user0,
            tokenUSDCVault: tokenVault,
            rebaseTokenV2,
            USDC,
            mockDistributedPool,
            supplyManagerV2,
        } = await loadFixture(deployCoreV2);

        const decimals: bigint = await USDC.decimals();
        const depositValue = 100n * 10n ** decimals;

        // Grand USD and approve tokens for tokenVault
        await grantERC20(user0, USDC, 4n * depositValue);
        await USDC.connect(user0).approve(tokenVault, 4n * depositValue);

        // Check shares
        const shares = await tokenVault.convertToShares(depositValue);
        const shares2 = await supplyManagerV2.convertToShares(depositValue * 10n ** 12n);
        expect(shares).to.be.equal(shares2);

        // Deposit assets in every way
        expect(await tokenVault.previewDeposit(depositValue)).to.be.equal(shares);
        await tokenVault.connect(user0).requestDeposit(depositValue, user0, user0);
        expect(await rebaseTokenV2.sharesOf(user0)).to.be.equal(shares);

        await tokenVault.connect(user0)['deposit(uint256,address)'](depositValue, user0);
        expect(await rebaseTokenV2.sharesOf(user0)).to.be.equal(2n * shares);

        expectEqual(await tokenVault.previewMint(shares), depositValue);
        await tokenVault.connect(user0)['mint(uint256,address,address)'](shares, user0, user0);
        expectEqual(await rebaseTokenV2.sharesOf(user0), 3n * shares, 18, 14);

        await tokenVault.connect(user0)['mint(uint256,address)'](shares, user0);
        expectEqual(await rebaseTokenV2.sharesOf(user0), 4n * shares, 18, 14);

        // Generate yield
        await grantERC20(mockDistributedPool, USDC, 10n * depositValue - 1n);

        // requestRedeem
        const userShares = await rebaseTokenV2.sharesOf(user0);
        const redeemAssets = await tokenVault.convertToAssets(userShares);
        expect(await tokenVault.maxWithdraw(user0)).to.be.equal(redeemAssets);
        const tx = await tokenVault.connect(user0).requestRedeem(userShares - 1n, user0, user0);
        expectEqual(await tokenVault.pendingRedeemRequest(0, user0), userShares);
        const redeemEvent = await findRequestRedeemEventV2(tx);

        // fulfillRedeemRequests
        await mockDistributedPool.fulfillRedeemRequests([redeemEvent.operationId]);
        expectEqual(await tokenVault.claimableRedeemRequest(0, user0), userShares, 18, 6);
        expect(await tokenVault.claimableRedeemAssets(user0)).to.be.equal(redeemAssets);

        // redeem
        expect(await USDC.balanceOf(user0)).to.be.equal(0);
        await tokenVault.connect(user0).redeem(userShares, user0, user0);
        expect(await USDC.balanceOf(user0)).to.be.equal(redeemAssets);
    });

    it('Should deposit and redeem #2', async () => {
        const {
            user0,
            tokenUSDCVault: tokenVault,
            rebaseTokenV2,
            USDC,
            mockDistributedPool,
        } = await loadFixture(deployCoreV2);

        const decimals: bigint = await USDC.decimals();
        const depositValue = 100n * 10n ** decimals;

        // Grand USD and approve tokens for tokenVault
        await grantERC20(user0, USDC, depositValue);
        await USDC.connect(user0).approve(tokenVault, depositValue);

        // Deposit assets in every way
        await tokenVault.connect(user0).requestDeposit(depositValue, user0, user0);

        // Generate yield
        await grantERC20(mockDistributedPool, USDC, 10n * depositValue - 1n);

        // requestRedeem depositValue
        const tx = await tokenVault.connect(user0).requestWithdraw(depositValue, user0, user0);
        const redeemEvent = await findRequestRedeemEventV2(tx);

        // fulfillRedeemRequests
        expectEqual(await tokenVault.claimableRedeemAssets(user0), 0n);
        await mockDistributedPool.fulfillRedeemRequests([redeemEvent.operationId]);
        expectEqual(await tokenVault.claimableRedeemAssets(user0), depositValue, 6, 5);

        // withdraw
        expect(await USDC.balanceOf(user0)).to.be.equal(0);
        await tokenVault.connect(user0).withdraw(depositValue - 1n, user0, user0);
        expectEqual(await USDC.balanceOf(user0), depositValue);
        expect(await rebaseTokenV2.balanceOf(user0)).to.be.greaterThan(0);
    });

    it('Should deposit as operator', async () => {
        const {
            user0,
            tokenUSDCVault: tokenVault,
            rebaseTokenV2,
            USDC,
            operator,
            user1,
            mockDistributedPool,
        } = await loadFixture(deployCoreV2);

        const decimals: bigint = await USDC.decimals();
        const depositValue = 100n * 10n ** decimals;

        // Grand USD and approve tokens for tokenVault
        await grantERC20(user0, USDC, 2n * depositValue);
        await USDC.connect(user0).approve(tokenVault, 2n * depositValue);

        // user0 sets operator and deposit tokens two times
        await tokenVault.connect(user0).setOperator(operator, true);
        await tokenVault
            .connect(operator)
            ['deposit(uint256,address,address)'](depositValue, user1, user0);
        await tokenVault
            .connect(user0)
            ['deposit(uint256,address,address)'](depositValue, user1, user0);

        const shares = 100n * 10n ** 18n;
        expect(await rebaseTokenV2.balanceOf(user1)).to.be.equal(2n * shares);

        // user1 request redeem
        expect(await USDC.balanceOf(user1)).to.be.equal(0);

        const tx = await tokenVault.connect(user1).requestRedeem(shares, user1, user1);
        const requestId = (await findRequestRedeemEventV2(tx)).operationId;
        await mockDistributedPool.fulfillRedeemRequests([requestId]);
        const claimableAssets = await tokenVault.claimableRedeemAssets(user1);
        expect(claimableAssets).to.be.greaterThan(0);
        await tokenVault.connect(user1).withdraw(claimableAssets, user1, user1);

        // expect(await moleculaRebaseToken.balanceOf(user1)).to.be.equal(shares);
        expect(await USDC.balanceOf(user1)).to.be.equal(depositValue);
    });

    it('Test getters / errors', async () => {
        const {
            user0,
            user1,
            tokenUSDCVault: tokenVault,
            rebaseTokenV2,
        } = await loadFixture(deployCoreV2);

        expect(await tokenVault.share()).to.be.equal(rebaseTokenV2);
        expect(await tokenVault.pendingDepositRequest(0, ethers.ZeroAddress)).to.be.equal(0);
        expect(await tokenVault.claimableDepositRequest(0, ethers.ZeroAddress)).to.be.equal(0);
        expect(await tokenVault.pendingRedeemRequest(1, ethers.ZeroAddress)).to.be.equal(0);
        expect(await tokenVault.claimableRedeemRequest(1, ethers.ZeroAddress)).to.be.equal(0);

        expect(await tokenVault.maxDeposit(ethers.ZeroAddress)).to.be.equal(ethers.MaxUint256);
        expect(await tokenVault.maxMint(ethers.ZeroAddress)).to.be.equal(ethers.MaxUint256);

        await expect(tokenVault.previewRedeem(0)).to.be.rejectedWith('EAsyncRedeem');
        await expect(tokenVault.previewWithdraw(0)).to.be.rejectedWith('EAsyncRedeem');

        await expect(tokenVault.connect(user0).withdraw(0, user1, user1)).to.be.rejectedWith(
            'EInvalidOperator',
        );
        await expect(tokenVault.connect(user0).withdraw(1, user0, user0)).to.be.rejectedWith(
            'ETooManyRedeemAssets',
        );
        await expect(tokenVault.connect(user0).setOperator(user0, true)).to.be.rejectedWith(
            'ESelfOperator',
        );
    });
});

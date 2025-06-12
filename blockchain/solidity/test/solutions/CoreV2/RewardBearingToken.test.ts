/* eslint-disable camelcase, max-lines, no-await-in-loop, no-restricted-syntax, no-bitwise, no-plusplus */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';

import { deployCoreV2RewardBearingToken } from '../../utils/CoreV2WithRewardBearingToken';
import { findRequestRedeemEventV2 } from '../../utils/event';
import { grantERC20 } from '../../utils/grant';
import { expectEqual } from '../../utils/math';

describe('RewardBearingToken', () => {
    it('Using RewardBearingToken', async () => {
        const {
            user0,
            tokenUSDCVault: tokenVault,
            rewardBearingToken,
            USDC,
            mockDistributedPool,
        } = await loadFixture(deployCoreV2RewardBearingToken);

        const decimals: bigint = await USDC.decimals();
        const depositValue = 100n * 10n ** decimals;

        // Grand USD and approve tokens for tokenVault
        await grantERC20(user0, USDC, depositValue);
        await USDC.connect(user0).approve(tokenVault, depositValue);

        // Deposit assets
        const shares = await tokenVault.previewDeposit(depositValue);
        await tokenVault.connect(user0).requestDeposit(depositValue, user0, user0);
        expect(await rewardBearingToken.balanceOf(user0)).to.be.equal(shares);

        // Generate yield
        await grantERC20(mockDistributedPool, USDC, 10n * depositValue - 1n);
        // Balance is not changed
        expect(await rewardBearingToken.balanceOf(user0)).to.be.equal(shares);

        // requestRedeem
        const userShares = await rewardBearingToken.balanceOf(user0);
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
});

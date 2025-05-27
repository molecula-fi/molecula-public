/* eslint-disable camelcase, max-lines, no-await-in-loop, no-restricted-syntax, no-bitwise, no-plusplus */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';

import { deployCoreV2 } from '../utils/CoreV2';
import { findRequestRedeemEvent } from '../utils/event';
import { grantERC20 } from '../utils/grant';

describe.only('Core V2', () => {
    it('Should deposit', async () => {
        const { user0, tokenVault, rebaseTokenV2, USDC, operator, user1, mockDistributedPool } =
            await loadFixture(deployCoreV2);

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
        const requestId = (await findRequestRedeemEvent(tx)).operationId;
        await mockDistributedPool.fulfillRedeemRequests([requestId]);
        const claimableAssets = await tokenVault.claimableRedeemAssets(user1);
        expect(claimableAssets).to.be.greaterThan(0);
        await tokenVault.connect(user1).withdraw(claimableAssets, user1, user1);

        // expect(await moleculaRebaseToken.balanceOf(user1)).to.be.equal(shares);
        expect(await USDC.balanceOf(user1)).to.be.equal(depositValue);
    });
});

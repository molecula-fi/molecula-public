/* eslint-disable camelcase, max-lines, no-await-in-loop, no-restricted-syntax, no-bitwise, no-plusplus */

import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { deployCoreV2, deployCoreV2WithoutInit } from '../../utils/CoreV2';
import { findRequestRedeemEventV2 } from '../../utils/event';
import { grantERC20 } from '../../utils/grant';

describe('Token Vault', () => {
    it('Check init params', async () => {
        const { tokenUSDCVault, USDC } = await loadFixture(deployCoreV2WithoutInit);

        await expect(tokenUSDCVault.init(USDC, 0, 1)).to.be.rejectedWith('EZeroValue()');
        await expect(tokenUSDCVault.init(USDC, 1, 0)).to.be.rejectedWith('EZeroValue()');
        await tokenUSDCVault.init(USDC, 1, 2);

        await expect(tokenUSDCVault.setMinDepositAssets(0)).to.be.rejectedWith('EZeroValue()');
        await expect(tokenUSDCVault.setMinRedeemShares(0)).to.be.rejectedWith('EZeroValue()');

        expect(await tokenUSDCVault.isRequestDepositPaused()).to.be.true;
        expect(await tokenUSDCVault.isRequestRedeemPaused()).to.be.true;
    });

    it('Check zero params', async () => {
        const { tokenUSDCVault, USDC, user0, rebaseTokenV2, mockDistributedPool } =
            await loadFixture(deployCoreV2);

        const decimals: bigint = await USDC.decimals();
        const depositValue = 100n * 10n ** decimals;

        // Grand USD and approve tokens for tokenUSDCVault
        await grantERC20(user0, USDC, depositValue);
        await USDC.connect(user0).approve(tokenUSDCVault, depositValue);

        // user0 deposits tokens
        await expect(
            tokenUSDCVault.connect(user0).requestDeposit(depositValue, ethers.ZeroAddress, user0),
        ).to.be.rejectedWith('EZeroAddress(');
        await expect(
            tokenUSDCVault.connect(user0).requestDeposit(depositValue, user0, ethers.ZeroAddress),
        ).to.be.rejectedWith('EInvalidOperator(');
        await tokenUSDCVault.connect(user0).requestDeposit(depositValue, user0, user0);

        // requestRedeem
        const shares = await rebaseTokenV2.sharesOf(user0);
        await expect(
            tokenUSDCVault.connect(user0).requestRedeem(shares, ethers.ZeroAddress, user0),
        ).to.be.rejectedWith('EZeroAddress()');
        await expect(
            tokenUSDCVault.connect(user0).requestRedeem(shares, user0, ethers.ZeroAddress),
        ).to.be.rejectedWith('EInvalidOperator(');
        const tx = await tokenUSDCVault.connect(user0).requestRedeem(shares, user0, user0);
        const redeemEvent = await findRequestRedeemEventV2(tx);

        // fulfillRedeemRequests
        await mockDistributedPool.fulfillRedeemRequests([redeemEvent.operationId]);

        // redeem
        await tokenUSDCVault.connect(user0).redeem(shares, user0, user0);
        await expect(tokenUSDCVault.connect(user0).redeem(0, user0, user0)).to.be.rejectedWith(
            'EZeroValue()',
        );
        await expect(
            tokenUSDCVault.connect(user0).redeem(shares, user0, ethers.ZeroAddress),
        ).to.be.rejectedWith('EInvalidOperator(');
        await expect(
            tokenUSDCVault.connect(user0).redeem(shares, ethers.ZeroAddress, user0),
        ).to.be.rejectedWith('EZeroAddress()');
    });

    it('Deposit native token', async () => {
        const { nativeTokenVault, user0, user1, rebaseTokenV2, mockDistributedPool } =
            await loadFixture(deployCoreV2);
        const { provider } = ethers;

        expect(await provider.getBalance(mockDistributedPool)).to.be.equal(0);

        // user deposits eth
        const decimals = 18n;
        const depositValue = 10n ** decimals;
        expect(await rebaseTokenV2.sharesOf(user0)).to.be.equal(0);
        await nativeTokenVault.connect(user0).deposit(0, user0, { value: depositValue });
        expect(await rebaseTokenV2.sharesOf(user0)).to.be.equal(depositValue);
        expect(await provider.getBalance(mockDistributedPool)).to.be.equal(depositValue);

        // Request redeem
        const shares = await rebaseTokenV2.sharesOf(user0);
        const tx = await nativeTokenVault.connect(user0).requestRedeem(shares, user0, user0);
        const redeemEvent = await findRequestRedeemEventV2(tx);

        // Fulfilling
        await mockDistributedPool.fulfillRedeemRequestsForNativeToken([redeemEvent.operationId]);
        const claimableAssets = await nativeTokenVault.claimableRedeemAssets(user0);
        expect(claimableAssets).to.be.equal(redeemEvent.redeemValue);

        // user0 withdraws native tokens for user1
        const user1Balance = await provider.getBalance(user1);
        await nativeTokenVault.connect(user0).withdraw(claimableAssets, user1, user0);
        expect(await provider.getBalance(user1)).to.be.equal(
            user1Balance + redeemEvent.redeemValue,
        );
    });
});

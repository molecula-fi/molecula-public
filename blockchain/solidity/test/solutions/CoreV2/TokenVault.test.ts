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
        ).to.be.rejectedWith('EZeroAddress()');
        await expect(
            tokenUSDCVault.connect(user0).requestDeposit(depositValue, user0, ethers.ZeroAddress),
        ).to.be.rejectedWith('EZeroAddress()');
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
});

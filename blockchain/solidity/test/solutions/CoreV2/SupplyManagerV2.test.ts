/* eslint-disable camelcase, max-lines, no-await-in-loop, no-restricted-syntax, no-bitwise, no-plusplus */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { deployCoreV2 } from '../../utils/CoreV2';
import { findRequestRedeemEventV2 } from '../../utils/event';
import { FAUCET, grantERC20 } from '../../utils/grant';

describe('Supply Manager V2', () => {
    it('Test conversion shares', async () => {
        const { rebaseTokenV2, USDC, mockDistributedPool, user0, supplyManagerV2, tokenUSDCVault } =
            await loadFixture(deployCoreV2);

        const depositUSDCValue = 50n * 10n ** (await USDC.decimals());
        await USDC.connect(user0).approve(tokenUSDCVault, ethers.MaxUint256);

        await grantERC20(user0, USDC, depositUSDCValue);
        await tokenUSDCVault.connect(user0).requestDeposit(depositUSDCValue, user0, user0);
        let userShares = await rebaseTokenV2.sharesOf(user0);

        const tx = await tokenUSDCVault.connect(user0).requestRedeem(userShares - 1n, user0, user0);
        const redeemEvent = await findRequestRedeemEventV2(tx);
        await mockDistributedPool.fulfillRedeemRequests([redeemEvent.operationId]);

        const { pool, shares } = await supplyManagerV2.getTotalSupply();
        expect(pool).to.be.greaterThan(10n ** 18n);
        expect(shares).to.be.greaterThan(10n ** 18n);

        for (let i = 0; i < 3; i += 1) {
            await grantERC20(user0, USDC, depositUSDCValue);
            await tokenUSDCVault.connect(user0).requestDeposit(depositUSDCValue, user0, user0);
            userShares = await rebaseTokenV2.sharesOf(user0);
            expect(userShares).to.be.greaterThan(10n ** 18n);
        }
    });

    it('Test distributeYield', async () => {
        const {
            rebaseTokenV2,
            USDe,
            mockDistributedPool,
            supplyManagerV2,
            yieldDistributor,
            user0,
            user1,
            tokenUSDEVault,
        } = await loadFixture(deployCoreV2);

        // user1 deposit their tokens
        const depositUSDEValue = 10n ** (await USDe.decimals());
        await grantERC20(user1, USDe, depositUSDEValue, FAUCET.USDe);
        await USDe.connect(user1).approve(tokenUSDEVault, ethers.MaxUint256);
        await tokenUSDEVault.connect(user1).requestDeposit(depositUSDEValue, user1, user1);

        // Grant yield
        await grantERC20(mockDistributedPool, USDe, 10n * depositUSDEValue, FAUCET.USDe);

        // Distribute yield for user0
        expect(await rebaseTokenV2.balanceOf(user0.address)).to.equal(0);
        await supplyManagerV2
            .connect(yieldDistributor)
            .distributeYield([{ user: user0.address, portion: 10n ** 18n }], 1n);
        expect(await rebaseTokenV2.balanceOf(user0.address)).to.greaterThan(0);

        // Change yield distributor
        await supplyManagerV2.setYieldDistributor(user0);
        await grantERC20(mockDistributedPool, USDe, 1000, FAUCET.USDe);
        await supplyManagerV2
            .connect(user0)
            .distributeYield([{ user: user0.address, portion: 10n ** 18n }], 1n);
    });

    it('SupplyManagerV2.fulfillRedeemRequests errors', async () => {
        const {
            USDe,
            USDC,
            user0,
            mockDistributedPool,
            tokenUSDCVault,
            tokenUSDEVault,
            rebaseTokenV2,
        } = await loadFixture(deployCoreV2);

        const depositUSDCValue = 10n ** (await USDC.decimals());
        const depositUSDEValue = 10n ** (await USDe.decimals());
        await grantERC20(user0, USDC, depositUSDCValue);
        await grantERC20(user0, USDe, depositUSDEValue, FAUCET.USDe);
        await USDC.connect(user0).approve(tokenUSDCVault, ethers.MaxUint256);
        await USDe.connect(user0).approve(tokenUSDEVault, ethers.MaxUint256);
        await tokenUSDCVault.connect(user0).requestDeposit(depositUSDCValue, user0, user0);
        await tokenUSDEVault.connect(user0).requestDeposit(depositUSDEValue, user0, user0);

        const userShares = await rebaseTokenV2.sharesOf(user0);
        let tx = await tokenUSDCVault.connect(user0).requestRedeem(userShares / 2n, user0, user0);
        const redeemUSDCEvent = await findRequestRedeemEventV2(tx);
        tx = await tokenUSDEVault.connect(user0).requestRedeem(userShares / 2n, user0, user0);
        const redeemUSDEEvent = await findRequestRedeemEventV2(tx);

        await expect(
            mockDistributedPool.fulfillRedeemRequests([
                redeemUSDCEvent.operationId,
                redeemUSDEEvent.operationId,
            ]),
        ).to.be.rejectedWith('EWrongTokenVault');
    });

    it('SupplyManagerV2 errors', async () => {
        const { supplyManagerV2, USDe, user0, mockDistributedPool, yieldDistributor } =
            await loadFixture(deployCoreV2);

        await expect(
            supplyManagerV2.connect(user0).fulfillRedeemRequests(user0, []),
        ).to.be.rejectedWith('ENotAuthorized');
        await expect(supplyManagerV2.connect(user0).distributeYield([], 0)).to.be.rejectedWith(
            'ENotAuthorized',
        );
        await expect(supplyManagerV2.connect(user0).onAddTokenVault(user0)).to.be.rejectedWith(
            'ENotAuthorized',
        );
        await expect(supplyManagerV2.connect(user0).onRemoveTokenVault(user0)).to.be.rejectedWith(
            'ENotAuthorized',
        );
        await expect(supplyManagerV2.connect(user0).setYieldDistributor(user0)).to.be.rejectedWith(
            'OwnableUnauthorizedAccount',
        );
        await expect(supplyManagerV2.setYieldDistributor(ethers.ZeroAddress)).to.be.rejectedWith(
            'EZeroAddress',
        );

        await expect(supplyManagerV2.connect(user0).deposit(user0, 0, 0)).to.be.rejectedWith(
            'TokenVaultNotAllowed',
        );
        await expect(
            supplyManagerV2.connect(user0).requestRedeem(user0, user0, 0, 0),
        ).to.be.rejectedWith('TokenVaultNotAllowed');

        await expect(mockDistributedPool.fulfillRedeemRequests([123n])).to.be.rejectedWith(
            'EUnknownRequest',
        );

        await expect(
            supplyManagerV2.connect(yieldDistributor).distributeYield([], 10_001),
        ).to.be.rejectedWith('EInvalidAPY');

        await expect(
            supplyManagerV2.connect(yieldDistributor).distributeYield([], 1),
        ).to.be.rejectedWith('EEmptyParties');

        await expect(
            supplyManagerV2
                .connect(yieldDistributor)
                .distributeYield([{ user: user0.address, portion: 1 }], 1),
        ).to.be.rejectedWith('ENoRealYield');

        await grantERC20(mockDistributedPool, USDe, 1000, FAUCET.USDe);
        await expect(
            supplyManagerV2
                .connect(yieldDistributor)
                .distributeYield([{ user: user0.address, portion: 1 }], 1n),
        ).to.be.rejectedWith('EWrongPortion');
    });

    it('Front running SupplyManagerV2.fulfillRedeemRequests', async () => {
        const { USDC, user0, mockDistributedPool, tokenUSDCVault, rebaseTokenV2 } =
            await loadFixture(deployCoreV2);

        const depositUSDCValue = 10000n * 10n ** (await USDC.decimals());
        await grantERC20(user0, USDC, depositUSDCValue);
        await USDC.connect(user0).approve(tokenUSDCVault, ethers.MaxUint256);
        await tokenUSDCVault.connect(user0).requestDeposit(depositUSDCValue, user0, user0);

        const requests = [];
        const userShares = await rebaseTokenV2.sharesOf(user0);
        const requestCount = 2;
        for (let i = 0; i < requestCount; ++i) {
            const tx = await tokenUSDCVault
                .connect(user0)
                .requestRedeem(userShares / BigInt(requestCount), user0, user0);
            const redeemUSDCEvent = await findRequestRedeemEventV2(tx);
            requests.push(redeemUSDCEvent.operationId);
        }

        await mockDistributedPool.fulfillRedeemRequests([requests.at(0)!]);
        await mockDistributedPool.fulfillRedeemRequests(requests);
        await expect(mockDistributedPool.fulfillRedeemRequests(requests)).to.be.rejectedWith(
            'ENoPendingRequests',
        );
    });
});

/* eslint-disable camelcase, max-lines */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';

import { expectEqual } from '../../utils/math';
import { deployMrETh, approverSalt, approverSignatureAndExpiry } from '../../utils/mrETH';
import { createValidatorKeys } from '../../utils/sign';

describe('Test mrETH DepositManager', () => {
    describe('General solution tests', () => {
        it('Test request deposit and deposit for WETH', async () => {
            const {
                depositManager,
                rebaseTokenV2,
                tokenVaultWETH,
                owner,
                WETH,
                aWETH,
                withdrawalCredentials,
            } = await loadFixture(deployMrETh);

            // value for request deposit 1 WETH
            const val = 1n * 10n ** 18n;

            expect(await WETH.balanceOf(owner)).to.be.greaterThan(val * 32n);
            expect(await aWETH.balanceOf(depositManager)).to.be.equal(0n);

            await tokenVaultWETH.connect(owner).requestDeposit(val, owner, owner);
            let userShares = await rebaseTokenV2.sharesOf(owner);

            expectEqual(await aWETH.balanceOf(depositManager), val);

            expectEqual(userShares, val);
            expectEqual(await rebaseTokenV2.convertToAssets(userShares), val);

            expect(await aWETH.balanceOf(depositManager)).to.be.equal(val);

            await tokenVaultWETH.requestDeposit(val, owner, owner);

            expect(await aWETH.balanceOf(depositManager)).to.be.greaterThanOrEqual(val * 2n);
            userShares = await rebaseTokenV2.sharesOf(owner);
            expect(userShares).to.be.lessThanOrEqual(val * 2n);
            expect(await rebaseTokenV2.convertToAssets(userShares)).to.be.greaterThanOrEqual(
                val * 2n,
            );

            const { pubkey, signature, depositDataRoot } =
                createValidatorKeys(withdrawalCredentials);

            await tokenVaultWETH.requestDeposit(val * 30n, owner, owner);
            expect(await aWETH.balanceOf(depositManager)).to.be.greaterThanOrEqual(val * 32n);

            await depositManager.stakeNative(val * 32n, pubkey, signature, depositDataRoot);

            expect(await aWETH.balanceOf(depositManager)).to.be.lessThan(val * 32n);
            expect(await aWETH.balanceOf(depositManager)).to.be.greaterThan(0n);

            userShares = await rebaseTokenV2.sharesOf(owner);
            expect(userShares).to.be.lessThan(val * 32n);
        });

        it('Test request deposit and deposit for stETH', async () => {
            const {
                depositManager,
                rebaseTokenV2,
                tokenVaultStETH,
                owner,
                aWETH,
                stETH,
                operator,
            } = await loadFixture(deployMrETh);

            // value for request deposit 1 WETH
            const val = 1n * 10n ** 18n;

            expect(await stETH.balanceOf(owner)).to.be.greaterThan(val * 2n);
            expect(await aWETH.balanceOf(depositManager)).to.be.equal(0n);

            await tokenVaultStETH.connect(owner).requestDeposit(val, owner, owner);
            const userShares = await rebaseTokenV2.sharesOf(owner);
            expectEqual(userShares, val);
            expectEqual(await rebaseTokenV2.convertToAssets(userShares), val);

            expectEqual(await depositManager.totalSupply(), val);

            await depositManager.delegateTo(operator, approverSignatureAndExpiry, approverSalt);

            expectEqual(await depositManager.totalSupply(), val);
        });

        // TO:DO un skip after native currency added to corev2
        it.skip('Test request deposit and deposit for ETH', async () => {
            const { depositManager, rebaseTokenV2, owner, WETH, aWETH, withdrawalCredentials } =
                await loadFixture(deployMrETh);

            // value for request deposit 1 ETH
            const val = 1n * 10n ** 18n;

            expect(await WETH.balanceOf(owner)).to.be.greaterThan(val * 32n);
            expect(await aWETH.balanceOf(depositManager)).to.be.equal(0n);

            // revert deposit amount lower then minDepositValue
            // await expect(tokenVaultStETH.requestDeposit(val, owner, owner, { value: 1n })).to.be
            //     .reverted;
            expect(await aWETH.balanceOf(depositManager)).to.be.equal(0n);
            let userShares = await rebaseTokenV2.sharesOf(owner);
            expect(userShares).to.be.equal(0n);
            expect(await rebaseTokenV2.convertToAssets(userShares)).to.be.equal(0n);

            // await tokenVaultStETH.requestDeposit(val, owner, owner, { value: val });
            expect(await aWETH.balanceOf(depositManager)).to.be.equal(val);
            userShares = await rebaseTokenV2.sharesOf(owner);
            expect(userShares).to.be.lessThanOrEqual(val);
            expect(await rebaseTokenV2.convertToAssets(userShares)).to.be.equal(val);

            // await tokenVaultStETH.requestDeposit(val, owner, owner, { value: val });

            expect(await aWETH.balanceOf(depositManager)).to.be.greaterThan(val * 2n);
            userShares = await rebaseTokenV2.sharesOf(owner);
            expect(userShares).to.be.lessThanOrEqual(val);
            expect(await rebaseTokenV2.convertToAssets(userShares)).to.be.lessThan(2n * val);

            const { pubkey, signature, depositDataRoot } =
                createValidatorKeys(withdrawalCredentials);

            // await tokenVaultStETH.requestDeposit(val * 30n, owner, owner, { value: val * 30n });

            await depositManager.stakeNative(val * 32n, pubkey, signature, depositDataRoot);

            expect(await aWETH.balanceOf(depositManager)).to.be.lessThan(val * 32n);
            expect(await aWETH.balanceOf(depositManager)).to.be.greaterThan(0n);
            userShares = await rebaseTokenV2.sharesOf(owner);
            expect(userShares).to.be.lessThan(val * 32n);
        });

        it('Test add pool into buffer', async () => {
            const {
                depositManager,
                rebaseTokenV2,
                tokenVaultWETH,
                owner,
                WETH,
                aWETH,
                cWETHv3,
                aavePool,
                aaveBufferLib,
                compoundBufferLib,
                withdrawalCredentials,
            } = await loadFixture(deployMrETh);

            // add new pool for buffer
            const newPoolsData = [
                {
                    poolToken: await aWETH.getAddress(),
                    poolLib: await aaveBufferLib.getAddress(),
                    poolPortion: 5_000n,
                    poolId: 0,
                },
                {
                    poolToken: await cWETHv3.getAddress(),
                    poolLib: await compoundBufferLib.getAddress(),
                    poolPortion: 5_000n,
                    poolId: 1,
                },
            ];

            await depositManager.setPools([aavePool, await cWETHv3.getAddress()], newPoolsData, [
                true,
                true,
            ]);
            // value for request deposit 1 WETH
            const val = 1n * 10n ** 18n;

            expect(await WETH.balanceOf(owner)).to.be.greaterThan(val * 32n);

            await tokenVaultWETH.requestDeposit(val, owner, owner);
            expectEqual(await aWETH.balanceOf(depositManager), val / 2n);
            expectEqual(await cWETHv3.balanceOf(depositManager), val / 2n);

            await tokenVaultWETH.requestDeposit(val, owner, owner);
            expect(await aWETH.balanceOf(depositManager)).to.be.greaterThan(val);
            expect(await cWETHv3.balanceOf(depositManager)).to.be.greaterThan(val);

            let userShares = await rebaseTokenV2.sharesOf(owner);
            expect(userShares).to.be.lessThanOrEqual(val * 2n);
            expect(await rebaseTokenV2.convertToAssets(userShares)).to.be.greaterThanOrEqual(
                2n * val,
            );

            const { pubkey, signature, depositDataRoot } =
                createValidatorKeys(withdrawalCredentials);

            await tokenVaultWETH.requestDeposit(val * 30n, owner, owner);
            expect(await aWETH.balanceOf(depositManager)).to.be.greaterThanOrEqual(val * 16n);
            expect(await cWETHv3.balanceOf(depositManager)).to.be.greaterThanOrEqual(val * 16n);

            await depositManager.stakeNative(val * 32n, pubkey, signature, depositDataRoot);

            expect(await aWETH.balanceOf(depositManager)).to.be.lessThan(val * 16n);
            expect(await cWETHv3.balanceOf(depositManager)).to.be.lessThan(val * 16n);
            expect(await aWETH.balanceOf(depositManager)).to.be.greaterThan(0n);
            expect(await cWETHv3.balanceOf(depositManager)).to.be.greaterThan(0n);
            userShares = await rebaseTokenV2.sharesOf(owner);
            expect(userShares).to.be.lessThan(val * 32n);
        });

        it('Test pause and unpause', async () => {
            const { depositManager, tokenVaultWETH, owner, withdrawalCredentials } =
                await loadFixture(deployMrETh);

            // value for request deposit 1 WETH
            const val = 32n * 10n ** 18n;

            await tokenVaultWETH.requestDeposit(val, owner, owner);

            await depositManager.pauseStake();

            const { pubkey, signature, depositDataRoot } =
                createValidatorKeys(withdrawalCredentials);

            await expect(depositManager.stakeNative(val, pubkey, signature, depositDataRoot)).to.be
                .reverted;

            await depositManager.unpauseStake();

            await depositManager.stakeNative(val, pubkey, signature, depositDataRoot);
        });

        it('Test remove pool from buffer', async () => {
            const {
                depositManager,
                tokenVaultWETH,
                owner,
                WETH,
                aWETH,
                cWETHv3,
                aavePool,
                aaveBufferLib,
                compoundBufferLib,
            } = await loadFixture(deployMrETh);

            // add new pool for buffer
            const newPoolsData1 = [
                {
                    poolToken: await aWETH.getAddress(),
                    poolLib: await aaveBufferLib.getAddress(),
                    poolPortion: 5_000n,
                    poolId: 0,
                },
                {
                    poolToken: await cWETHv3.getAddress(),
                    poolLib: await compoundBufferLib.getAddress(),
                    poolPortion: 5_000n,
                    poolId: 1,
                },
            ];

            await depositManager.setPools([aavePool, await cWETHv3.getAddress()], newPoolsData1, [
                true,
                true,
            ]);
            // value for request deposit 1 WETH
            const val = 1n * 10n ** 18n;

            expect(await WETH.balanceOf(owner)).to.be.greaterThan(val * 3n);

            await tokenVaultWETH.requestDeposit(2n * val, owner, owner);
            expectEqual(await aWETH.balanceOf(depositManager), val);
            expectEqual(await cWETHv3.balanceOf(depositManager), val);

            const newPoolsData2 = [
                {
                    poolToken: await aWETH.getAddress(),
                    poolLib: await aaveBufferLib.getAddress(),
                    poolPortion: 10_000n,
                    poolId: 0,
                },
                {
                    poolToken: await cWETHv3.getAddress(),
                    poolLib: await compoundBufferLib.getAddress(),
                    poolPortion: 0n,
                    poolId: 1,
                },
            ];

            await depositManager.setPools([aavePool, await cWETHv3.getAddress()], newPoolsData2, [
                true,
                false,
            ]);
            expect(await aWETH.balanceOf(depositManager)).to.be.greaterThan(val * 2n);
            expect(await cWETHv3.balanceOf(depositManager)).to.be.equal(0n);
        });
    });
});

/* eslint-disable camelcase, max-lines */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { expectEqual } from '../../utils/Common';
import { findDistributeYieldEvent } from '../../utils/event';
import { grantERC20, FAUCET } from '../../utils/grant';
import { deployMrETh, INITIAL_SUPPLY } from '../../utils/mrETH';

describe('Test mrETH RTSupplyManager', () => {
    describe('General solution tests', () => {
        it('Test request deposit and deposit for WETH', async () => {
            const { rtSupplyManager, mrETH, owner, WETH, aWETH } = await loadFixture(deployMrETh);

            // value for request deposit 1 WETH
            const val = 1n * 10n ** 18n;

            expect(await WETH.balanceOf(owner)).to.be.greaterThan(val * 3n);
            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(INITIAL_SUPPLY);

            await mrETH.requestDeposit(val, owner, owner);
            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(INITIAL_SUPPLY + val);

            let shares = await mrETH.sharesOf(owner);
            expect(shares).to.be.lessThanOrEqual(999999999286000000n);
            expect(await mrETH.convertToAssets(shares)).to.be.equal(val - 1n);

            await mrETH.requestDeposit(val, owner, owner);

            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(
                INITIAL_SUPPLY + val * 2n,
            );
            shares = await mrETH.sharesOf(owner);
            expect(shares).to.be.lessThanOrEqual(1999999998215001770n);
            expect(await mrETH.convertToAssets(shares)).to.be.lessThan(2n * val + INITIAL_SUPPLY);

            await rtSupplyManager.deposit(
                val * 2n + INITIAL_SUPPLY,
                '0x01',
                '0x01',
                ethers.zeroPadValue('0x01', 32),
            );

            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(0n);
            shares = await mrETH.sharesOf(owner);
            expect(shares).to.be.lessThanOrEqual(1999999998215001770n);
        });

        it('Test request deposit and deposit for ETH', async () => {
            const { rtSupplyManager, mrETH, owner, WETH, aWETH } = await loadFixture(deployMrETh);

            // value for request deposit 1 ETH
            const val = 1n * 10n ** 18n;

            expect(await WETH.balanceOf(owner)).to.be.greaterThan(val * 3n);
            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(INITIAL_SUPPLY);

            // revert deposit amount lower then minDepositValue
            await expect(mrETH.requestDeposit(val, owner, owner, { value: 1n })).to.be.reverted;
            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(INITIAL_SUPPLY);
            let shares = await mrETH.sharesOf(owner);
            expect(shares).to.be.equal(0n);
            expect(await mrETH.convertToAssets(shares)).to.be.equal(0n);

            await mrETH.requestDeposit(val, owner, owner, { value: val });
            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(INITIAL_SUPPLY + val);
            shares = await mrETH.sharesOf(owner);
            expect(shares).to.be.lessThanOrEqual(999999998930000001n);
            expectEqual(await mrETH.convertToAssets(shares), val, 18n, 17n);

            await mrETH.requestDeposit(val, owner, owner, { value: val });

            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(
                INITIAL_SUPPLY + val * 2n,
            );
            shares = await mrETH.sharesOf(owner);
            expect(shares).to.be.lessThanOrEqual(1999999997503001747n);
            expect(await mrETH.convertToAssets(shares)).to.be.lessThan(2n * val + INITIAL_SUPPLY);

            await rtSupplyManager.deposit(
                val * 2n + INITIAL_SUPPLY,
                '0x01',
                '0x01',
                ethers.zeroPadValue('0x01', 32),
            );

            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(0n);
            shares = await mrETH.sharesOf(owner);
            expect(shares).to.be.lessThanOrEqual(1999999997503001747n);
        });

        it('Test pause and unpause', async () => {
            const { rtSupplyManager, mrETH, owner } = await loadFixture(deployMrETh);

            // value for request deposit 1 WETH
            const val = 1n * 10n ** 18n;

            await expect(rtSupplyManager.requestDeposit(owner, 1, val)).to.be.reverted;
            await mrETH.requestDeposit(val, owner, owner);

            await rtSupplyManager.pauseDeposit();

            await expect(mrETH.requestDeposit(val, owner, owner)).to.be.reverted;

            await expect(
                rtSupplyManager.deposit(val, '0x01', '0x01', ethers.zeroPadValue('0x01', 32)),
            ).to.be.reverted;

            await rtSupplyManager.unpauseDeposit();
            await mrETH.requestDeposit(val, owner, owner);
            await rtSupplyManager.deposit(
                val * 2n + INITIAL_SUPPLY,
                '0x01',
                '0x01',
                ethers.zeroPadValue('0x01', 32),
            );
        });

        it('Test distribute yield', async () => {
            const { rtSupplyManager, mrETH, owner, user0, aWETH } = await loadFixture(deployMrETh);

            // value for request deposit 1 WETH
            const val = 1n * 10n ** 18n;
            await mrETH.requestDeposit(val, owner, owner);

            // income amount
            const income = 10n * 10n ** 18n;

            // generete income
            await grantERC20(owner.address, aWETH, income, FAUCET.aWETH);
            await aWETH.transfer(await rtSupplyManager.getAddress(), income);

            // distribute yield params
            const parties = [
                {
                    party: user0.address,
                    portion: 10n ** 18n,
                },
            ];
            // distribute yield
            const tx = await rtSupplyManager.distributeYield(parties, 5000);
            const distributeEventData = await findDistributeYieldEvent(tx);
            const shares = await distributeEventData.shares[0];
            expect(await mrETH.convertToAssets(shares!)).to.be.greaterThan(6n * 10n ** 18n);
        });

        it('Test add pool into buffer', async () => {
            const {
                rtSupplyManager,
                mrETH,
                owner,
                WETH,
                aWETH,
                cWETHv3,
                aavePool,
                aaveBufferLib,
                compoundBufferLib,
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

            await rtSupplyManager.setPools([aavePool, await cWETHv3.getAddress()], newPoolsData, [
                true,
                true,
            ]);
            // value for request deposit 1 WETH
            const val = 1n * 10n ** 18n;

            expect(await WETH.balanceOf(owner)).to.be.greaterThan(val * 3n);

            await mrETH.requestDeposit(val, owner, owner);
            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(
                (INITIAL_SUPPLY + val) / 2n,
            );
            expect(await cWETHv3.balanceOf(rtSupplyManager)).to.be.greaterThan(
                (INITIAL_SUPPLY + val) / 2n,
            );

            await mrETH.requestDeposit(val, owner, owner);
            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(
                INITIAL_SUPPLY / 2n + val,
            );
            expect(await cWETHv3.balanceOf(rtSupplyManager)).to.be.greaterThan(
                INITIAL_SUPPLY / 2n + val,
            );

            let shares = await mrETH.sharesOf(owner);
            expect(shares).to.be.lessThanOrEqual(1999999997503001747n);
            expect(await mrETH.convertToAssets(shares)).to.be.lessThan(2n * val + INITIAL_SUPPLY);

            await rtSupplyManager.deposit(
                val * 2n,
                '0x01',
                '0x01',
                ethers.zeroPadValue('0x01', 32),
            );

            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(0n);
            expect(await cWETHv3.balanceOf(rtSupplyManager)).to.be.greaterThan(0n);
            shares = await mrETH.sharesOf(owner);
            expect(shares).to.be.lessThanOrEqual(1999999997503001747n);
        });

        it('Test remove pool from buffer', async () => {
            const {
                rtSupplyManager,
                mrETH,
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

            await rtSupplyManager.setPools([aavePool, await cWETHv3.getAddress()], newPoolsData1, [
                true,
                true,
            ]);
            // value for request deposit 1 WETH
            const val = 1n * 10n ** 18n;

            expect(await WETH.balanceOf(owner)).to.be.greaterThan(val * 3n);

            await mrETH.requestDeposit(2n * val, owner, owner);
            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(
                INITIAL_SUPPLY / 2n + val,
            );
            expect(await cWETHv3.balanceOf(rtSupplyManager)).to.be.greaterThan(
                INITIAL_SUPPLY / 2n + val,
            );

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

            await rtSupplyManager.setPools([aavePool, await cWETHv3.getAddress()], newPoolsData2, [
                true,
                false,
            ]);
            expect(await aWETH.balanceOf(rtSupplyManager)).to.be.greaterThan(
                INITIAL_SUPPLY + val * 2n,
            );
            expect(await cWETHv3.balanceOf(rtSupplyManager)).to.be.equal(0n);
        });
    });
});

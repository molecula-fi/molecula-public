/* eslint-disable camelcase, max-lines */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { INITIAL_SUPPLY } from '../../utils/Carbon';
import { deployNitrogenV11WithUSDT } from '../../utils/NitrogenCommonV1.1';
import { findRequestRedeemEvent } from '../../utils/event';
import { grantERC20 } from '../../utils/grant';

describe('Test Nitrogen SupplyManger totalSupply and reverts', () => {
    describe('Test Supply Manager pool reduce without income', () => {
        it('Should set the right owner', async () => {
            const { moleculaPool, supplyManager, agent, poolOwner } =
                await loadFixture(deployNitrogenV11WithUSDT);

            expect(await moleculaPool.owner()).to.equal(await poolOwner.getAddress());
            expect(await supplyManager.owner()).to.equal(await poolOwner.getAddress());
            expect(await agent.owner()).to.equal(await poolOwner.getAddress());
            expect(await moleculaPool.totalSupply()).to.equal(100n * 10n ** 18n);
            expect(await supplyManager.totalSupply()).to.equal(100n * 10n ** 18n);
        });
        it('SupplyManager.totalSupply()', async () => {
            const { moleculaPool, supplyManager, rebaseToken, agent, user0, USDT } =
                await loadFixture(deployNitrogenV11WithUSDT);

            // generate income. make x2 share price.
            const income = 250_000_000n;
            await grantERC20(await moleculaPool.poolKeeper(), USDT, income);
            expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY);

            // deposit 100 USDT
            const depositValue = 100_000_000n;
            // Grant user wallet with 100 USDT and 2 ETH
            await grantERC20(user0, USDT, depositValue);
            expect(await USDT.balanceOf(user0)).to.equal(depositValue);
            expect(await USDT.balanceOf(await moleculaPool.poolKeeper())).to.equal(income);

            // approve USDT to agent
            await USDT.connect(user0).approve(await agent.getAddress(), depositValue);

            // user0 calls requestDeposit on rebaseToken
            await rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0);
            const shares = (depositValue / 2n) * 10n ** 12n;
            const value18 = depositValue * 10n ** 12n;
            expect(await USDT.balanceOf(user0)).to.equal(0);
            expect(await USDT.balanceOf(await moleculaPool.poolKeeper())).to.equal(income);
            expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 2n);
            expect(await supplyManager.totalSharesSupply()).to.equal(INITIAL_SUPPLY + value18);
            expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY + value18);
            expect(await rebaseToken.balanceOf(user0)).to.equal(value18);
            expect(await rebaseToken.sharesOf(user0)).to.equal(value18);

            // user asks for redeem
            const redeemShares = shares;
            const tx = await rebaseToken.connect(user0).requestRedeem(redeemShares, user0, user0);
            const eventData = await findRequestRedeemEvent(tx);

            expect(eventData.agentAddress).to.equal(await agent.getAddress());
            expect(eventData.redeemShares).to.equal(redeemShares);
            expect(eventData.redeemValue).to.equal(depositValue / 2n);
            expect(await USDT.balanceOf(user0)).to.equal(0);
            expect(await USDT.balanceOf(await moleculaPool.poolKeeper())).to.equal(income);

            // 20% shares check for lockedYieldShares
            // expect(
            //     (await supplyManager.totalSharesSupply()) /
            //         (await supplyManager.lockedYieldShares()),
            // ).to.equal(100n / 20n);

            expect(await supplyManager.totalSupply()).to.equal((INITIAL_SUPPLY * 150n) / 100n);
            expect(await supplyManager.totalSharesSupply()).to.equal(
                (INITIAL_SUPPLY * 150n) / 100n,
            );
            expect(await moleculaPool.totalSupply()).to.equal((INITIAL_SUPPLY * 150n) / 100n);
            expect(await rebaseToken.balanceOf(user0)).to.equal(shares);
            expect(await rebaseToken.sharesOf(user0)).to.equal(shares);
        });
    });
    describe('Test Supply Manager reverts', () => {
        it('Should correct modifiers revert', async () => {
            const { supplyManager, agent, poolOwner, user1 } =
                await loadFixture(deployNitrogenV11WithUSDT);

            await expect(
                supplyManager.connect(user1).deposit(user1.address, 0n, 0n),
            ).to.be.rejectedWith('ENotMyAgent()');

            await expect(
                supplyManager.connect(user1).requestRedeem(user1.address, 0n, 0n),
            ).to.be.rejectedWith('ENotMyAgent()');

            await expect(
                supplyManager.connect(user1).redeem(user1.address, [0n]),
            ).to.be.rejectedWith('ENotMoleculaPool()');

            await expect(
                supplyManager.connect(user1).setAgent(user1.address, true),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');

            // Distribute yield params
            const party = {
                parties: [
                    {
                        party: poolOwner,
                        portion: 500n * 10n ** 15n,
                    },
                    {
                        party: user1,
                        portion: 500n * 10n ** 15n,
                    },
                ],
                agent,
                ethValue: 0n,
            };
            // Distribute yield reverted with out of gas for array 500 users
            await expect(
                supplyManager.connect(user1).distributeYield([party], 4000),
            ).to.be.rejectedWith('ENotAuthorizedYieldDistributor()');
        });

        it('Should correct set authorizedYieldDistributor', async () => {
            const { supplyManager, poolOwner, user1 } =
                await loadFixture(deployNitrogenV11WithUSDT);

            await expect(
                supplyManager.connect(user1).setMoleculaPool(user1.address),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');

            await expect(supplyManager.setMoleculaPool(ethers.ZeroAddress)).to.be.rejectedWith(
                'EZeroAddress()',
            );

            await expect(
                supplyManager.connect(user1).setAuthorizedYieldDistributor(user1.address),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');

            await expect(
                supplyManager.setAuthorizedYieldDistributor(ethers.ZeroAddress),
            ).to.be.rejectedWith('EZeroAddress()');

            expect(await supplyManager.authorizedYieldDistributor()).to.be.equal(poolOwner.address);
            await supplyManager.setAuthorizedYieldDistributor(user1);
            expect(await supplyManager.authorizedYieldDistributor()).to.be.equal(user1.address);
        });

        it('Should validate parties', async () => {
            const { supplyManager, agent, user0 } = await loadFixture(deployNitrogenV11WithUSDT);

            // create agentInfo variables for test validation parties
            const party_0 = {
                parties: [
                    {
                        party: user0,
                        portion: 10n ** 18n,
                    },
                ],
                agent: user0,
                ethValue: 0n,
            };

            // distribute yield params
            const party_1 = {
                parties: [
                    {
                        party: user0,
                        portion: 10n ** 18n,
                    },
                ],
                agent,
                ethValue: 0n,
            };
            // distribute yield params
            const party_2 = {
                parties: [
                    {
                        party: user0,
                        portion: 10n ** 18n,
                    },
                ],
                agent,
                ethValue: 0n,
            };

            // error empty array
            await expect(supplyManager.distributeYield([], 4000)).to.be.rejectedWith(
                'EEmptyParties()',
            );

            // error in two different parties the same agents
            await expect(
                supplyManager.distributeYield([party_1, party_2], 4000),
            ).to.be.rejectedWith('EDuplicateAgent()');

            await expect(
                supplyManager.distributeYield([party_0, party_1, party_2], 4000),
            ).to.be.rejectedWith('EWrongAgent()');
        });
    });
});

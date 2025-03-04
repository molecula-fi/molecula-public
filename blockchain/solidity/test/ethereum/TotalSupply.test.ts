/* eslint-disable camelcase, max-lines */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { deployNitrogen } from '../utils/NitrogenCommon';
import { INITIAL_SUPPLY } from '../utils/deployCarbon';
import { findRequestRedeemEvent } from '../utils/event';
import { grantERC20 } from '../utils/grant';

describe('Test Nitrogen SupplyManger totalSupply and reverts', () => {
    describe('Test Supply Manager pool reduce without income', () => {
        it('Should set the right owner', async () => {
            const { moleculaPool, supplyManager, agent, poolOwner } =
                await loadFixture(deployNitrogen);

            expect(await moleculaPool.owner()).to.equal(await poolOwner.getAddress());
            expect(await supplyManager.owner()).to.equal(await poolOwner.getAddress());
            expect(await agent.owner()).to.equal(await poolOwner.getAddress());
            expect(await moleculaPool.totalSupply()).to.equal(100_000_000_000_000_000_000n);
            expect(await supplyManager.totalSupply()).to.equal(100_000_000_000_000_000_000n);
        });
        it('SupplyManager.totalSupply()', async () => {
            const { moleculaPool, supplyManager, rebaseToken, agent, user0, USDT } =
                await loadFixture(deployNitrogen);

            // generate income. make x2 share price.
            const income = 250_000_000n;
            const income18 = income * 10n ** 12n;
            await grantERC20(await moleculaPool.poolKeeper(), USDT, income);
            expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 2n);

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
            expect(await USDT.balanceOf(await moleculaPool.poolKeeper())).to.equal(
                income + depositValue,
            );
            expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 3n);
            expect(await supplyManager.totalSharesSupply()).to.equal(INITIAL_SUPPLY + shares);
            expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY + income18 + value18);
            expect(await rebaseToken.balanceOf(user0)).to.equal(value18);
            expect(await rebaseToken.sharesOf(user0)).to.equal(shares);

            // user asks for redeem
            const redeemShares = shares;
            const tx = await rebaseToken.connect(user0).requestRedeem(redeemShares, user0, user0);
            const eventData = await findRequestRedeemEvent(tx);

            expect(eventData.agentAddress).to.equal(await agent.getAddress());
            expect(eventData.redeemShares).to.equal(redeemShares);
            expect(eventData.redeemValue).to.equal(depositValue);
            expect(await USDT.balanceOf(user0)).to.equal(0);
            expect(await USDT.balanceOf(await moleculaPool.poolKeeper())).to.equal(
                income + depositValue,
            );

            // 20% shares check for lockedYieldShares
            expect(
                (await supplyManager.totalSharesSupply()) /
                    (await supplyManager.lockedYieldShares()),
            ).to.equal(100n / 20n);

            expect(await supplyManager.totalSupply()).to.equal((INITIAL_SUPPLY * 2n * 125n) / 100n);
            expect(await supplyManager.totalSharesSupply()).to.equal(
                (INITIAL_SUPPLY * 125n) / 100n,
            );
            expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY + income18);
            expect(await rebaseToken.balanceOf(user0)).to.equal(0);
            expect(await rebaseToken.sharesOf(user0)).to.equal(0);
        });
    });
    describe('Test Supply Manager reverts', () => {
        it('Should correct modifiers revert', async () => {
            const { supplyManager, agent, poolOwner, user1 } = await loadFixture(deployNitrogen);

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
                        portion: 500_000_000_000_000_000n,
                    },
                    {
                        party: user1,
                        portion: 500_000_000_000_000_000n,
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
            const { supplyManager, poolOwner, user1 } = await loadFixture(deployNitrogen);

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

        it('Should did not accept to redeem with different agents in one requestIds array', async () => {
            const { moleculaPool, supplyManager, rebaseToken, agent, user0, poolOwner, USDT } =
                await loadFixture(deployNitrogen);

            // deposit 100 USDT
            const depositValue = 100_000_000n;
            // Grant user wallet with 100 USDT and 2 ETH
            await grantERC20(user0, USDT, depositValue * 2n);

            // approve USDT to agent
            await USDT.connect(user0).approve(await agent.getAddress(), depositValue * 2n);

            // owner call requestDeposit on rebaseToken
            await rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0);

            // generate income. make x2 share price.
            // User get 40% of the income
            const income = 500_000_000n;
            await grantERC20(await moleculaPool.poolKeeper(), USDT, income);

            // user ask for redeem
            const redeemShares = await rebaseToken.sharesOf(user0);
            const tx = await rebaseToken.connect(user0).requestRedeem(redeemShares, user0, user0);
            const eventData = await findRequestRedeemEvent(tx);

            const { operationId } = eventData;

            await supplyManager.setAgent(user0, true);

            // owner call second time requestDeposit on rebaseToken
            await rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0);

            // user1 ask for redeem
            const redeemShares_1 = await rebaseToken.sharesOf(user0);
            await supplyManager
                .connect(user0)
                .requestRedeem(ethMainnetBetaConfig.USDT_ADDRESS, 1n, redeemShares_1);

            const operationId_1 = 1;

            // redeem call with incorrect operationId status
            await expect(moleculaPool.connect(poolOwner).redeem([0n])).to.be.rejectedWith(
                'EBadOperationStatus()',
            );

            // owner call redeem
            await expect(
                moleculaPool.connect(poolOwner).redeem([operationId, operationId_1]),
            ).to.be.rejectedWith('EWrongAgent()');
        });

        it('Should correct add and delete agent', async () => {
            const { supplyManager, agent, user0, user1 } = await loadFixture(deployNitrogen);

            // add agents
            await supplyManager.setAgent(user0, true);
            await supplyManager.setAgent(user1, true);

            // should did not allow to duplicate setting agent
            await expect(supplyManager.setAgent(user0, true)).to.be.rejectedWith(
                'EAgentStatusIsAlreadySet()',
            );

            // check for correct adding agents
            let agentsArray = await supplyManager.getAgents();
            expect(agentsArray[0]).to.be.equal(agent);
            expect(agentsArray[1]).to.be.equal(user0);
            expect(agentsArray[2]).to.be.equal(user1);
            expect(await supplyManager.agents(agent)).to.be.equal(true);
            expect(await supplyManager.agents(user0)).to.be.equal(true);
            expect(await supplyManager.agents(user1)).to.be.equal(true);

            // should correctly delete agent
            await supplyManager.setAgent(user0, false);
            agentsArray = await supplyManager.getAgents();
            expect(agentsArray[0]).to.be.equal(agent);
            expect(agentsArray[1]).to.be.equal(user1);
            expect(await supplyManager.agents(agent)).to.be.equal(true);
            expect(await supplyManager.agents(user0)).to.be.equal(false);
            expect(await supplyManager.agents(user1)).to.be.equal(true);
        });

        it('Should validate parties', async () => {
            const { supplyManager, agent, user0, user1 } = await loadFixture(deployNitrogen);

            // create agentInfo variables for test validation parties
            const party_0 = {
                parties: [
                    {
                        party: user0,
                        portion: 1_000_000_000_000_000_000n,
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
                        portion: 1_000_000_000_000_000_000n,
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
                        portion: 1_000_000_000_000_000_000n,
                    },
                ],
                agent,
                ethValue: 0n,
            };

            const party_3 = {
                parties: [
                    {
                        party: user0,
                        portion: 1_000_000_000_000_000_000n,
                    },
                ],
                agent: user1,
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

            // add two new agents to supplyManager
            await supplyManager.setAgent(user0, true);
            await supplyManager.setAgent(user1, true);

            await expect(
                supplyManager.distributeYield([party_0, party_1, party_2], 4000),
            ).to.be.rejectedWith('EDuplicateAgent()');

            await expect(
                supplyManager.distributeYield([party_0, party_1, party_2], 4000),
            ).to.be.rejectedWith('EDuplicateAgent()');

            await expect(
                supplyManager.distributeYield([party_0, party_1, party_3], 4000),
            ).to.be.rejectedWith('EWrongPortion()');
        });
    });
});

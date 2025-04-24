/* eslint-disable camelcase, max-lines, no-await-in-loop, no-restricted-syntax, no-bitwise */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import type { EVMAddress, PoolData } from '@molecula-monorepo/blockchain.addresses';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { getEthena, grantUSDe, grantStakedUSDE } from '../utils/Common';
import {
    deployMoleculaPool,
    deployNitrogen,
    deployMoleculaPoolAndSupplyManager,
} from '../utils/NitrogenCommon';
import { INITIAL_SUPPLY } from '../utils/deployCarbon';
import { findRequestRedeemEvent } from '../utils/event';
import { grantERC20 } from '../utils/grant';
import { signERC2612Permit } from '../utils/sign';

const APY_FACTOR = 10_000;

describe('Test Nitrogen solution', () => {
    describe('General solution tests', () => {
        it('Should set the right owner', async () => {
            const { moleculaPool, supplyManager, agent, rebaseToken, poolOwner, rebaseTokenOwner } =
                await loadFixture(deployNitrogen);

            expect(await moleculaPool.owner()).to.equal(await poolOwner.getAddress());
            expect(await supplyManager.owner()).to.equal(await poolOwner.getAddress());
            expect(await agent.owner()).to.equal(await poolOwner.getAddress());
            expect(await rebaseToken.owner()).to.equal(rebaseTokenOwner.address);
            expect(await moleculaPool.totalSupply()).to.equal(100n * 10n ** 18n);
            expect(await supplyManager.totalSupply()).to.equal(100n * 10n ** 18n);
            expect(await supplyManager.getTotalPoolSupply()).to.equal(100n * 10n ** 18n);
        });

        it('Deposit and Income Flow', async () => {
            const {
                moleculaPool,
                supplyManager,
                rebaseToken,
                agent,
                user0,
                user1,
                poolOwner,
                USDT,
                poolKeeper,
            } = await loadFixture(deployNitrogen);
            // deposit 100 USDT
            const depositValue = 100_000_000n;
            // Grant user wallet with 100 USDT and 2 ETH
            await grantERC20(user0, USDT, depositValue);
            expect(await USDT.balanceOf(user0)).to.equal(depositValue);
            expect(await USDT.balanceOf(await moleculaPool.poolKeeper())).to.equal(0n);

            // approve USDT to agent
            await USDT.connect(user0).approve(await agent.getAddress(), depositValue);

            await expect(
                rebaseToken.connect(user0).requestDeposit(0n, user0, user0),
            ).to.be.rejectedWith('ETooLowDepositValue(10000000)');

            // owner call requestDeposit on rebaseToken
            await rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0);
            const shares = depositValue * 10n ** 12n;
            expect(await USDT.balanceOf(user0)).to.equal(0);
            expect(await USDT.balanceOf(await moleculaPool.poolKeeper())).to.equal(depositValue);
            expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 2n);
            expect(await supplyManager.totalSharesSupply()).to.equal(INITIAL_SUPPLY * 2n);
            expect(await supplyManager.getTotalSharesSupply()).to.equal(INITIAL_SUPPLY * 2n);
            expect(await rebaseToken.balanceOf(user0)).to.equal(depositValue * 10n ** 12n);
            expect(await rebaseToken.sharesOf(user0)).to.equal(shares);
            expect(await rebaseToken.totalSupply()).to.be.equal(INITIAL_SUPPLY * 2n);
            expect(await rebaseToken.totalSharesSupply()).to.be.equal(INITIAL_SUPPLY * 2n);

            // generate income. make x2 share price.
            // User get 40% of the income
            const income = 500_000_000n;
            await grantERC20(await moleculaPool.poolKeeper(), USDT, income);
            expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY * 7n);
            expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 4n);
            expect(await supplyManager.totalSharesSupply()).to.equal(INITIAL_SUPPLY * 2n);
            expect(await rebaseToken.totalSupply()).to.be.equal(INITIAL_SUPPLY * 4n);
            expect(await rebaseToken.totalSharesSupply()).to.be.equal(INITIAL_SUPPLY * 2n);
            expect(await rebaseToken.balanceOf(user0)).to.equal(depositValue * 2n * 10n ** 12n);
            expect(await rebaseToken.sharesOf(user0)).to.equal(shares);

            // Grant user1 wallet with 100 USDT and 2 ETH
            await grantERC20(user1, USDT, depositValue);
            expect(await USDT.balanceOf(user1)).to.equal(depositValue);
            expect(await supplyManager.totalDepositedSupply()).to.equal(INITIAL_SUPPLY * 2n);

            // approve USDT to agent
            await USDT.connect(user1).approve(await agent.getAddress(), depositValue);

            // user0 calls requestDeposit on rebaseToken
            await rebaseToken.connect(user1).requestDeposit(depositValue, user1, user1);
            const secondShares = (depositValue * 10n ** 12n) / 2n;
            expect(await USDT.balanceOf(await agent.getAddress())).to.equal(0);
            expect(await USDT.balanceOf(await moleculaPool.poolKeeper())).to.equal(
                depositValue * 2n + income,
            );
            expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 5n);
            expect(await supplyManager.totalSharesSupply()).to.equal(
                INITIAL_SUPPLY + shares + secondShares,
            );
            expect(await rebaseToken.totalSupply()).to.be.equal(INITIAL_SUPPLY * 5n);
            expect(await rebaseToken.totalSharesSupply()).to.be.equal(
                INITIAL_SUPPLY + shares + secondShares,
            );
            expect(await rebaseToken.balanceOf(user0)).to.equal(depositValue * 2n * 10n ** 12n);
            expect(await rebaseToken.sharesOf(user0)).to.equal(shares);
            expect(await rebaseToken.balanceOf(user1)).to.equal(depositValue * 10n ** 12n);
            expect(await rebaseToken.sharesOf(user1)).to.equal(secondShares);

            expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY * 8n);
            expect(await supplyManager.totalDepositedSupply()).to.equal(INITIAL_SUPPLY * 3n);
            // check molecula pool
            expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY * 8n);
            expect(await supplyManager.totalSupply()).to.equal(
                (await supplyManager.totalSharesSupply()) * 2n,
            );

            expect(await supplyManager.lockedYieldShares()).to.equal(0n);

            // user asks for redeem
            const redeemShares = await rebaseToken.sharesOf(user0);
            let tx = await rebaseToken.connect(user0).requestRedeem(redeemShares, user0, user0);
            let eventData = await findRequestRedeemEvent(tx);

            const { operationId } = eventData;
            expect(eventData.agentAddress).to.equal(await agent.getAddress());
            expect(eventData.redeemShares).to.equal(redeemShares);
            expect(eventData.redeemValue).to.equal(depositValue * 2n);
            const { redeemValue } = eventData;
            expect(await rebaseToken.balanceOf(user0)).to.equal(0);
            expect(await rebaseToken.sharesOf(user0)).to.equal(0);
            expect(await rebaseToken.balanceOf(user1)).to.equal(depositValue * 10n ** 12n);
            expect(await rebaseToken.sharesOf(user1)).to.equal(secondShares);
            expect(await rebaseToken.pendingRedeemRequest(operationId, user0)).to.be.equal(
                redeemShares,
            );
            expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY * 6n);
            expect(await moleculaPool.valueToRedeem()).to.equal(INITIAL_SUPPLY * 2n);
            expect(await supplyManager.totalSupply()).to.equal(420n * 10n ** 18n);
            expect(await supplyManager.totalSharesSupply()).to.equal(
                INITIAL_SUPPLY + secondShares + 60n * 10n ** 18n,
            );
            expect(await supplyManager.totalSupply()).to.equal(
                (await supplyManager.totalSharesSupply()) * 2n,
            );
            expect(await supplyManager.totalDepositedSupply()).to.equal(INITIAL_SUPPLY * 3n);

            // user1 ask for redeem
            const redeemShares_1 = await rebaseToken.sharesOf(user1);
            tx = await rebaseToken.connect(user1).requestRedeem(redeemShares_1, user1, user1);
            eventData = await findRequestRedeemEvent(tx);

            const operationId_1 = eventData.operationId;
            expect(eventData.agentAddress).to.equal(await agent.getAddress());
            expect(eventData.redeemShares).to.equal(redeemShares_1);
            expect(eventData.redeemValue).to.equal(depositValue);
            const redeemValue_1 = eventData.redeemValue;
            expect(await rebaseToken.balanceOf(user1)).to.equal(0);
            expect(await rebaseToken.sharesOf(user1)).to.equal(0);
            expect(await supplyManager.totalSupply()).to.equal(362857142857142857142n);
            expect(await supplyManager.totalSharesSupply()).to.equal(181428571428571428571n);
            expect(await supplyManager.totalSupply()).to.equal(
                (await supplyManager.totalSharesSupply()) * 2n,
            );

            // check molecula pool
            expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY * 5n);
            expect(await USDT.balanceOf(poolKeeper)).to.equal(700_000_000n);
            const DAI = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.DAI_ADDRESS);
            expect(await DAI.balanceOf(poolKeeper)).to.equal(INITIAL_SUPPLY);

            // redeem to user and user1
            // approve USDT to Agent for redeem
            await USDT.connect(poolKeeper).approve(
                await agent.getAddress(),
                redeemValue + redeemValue_1,
            );

            // redeem call with incorrect operationId status
            await expect(moleculaPool.connect(poolOwner).redeem([0n])).to.be.rejectedWith(
                'EBadOperationStatus()',
            );

            await expect(
                moleculaPool.connect(poolOwner).redeem([operationId, operationId_1], { value: 1n }),
            ).to.be.rejectedWith('EMsgValueIsNotZero()');

            // user0 call redeem
            tx = await moleculaPool.connect(poolOwner).redeem([operationId, operationId_1]);
            await ethers.provider.getTransactionReceipt(tx.hash);
            // Check event
            await expect(tx).to.emit(rebaseToken, 'Redeem');
            // check molecula pool
            expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY * 5n);
            expect(await USDT.balanceOf(poolKeeper)).to.equal(400_000_000n);
            expect(await DAI.balanceOf(poolKeeper)).to.equal(INITIAL_SUPPLY);
            // check redeem requests
            expect((await rebaseToken.redeemRequests(operationId)).status).to.equal(4);
            expect((await rebaseToken.redeemRequests(operationId)).val).to.equal(redeemValue);
            expect(await USDT.balanceOf(agent.getAddress())).to.equal(redeemValue + redeemValue_1);
            expect(await USDT.balanceOf(user0)).to.equal(0n);
            expect((await rebaseToken.redeemRequests(operationId_1)).status).to.equal(4);
            expect((await rebaseToken.redeemRequests(operationId_1)).val).to.equal(redeemValue_1);
            expect(await USDT.balanceOf(user1)).to.equal(0n);
            // check supply manager
            expect(await supplyManager.totalSupply()).to.equal(362857142857142857142n);
            expect(await supplyManager.totalSharesSupply()).to.equal(181428571428571428571n);
            expect(await supplyManager.totalSupply()).to.equal(
                (await supplyManager.totalSharesSupply()) * 2n,
            );

            // anyone call confirmRedeem for user
            await rebaseToken.connect(user1).confirmRedeem(operationId);
            expect((await rebaseToken.redeemRequests(operationId)).status).to.equal(2);
            expect((await rebaseToken.redeemRequests(operationId)).val).to.equal(redeemValue);
            expect(await USDT.balanceOf(agent.getAddress())).to.equal(redeemValue_1);
            expect(await USDT.balanceOf(user0)).to.equal(redeemValue);

            // anyone call confirmRedeem for user1
            await rebaseToken.connect(user1).confirmRedeem(operationId_1);
            expect((await rebaseToken.redeemRequests(operationId_1)).status).to.equal(2);
            expect((await rebaseToken.redeemRequests(operationId_1)).val).to.equal(redeemValue_1);
            expect(await USDT.balanceOf(agent.getAddress())).to.equal(0);
            expect(await USDT.balanceOf(user1)).to.equal(redeemValue_1);

            // check supply manager
            expect(await supplyManager.totalSupply()).to.equal(362857142857142857142n);
            expect(await supplyManager.totalSharesSupply()).to.equal(181428571428571428571n);
        });

        it('Test requestDeposit for user0 (not for msg.sender)', async () => {
            const {
                poolOwner,
                moleculaPool,
                rebaseToken,
                agent,
                user0,
                caller,
                malicious,
                controller,
                USDT,
                poolKeeper,
            } = await loadFixture(deployNitrogen);
            // deposit 100 USDT
            const depositValue = 100_000_000n;
            // Grant userAgent wallet with 100 USDT and 2 ETH
            await grantERC20(user0, USDT, depositValue);
            expect(await USDT.balanceOf(user0)).to.equal(depositValue);
            expect(await USDT.balanceOf(await moleculaPool.poolKeeper())).to.equal(0n);

            // Malicious user failed to make requestDeposit
            await expect(
                rebaseToken.connect(malicious).requestDeposit(depositValue, user0, user0),
            ).to.be.rejectedWith('EBadOwner');
            expect(await rebaseToken.sharesOf(malicious)).to.equal(0);

            // Owner approves USDT for agent
            await USDT.connect(user0).approve(await agent.getAddress(), depositValue);
            // Controller is caller operator
            await rebaseToken.connect(user0).setOperator(caller, true);
            expect(await rebaseToken.isOperator(user0, caller)).to.equal(true);

            // Owner calls requestDeposit on rebaseToken
            await rebaseToken.connect(caller).requestDeposit(depositValue, controller, user0);
            const shares = depositValue * 10n ** 12n;
            expect(await USDT.balanceOf(user0)).to.equal(0);
            expect(await rebaseToken.sharesOf(caller)).to.equal(0);
            expect(await rebaseToken.sharesOf(user0)).to.equal(0);
            expect(await rebaseToken.sharesOf(controller)).to.equal(shares);

            // Controller grants mUSD to user0
            await rebaseToken.connect(controller).transfer(user0, shares);
            expect(await rebaseToken.sharesOf(controller)).to.equal(0);
            expect(await rebaseToken.sharesOf(user0)).to.equal(shares);

            // Caller asks for redeem
            const redeemShares = await rebaseToken.sharesOf(user0);
            const tx = await rebaseToken
                .connect(caller)
                .requestRedeem(redeemShares, controller, user0);
            const eventData = await findRequestRedeemEvent(tx);

            const { operationId } = eventData;
            expect(eventData.agentAddress).to.equal(await agent.getAddress());
            expect(eventData.redeemShares).to.equal(redeemShares);
            expect(eventData.redeemValue).to.equal(depositValue);
            const { redeemValue } = eventData;
            expect(await rebaseToken.balanceOf(user0)).to.equal(0);
            expect(await rebaseToken.sharesOf(caller)).to.equal(0);
            expect(await USDT.balanceOf(caller)).to.equal(0);
            expect(await USDT.balanceOf(user0)).to.equal(0);

            await USDT.connect(poolKeeper).approve(await agent.getAddress(), redeemValue);
            await moleculaPool.connect(poolOwner).redeem([operationId]);
            // Anyone can call confirmRedeem
            await rebaseToken.connect(malicious).confirmRedeem(operationId);

            // Controller got their USDT
            expect(await USDT.balanceOf(controller)).to.equal(depositValue);
            expect(await USDT.balanceOf(caller)).to.equal(0);
            expect(await USDT.balanceOf(user0)).to.equal(0);
        });
        it('Distribute yield', async () => {
            const { supplyManager, agent, user1, rebaseToken, malicious, poolKeeper } =
                await loadFixture(deployNitrogen);

            const val = 100n * 10n ** 18n;
            expect(await supplyManager.totalSupply()).to.equal(val);
            expect(await supplyManager.totalSharesSupply()).to.equal(val);
            const DAI = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.DAI_ADDRESS);

            // generate income
            await grantERC20(poolKeeper, DAI, val);

            expect(await supplyManager.totalSupply()).to.equal(140n * 10n ** 18n);
            expect(await supplyManager.totalSharesSupply()).to.equal(val);

            // Get user1 balance
            const balance = await rebaseToken.balanceOf(user1);
            expect(balance).to.equal(0n);

            // distribute yield params
            const party = {
                parties: [
                    {
                        party: user1,
                        portion: 10n ** 18n,
                    },
                ],
                agent,
                ethValue: 0n,
            };
            // distribute yield
            await supplyManager.distributeYield([party], 5000);

            expect(await supplyManager.apyFormatter()).to.equal(5000);
            expect(await rebaseToken.balanceOf(user1)).to.equal(59999999999999999999n);
            expect(await supplyManager.totalSupply()).to.equal(200n * 10n ** 18n);
            expect(await supplyManager.totalSharesSupply()).to.equal(142857142857142857142n);

            await expect(agent.connect(malicious).distribute([], [])).to.be.rejectedWith(
                'EBadSender()',
            );
        });
    });

    describe('Test special cases', () => {
        it('Should be MOLECULA_POOL.totalSupply > 0', async () => {
            const { moleculaPool, poolOwner } = await loadFixture(deployMoleculaPool);

            // deploy supply manager
            const SupplyManager = await ethers.getContractFactory('SupplyManager');
            // Failed to deploy supply manager
            await expect(
                SupplyManager.connect(poolOwner).deploy(
                    poolOwner.address,
                    poolOwner.address,
                    await moleculaPool.getAddress(),
                    4000,
                ),
            ).to.be.rejectedWith('EZeroTotalSupply()');
        });

        it('Check duplicated pools', async () => {
            const { moleculaPool, poolOwner, poolKeeper, USDT } =
                await loadFixture(deployMoleculaPool);
            const token = ethMainnetBetaConfig.USDT_ADDRESS;
            const token2 = ethMainnetBetaConfig.USDC_ADDRESS;

            await moleculaPool.connect(poolOwner).addPool20(token, 8);
            await expect(moleculaPool.connect(poolOwner).addPool20(token, 8)).to.be.rejectedWith(
                'EDuplicatedToken()',
            );
            await expect(moleculaPool.connect(poolOwner).setPool20(0, token, 8)).to.be.rejectedWith(
                'EDuplicatedToken()',
            );
            await expect(
                moleculaPool.connect(poolOwner).setPool20(1, token2, 8),
            ).to.be.rejectedWith('EBadIndex()');

            await moleculaPool.connect(poolOwner).setPool20(0, token2, 8);
            const { exist } = await moleculaPool.connect(poolOwner).pools20Map(token);
            expect(exist).to.equal(false);

            // Check that pool is empty
            await expect(moleculaPool.connect(poolOwner).removePool20(100)).to.be.rejectedWith(
                'EBadIndex()',
            );
            await moleculaPool.connect(poolOwner).removePool20(0);
            await expect(moleculaPool.connect(poolOwner).pools20(0)).to.be.rejected;

            await moleculaPool.connect(poolOwner).addPool20(USDT, 6);
            await grantERC20(poolKeeper, USDT, 100_000_000n);
            await expect(moleculaPool.connect(poolOwner).removePool20(0)).to.be.rejectedWith(
                'ENotZeroBalanceOfRemovedToken()',
            );
        });

        it('Check duplicated pools 4626', async () => {
            const { moleculaPool, poolOwner, poolKeeper, USDT } =
                await loadFixture(deployMoleculaPool);
            const token = ethMainnetBetaConfig.USDT_ADDRESS;
            const token2 = ethMainnetBetaConfig.USDC_ADDRESS;

            await moleculaPool.connect(poolOwner).addPool4626(token, 8);
            await expect(moleculaPool.connect(poolOwner).addPool4626(token, 8)).to.be.rejectedWith(
                'EDuplicatedToken()',
            );
            await expect(
                moleculaPool.connect(poolOwner).setPool4626(0, token, 8),
            ).to.be.rejectedWith('EDuplicatedToken()');
            await expect(
                moleculaPool.connect(poolOwner).setPool4626(1, token2, 8),
            ).to.be.rejectedWith('EBadIndex()');

            await moleculaPool.connect(poolOwner).setPool4626(0, token2, 8);
            const { exist } = await moleculaPool.connect(poolOwner).pools4626Map(token);
            expect(exist).to.equal(false);

            await expect(moleculaPool.connect(poolOwner).removePool4626(100)).to.be.rejectedWith(
                'EBadIndex()',
            );
            await moleculaPool.connect(poolOwner).removePool4626(0);
            await expect(moleculaPool.connect(poolOwner).pools4626(0)).to.be.rejected;

            await moleculaPool.connect(poolOwner).addPool4626(USDT, 6);
            await grantERC20(poolKeeper, USDT, 100_000_000n);
            await expect(moleculaPool.connect(poolOwner).removePool4626(0)).to.be.rejectedWith(
                'ENotZeroBalanceOfRemovedToken()',
            );
        });

        it('Check SupplyManager.apyFormatter', async () => {
            const { moleculaPool, poolOwner, poolKeeper, USDT } =
                await loadFixture(deployMoleculaPool);
            await moleculaPool.connect(poolOwner).addPool20(USDT, 6);
            await grantERC20(poolKeeper, USDT, 100_000_000n);

            const SupplyManager = await ethers.getContractFactory('SupplyManager');
            const deployTx = SupplyManager.connect(poolOwner).deploy(
                poolOwner.address,
                poolOwner.address,
                await moleculaPool.getAddress(),
                APY_FACTOR + 1,
            );
            await expect(deployTx).to.be.rejectedWith('EInvalidAPY');

            const supplyManager = await SupplyManager.connect(poolOwner).deploy(
                poolOwner.address,
                poolOwner.address,
                await moleculaPool.getAddress(),
                4000,
            );
            const tx = supplyManager.connect(poolOwner).distributeYield([], APY_FACTOR + 1);
            await expect(tx).to.be.rejectedWith('EInvalidAPY');
        });

        it('MoleculaPool should accept ERC4626', async () => {
            const signers = await ethers.getSigners();
            const poolOwner = signers.at(0)!;
            const poolKeeper = signers.at(1)!;
            const agent = signers.at(2)!;

            const { usde, susde, usdeMinter } = await getEthena();

            const agentDepositValue = 100500n;

            // grant stakedUSDE to agent
            await grantStakedUSDE(agent.address, agentDepositValue, usde, susde, usdeMinter);

            // Let's increase total USDe (that locked by StakedUSDe) in 2 times!
            const totalLockedUsde = await susde.totalAssets();
            await grantUSDe(await susde.getAddress(), usde, usdeMinter, totalLockedUsde);
            // Shares (sUSDe) is not changed
            expect(await susde.balanceOf(agent)).to.be.equal(agentDepositValue);
            // Assets (USDe) is increased
            expect(await susde.convertToAssets(agentDepositValue)).to.be.greaterThan(
                agentDepositValue,
            );

            // Deploy moleculaPool and supplyManager
            await grantStakedUSDE(poolKeeper.address, 10n * 10n ** 18n, usde, susde, usdeMinter);
            const p4626: PoolData[] = [{ token: (await susde.getAddress()) as EVMAddress, n: 0 }];
            const { supplyManager, moleculaPool } = await deployMoleculaPoolAndSupplyManager(
                p4626,
                poolOwner,
                poolKeeper,
            );

            // Agent deposits `agentDepositValue` (in StakedUSDe)
            const startTotalDepositedSupply = await supplyManager.totalDepositedSupply();
            await supplyManager.connect(poolOwner).setAgent(agent.address, true);

            await susde.connect(agent).approve(await moleculaPool.getAddress(), agentDepositValue);
            await supplyManager
                .connect(agent)
                .deposit(await susde.getAddress(), 0, agentDepositValue);

            // Print stake
            const totalDepositedSupply = await supplyManager.totalDepositedSupply();
            const agentDepositFormated18 = totalDepositedSupply - startTotalDepositedSupply;
            expect(agentDepositFormated18).to.be.greaterThan(agentDepositValue);

            // Agent deposits `agentDepositValue` (in StakedUSDe)
            const tx = await supplyManager
                .connect(agent)
                .requestRedeem(await susde.getAddress(), 123, agentDepositFormated18);
            const valueToRedeem = await moleculaPool.valueToRedeem();
            expect(valueToRedeem).to.be.equal(agentDepositFormated18);
            const redeemRequestEvent = await findRequestRedeemEvent(tx);
            expect(redeemRequestEvent.operationId).to.equal(123);
            expect(redeemRequestEvent.agentAddress).to.equal(agent.address);
            expect(redeemRequestEvent.redeemShares).to.equal(agentDepositFormated18);
            expect(redeemRequestEvent.redeemValue).to.equal(agentDepositValue - 1n); // It was 100500. But now it's 100499
        });

        it('Test RebaseToken.requestRedeem', async () => {
            const { rebaseToken, agent, user1, malicious, USDT } =
                await loadFixture(deployNitrogen);

            // deposit 100 USDT
            const depositValue = 100_000_000n;
            // Grant user wallet with 100 USDT and 2 ETH
            await grantERC20(user1, USDT, depositValue);

            // approve USDT to agent
            await USDT.connect(user1).approve(await agent.getAddress(), depositValue);

            // user0 calls requestDeposit on rebaseToken
            await rebaseToken.connect(user1).requestDeposit(depositValue, user1, user1);

            const redeemShares = await rebaseToken.sharesOf(user1);
            expect(redeemShares).to.be.greaterThan(0n);

            // Grant 1 unit to malicious user
            await rebaseToken.connect(user1).transfer(malicious, 1n);
            await expect(
                rebaseToken
                    .connect(malicious)
                    .requestRedeem(await rebaseToken.minRedeemValue(), malicious, malicious),
            ).to.be.rejectedWith('ETooLowRedeemValue(');

            await rebaseToken
                .connect(user1)
                .requestWithdrawal(depositValue * 10n ** 18n - 1n, user1, user1);
        });

        it('Test minDepositValue and minRedeemValue on RebaseToken', async () => {
            const { agent, user0, poolOwner, supplyManager, rebaseToken, rebaseTokenOwner } =
                await loadFixture(deployNitrogen);

            await expect(
                rebaseToken.connect(rebaseTokenOwner).setMinDepositValue(0n),
            ).to.be.rejectedWith('EZeroMinDepositValue');
            await expect(
                rebaseToken.connect(rebaseTokenOwner).setMinRedeemValue(0n),
            ).to.be.rejectedWith('EZeroMinRedeemValue');

            // deploy Rebase Token
            const RebaseToken = await ethers.getContractFactory('RebaseToken');
            await expect(
                RebaseToken.connect(poolOwner).deploy(
                    user0.address,
                    await agent.getAddress(),
                    await supplyManager.totalSharesSupply(),
                    await supplyManager.getAddress(),
                    'ETH TEST molecula',
                    'MTE',
                    ethMainnetBetaConfig.MUSD_TOKEN_DECIMALS,
                    0,
                    1,
                ),
            ).to.be.rejectedWith('EZeroMinDepositValue');
            await expect(
                RebaseToken.connect(poolOwner).deploy(
                    user0.address,
                    await agent.getAddress(),
                    await supplyManager.totalSharesSupply(),
                    await supplyManager.getAddress(),
                    'ETH TEST molecula',
                    'MTE',
                    ethMainnetBetaConfig.MUSD_TOKEN_DECIMALS,
                    1,
                    0,
                ),
            ).to.be.rejectedWith('EZeroMinRedeemValue');
        });

        it('Test allowance', async () => {
            const { rebaseToken, user1, user0, rebaseTokenOwner } =
                await loadFixture(deployNitrogen);

            await expect(rebaseToken.connect(user1).mint(user0, 10n ** 18n)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            await expect(
                rebaseToken.connect(rebaseTokenOwner).mint(ethers.ZeroAddress, 10n ** 18n),
            ).to.be.rejectedWith(
                'ERC20InvalidReceiver("0x0000000000000000000000000000000000000000")',
            );

            // Mint tokens for the user0.
            await rebaseToken.connect(rebaseTokenOwner).mint(user0, 10n ** 18n);

            const uint256max = (1n << 256n) - 1n;

            // Set an infinite `allowance[user0][user1]`.
            await rebaseToken.connect(user0).approve(user1, uint256max);
            expect(await rebaseToken.allowance(user0, user1)).to.be.equal(uint256max);

            // Transfer tokens from the user0 to the user.
            const user0Balance = await rebaseToken.balanceOf(user0);
            expect(await rebaseToken.balanceOf(user0)).to.be.greaterThan(0n);
            expect(await rebaseToken.balanceOf(user1)).to.be.equal(0n);
            await rebaseToken.connect(user1).transferFrom(user0, user1, user0Balance);
            expect(await rebaseToken.allowance(user0, user1)).to.be.equal(uint256max);
            expect(await rebaseToken.balanceOf(user0)).to.be.equal(0n);
            expect(await rebaseToken.balanceOf(user1)).to.be.greaterThan(0n);

            // user1 tries to transferFrom more than shares balance
            await expect(
                rebaseToken.connect(user1).transferFrom(user0, user1, 10n ** 18n),
            ).to.be.rejectedWith('ERC20InsufficientBalance(');

            await expect(
                rebaseToken.connect(user0).approve(ethers.ZeroAddress, uint256max),
            ).to.be.rejectedWith(
                'ERC20InvalidSpender("0x0000000000000000000000000000000000000000")',
            );

            await expect(
                rebaseToken.connect(user0).transfer(ethers.ZeroAddress, 1n),
            ).to.be.rejectedWith(
                'ERC20InvalidReceiver("0x0000000000000000000000000000000000000000")',
            );

            await expect(rebaseToken.connect(user1).burn(user0, 10n ** 18n)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            await expect(
                rebaseToken.connect(rebaseTokenOwner).burn(ethers.ZeroAddress, 10n ** 18n),
            ).to.be.rejectedWith(
                'ERC20InvalidSender("0x0000000000000000000000000000000000000000")',
            );

            // user1 approves for user0 1 wei of shares but user0 tries to get more shares

            await rebaseToken.connect(user1).approve(user0, 1n);
            await expect(
                rebaseToken.connect(user0).transferFrom(user1, user0, 2n),
            ).to.be.rejectedWith('ERC20InsufficientAllowance(');

            // setOracle test
            await expect(
                rebaseToken.connect(user0).setOracle(ethers.ZeroAddress),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');

            await expect(
                rebaseToken.connect(rebaseTokenOwner).setOracle(ethers.ZeroAddress),
            ).to.be.rejectedWith('EZeroAddress()');

            await rebaseToken.connect(rebaseTokenOwner).setOracle(user0);
        });

        it('Test APY 0% and 100%', async () => {
            const { supplyManager, poolOwner, user1, agent, USDT, poolKeeper } =
                await loadFixture(deployNitrogen);
            // distribute yield params
            const party = {
                parties: [
                    {
                        party: user1,
                        portion: 10n ** 18n,
                    },
                ],
                agent,
                ethValue: 0n,
            };

            // Set APY to 0 %
            await expect(
                supplyManager.connect(poolOwner).distributeYield([party], 0n),
            ).to.be.rejectedWith('ENoRealYield()');
            await grantERC20(poolKeeper, USDT, 1);
            await supplyManager.connect(poolOwner).distributeYield([party], 0n);
            expect(await supplyManager.apyFormatter()).to.be.equal(0n);

            // Set APY to 100 %
            await expect(
                supplyManager.connect(poolOwner).distributeYield([party], 0n),
            ).to.be.rejectedWith('ENoRealYield()');
            await grantERC20(poolKeeper, USDT, 1);
            await supplyManager.connect(poolOwner).distributeYield([party], APY_FACTOR);
            expect(await supplyManager.apyFormatter()).to.be.equal(APY_FACTOR);

            // Set APY to 20 %
            await expect(
                supplyManager.connect(poolOwner).distributeYield([party], 0n),
            ).to.be.rejectedWith('ENoRealYield()');
            await grantERC20(poolKeeper, USDT, 1);
            await supplyManager.connect(poolOwner).distributeYield([party], 2_000);
            expect(await supplyManager.apyFormatter()).to.be.equal(2_000);
        });

        it('Test rebase token getters', async () => {
            const { rebaseToken, agent, user0 } = await loadFixture(deployNitrogen);

            expect(await rebaseToken.connect(user0).pendingDepositRequest(0n, user0)).to.be.equal(
                0n,
            );
            expect(await rebaseToken.connect(user0).claimableDepositRequest(0n, user0)).to.be.equal(
                0n,
            );
            expect(await rebaseToken.connect(user0).pendingRedeemRequest(0n, user0)).to.be.equal(
                0n,
            );
            expect(await rebaseToken.connect(user0).claimableRedeemRequest(0n, user0)).to.be.equal(
                0n,
            );

            expect((await agent.getERC20Token()).toLowerCase()).to.be.equal(
                ethMainnetBetaConfig.USDT_ADDRESS,
            );
        });

        it('Test modifiers reverts RebaseToken', async () => {
            const { rebaseToken, user1, user0, rebaseTokenOwner } =
                await loadFixture(deployNitrogen);

            await expect(rebaseToken.connect(user1).requestRedeem(0n, user0, user0)).to.be.reverted;

            await expect(rebaseToken.connect(user1).redeem([0n], [0n])).to.be.rejectedWith(
                'EOnlyAccountant()',
            );

            await expect(rebaseToken.connect(user1).confirmDeposit(0n, 0n)).to.be.rejectedWith(
                'EOnlyAccountant()',
            );

            await expect(rebaseToken.connect(user1).setMinDepositValue(0n)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            await expect(rebaseToken.connect(user1).setMinRedeemValue(0n)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            await expect(rebaseToken.connect(user1).distribute(user1, 0n)).to.be.rejectedWith(
                'EOnlyAccountant()',
            );

            await expect(rebaseToken.connect(user1).setAccountant(user1)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            await rebaseToken.connect(rebaseTokenOwner).setAccountant(user1);

            await expect(rebaseToken.connect(user1).confirmRedeem(0n)).to.be.rejectedWith(
                'EBadOperationParameters()',
            );

            await expect(rebaseToken.connect(user1).confirmDeposit(0n, 0n)).to.be.rejectedWith(
                'EBadOperationParameters()',
            );

            await expect(
                rebaseToken
                    .connect(user1)
                    .requestDeposit(0n, ethers.ZeroAddress, ethers.ZeroAddress, { value: 1n }),
            ).to.be.rejectedWith('EMsgValueIsNotZero()');

            await expect(
                rebaseToken
                    .connect(user1)
                    .requestWithdrawal(0n, ethers.ZeroAddress, ethers.ZeroAddress, { value: 1n }),
            ).to.be.rejectedWith('EMsgValueIsNotZero()');

            await expect(
                rebaseToken
                    .connect(user1)
                    .requestRedeem(0n, ethers.ZeroAddress, ethers.ZeroAddress, { value: 1n }),
            ).to.be.rejectedWith('EMsgValueIsNotZero()');
        });

        it('Test modifiers reverts MoleculaPool', async () => {
            const { moleculaPool, user1 } = await loadFixture(deployNitrogen);

            await expect(moleculaPool.connect(user1).addPool20(user1, 0n)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            await expect(moleculaPool.connect(user1).setPool20(0n, user1, 0n)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            await expect(moleculaPool.connect(user1).removePool20(0n)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            await expect(moleculaPool.connect(user1).addPool4626(user1, 0n)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            await expect(moleculaPool.connect(user1).setPool4626(0n, user1, 0n)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            await expect(moleculaPool.connect(user1).removePool4626(0n)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            await expect(moleculaPool.connect(user1).setPoolKeeper(user1)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            await expect(moleculaPool.setPoolKeeper(ethers.ZeroAddress)).to.be.rejectedWith(
                'EZeroAddress()',
            );

            await expect(
                moleculaPool.deposit(ethers.ZeroAddress, 0n, ethers.ZeroAddress, 0n),
            ).to.be.rejectedWith('ENotMySupplyManager()');

            await expect(moleculaPool.requestRedeem(ethers.ZeroAddress, 0n)).to.be.rejectedWith(
                'ENotMySupplyManager()',
            );

            await expect(moleculaPool.setAgent(ethers.ZeroAddress, true)).to.be.rejectedWith(
                'ENotMySupplyManager()',
            );

            await expect(moleculaPool.connect(user1).redeem([0n])).to.be.rejectedWith(
                'ENotAuthorizedRedeemer()',
            );

            await expect(
                moleculaPool.connect(user1).setAuthorizedRedeemer(user1),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');

            await expect(moleculaPool.setAuthorizedRedeemer(ethers.ZeroAddress)).to.be.rejectedWith(
                'EZeroAddress()',
            );

            // correctly set pool keeper and authorized redeemer
            await moleculaPool.setPoolKeeper(user1);
            await moleculaPool.setAuthorizedRedeemer(user1);
            await moleculaPool.migrate(user1);

            await expect(moleculaPool.connect(user1).redeem([])).to.be.rejectedWith(
                'EEmptyArray()',
            );
        });

        it('Test modifiers reverts Agent', async () => {
            const { agent, rebaseToken, user1, rebaseTokenOwner } =
                await loadFixture(deployNitrogen);

            await expect(
                agent.connect(user1).requestDeposit(0n, ethers.ZeroAddress, 0n, { value: 1n }),
            ).to.be.rejectedWith('EMsgValueIsNotZero()');

            await expect(
                agent.connect(user1).requestDeposit(0n, ethers.ZeroAddress, 0n),
            ).to.be.rejectedWith('EBadSender()');

            await expect(
                agent.connect(user1).requestRedeem(0n, 0n, { value: 1n }),
            ).to.be.rejectedWith('EMsgValueIsNotZero()');

            await expect(agent.connect(user1).requestRedeem(0n, 0n)).to.be.rejectedWith(
                'EBadSender()',
            );

            await expect(agent.connect(user1).redeem(user1, [], [], 0n)).to.be.rejectedWith(
                'EBadSender()',
            );

            await expect(agent.connect(user1).confirmRedeem(user1, 0n)).to.be.rejectedWith(
                'EBadSender()',
            );

            await expect(agent.connect(user1).distribute([], [], { value: 1n })).to.be.rejectedWith(
                'EMsgValueIsNotZero()',
            );

            await rebaseToken.connect(rebaseTokenOwner).transferOwnership(agent);
        });

        it('Test permit', async () => {
            const { rebaseToken, user1, rebaseTokenOwner } = await loadFixture(deployNitrogen);

            const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            const expiredDeadline = 1;
            const { v, r, s } = await signERC2612Permit(
                await rebaseToken.getAddress(),
                rebaseTokenOwner.address,
                user1.address,
                1,
                deadline,
                (await rebaseToken.nonces(user1.address)).toString(),
                rebaseTokenOwner,
            );

            await rebaseToken
                .connect(rebaseTokenOwner)
                .permit(rebaseTokenOwner.address, user1.address, 1, deadline, v, r, s);

            expect(await rebaseToken.allowance(rebaseTokenOwner, user1)).to.be.equal(1n);

            // incorrect nonce used revert
            await expect(
                rebaseToken
                    .connect(rebaseTokenOwner)
                    .permit(rebaseTokenOwner.address, user1.address, 1, deadline, v, r, s),
            ).to.be.reverted;
            // sign expired deadline revert
            await expect(
                rebaseToken
                    .connect(rebaseTokenOwner)
                    .permit(rebaseTokenOwner.address, user1.address, 1, expiredDeadline, v, r, s),
            ).to.be.rejectedWith('ERC2612ExpiredSignature(1)');

            await rebaseToken.DOMAIN_SEPARATOR();
        });
    });
});

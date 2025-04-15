/* eslint-disable camelcase, max-lines, no-await-in-loop, no-restricted-syntax, no-bitwise, no-plusplus */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { keccak256 } from 'ethers';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { expectEqual, getEthena, mintmUSDe, grantStakedUSDE, grantUSDe } from '../utils/Common';

import { deployNitrogen } from '../utils/NitrogenCommon';
import {
    deployMoleculaPoolV11,
    deployMoleculaPoolV11WithParams,
    deployNitrogenV11WithRouter,
    deployNitrogenV11WithStakedUSDe,
    deployNitrogenV11WithUSDT,
    initNitrogenAndRequestDeposit,
    initNitrogenForPause,
} from '../utils/NitrogenCommonV1.1';
import { INITIAL_SUPPLY } from '../utils/deployCarbon';
import { findRequestRedeemEvent } from '../utils/event';
import { grantERC20 } from '../utils/grant';

describe('Test Nitrogen solution v1.1', () => {
    describe('General solution tests', () => {
        it('Should set the right owner', async () => {
            const { moleculaPool, supplyManager, agent, rebaseToken, poolOwner, rebaseTokenOwner } =
                await loadFixture(deployNitrogenV11WithUSDT);

            expect(await moleculaPool.owner()).to.equal(await poolOwner.getAddress());
            expect(await supplyManager.owner()).to.equal(await poolOwner.getAddress());
            expect(await agent.owner()).to.equal(await poolOwner.getAddress());
            expect(await rebaseToken.owner()).to.equal(rebaseTokenOwner.address);
            expect(await moleculaPool.totalSupply()).to.equal(100n * 10n ** 18n);
            expect(await supplyManager.totalSupply()).to.equal(100n * 10n ** 18n);
        });

        it('Deposit and Income Flow', async () => {
            const {
                moleculaPool,
                supplyManager,
                rebaseToken,
                agent,
                user0,
                user1,
                malicious,
                USDT,
            } = await loadFixture(deployNitrogenV11WithUSDT);
            // deposit 100 USDT
            const depositValue = 100_000_000n;
            // Grant user wallet with 100 USDT and 2 ETH
            await grantERC20(user0, USDT, depositValue);
            expect(await USDT.balanceOf(user0)).to.equal(depositValue);
            expect(await USDT.balanceOf(await moleculaPool.getAddress())).to.equal(0n);
            expect(await USDT.balanceOf(await moleculaPool.poolKeeper())).to.equal(0n);

            // approve USDT to agent
            await USDT.connect(user0).approve(await agent.getAddress(), depositValue);

            // user0 calls requestDeposit on rebaseToken
            await rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0);
            const shares = depositValue * 10n ** 12n;
            expect(await USDT.balanceOf(user0)).to.equal(0);
            expect(await USDT.balanceOf(moleculaPool.getAddress())).to.equal(depositValue);
            expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 2n);
            expect(await supplyManager.totalSharesSupply()).to.equal(INITIAL_SUPPLY * 2n);
            expect(await rebaseToken.balanceOf(user0)).to.equal(depositValue * 10n ** 12n);
            expect(await rebaseToken.sharesOf(user0)).to.equal(shares);

            // generate income. make x2 share price.
            // User get 40% of the income
            const income = 500_000_000n;
            await grantERC20(moleculaPool.getAddress(), USDT, income);
            expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY * 7n);
            expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 4n);
            expect(await supplyManager.totalSharesSupply()).to.equal(INITIAL_SUPPLY * 2n);
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
            expect(await USDT.balanceOf(await moleculaPool.getAddress())).to.equal(
                depositValue * 2n + income,
            );
            expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 5n);
            expect(await supplyManager.totalSharesSupply()).to.equal(
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
            expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY * 6n);
            expect((await moleculaPool.poolMap(USDT)).valueToRedeem).to.equal(
                (INITIAL_SUPPLY * 2n) / 10n ** 12n,
            );
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
            expect(await USDT.balanceOf(moleculaPool.getAddress())).to.equal(700_000_000n);
            const DAI = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.DAI_ADDRESS);
            expect(await DAI.balanceOf(moleculaPool.getAddress())).to.equal(INITIAL_SUPPLY);

            // redeem to user and user1

            // user0 call redeem
            await expect(
                moleculaPool.connect(malicious).redeem([operationId, 123]),
            ).to.be.rejectedWith('EBadOperationStatus()');
            tx = await moleculaPool.connect(malicious).redeem([operationId, operationId_1]);
            await ethers.provider.getTransactionReceipt(tx.hash);
            // Check event
            await expect(tx).to.emit(rebaseToken, 'Redeem');
            // check molecula pool
            expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY * 5n);
            expect(await USDT.balanceOf(await moleculaPool.getAddress())).to.equal(400_000_000n);
            expect(await DAI.balanceOf(await moleculaPool.getAddress())).to.equal(INITIAL_SUPPLY);
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

        async function depositAndRequestRedeem() {
            const { moleculaPool, rebaseToken, agent, user0, malicious, USDT } =
                await loadFixture(deployNitrogenV11WithUSDT);
            // deposit 100 USDT
            const depositValue = 100n * 10n ** 6n - 1n;
            // Grant user wallet with 100 USDT and 2 ETH
            await grantERC20(user0, USDT, depositValue);

            // approve USDT to agent
            await USDT.connect(user0).approve(await agent.getAddress(), depositValue);
            // user0 calls requestDeposit on rebaseToken
            await rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0);

            // user asks for redeem
            const redeemShares = (await rebaseToken.sharesOf(user0)) - 1n;
            const tx = await rebaseToken.connect(user0).requestRedeem(redeemShares, user0, user0);
            const eventData = await findRequestRedeemEvent(tx);
            const { operationId, redeemValue } = eventData;
            expect(redeemValue).to.be.equal(depositValue - 1n);
            expect((await moleculaPool.poolMap(USDT)).valueToRedeem).to.be.equal(depositValue - 1n);
            return {
                moleculaPool,
                operationId,
                malicious,
                USDT,
                rebaseToken,
                depositValue,
                user0,
            };
        }

        it('Deposit and Redeem Flow without income', async () => {
            const { moleculaPool, operationId, malicious, USDT, rebaseToken, depositValue, user0 } =
                await loadFixture(depositAndRequestRedeem);

            // redeem
            await moleculaPool.connect(malicious).redeem([operationId]);
            expect((await moleculaPool.poolMap(USDT)).valueToRedeem).to.be.equal(0n);

            // anyone call confirmRedeem for user
            await rebaseToken.connect(malicious).confirmRedeem(operationId);
            expect(await USDT.balanceOf(user0)).to.be.equal(depositValue - 1n);
        });

        it('Test remove with valueToRedeem', async () => {
            const { moleculaPool, malicious, USDT } = await loadFixture(depositAndRequestRedeem);

            // Send all USDT to random address and try to remove USDT token.
            await moleculaPool.addInWhiteList(USDT);
            const keeperSigner = await ethers.getImpersonatedSigner(
                await moleculaPool.poolKeeper(),
            );
            const encodedTransfer = USDT.interface.encodeFunctionData('transfer', [
                malicious.address,
                await USDT.balanceOf(moleculaPool.getAddress()),
            ]);
            await moleculaPool.connect(keeperSigner).execute(USDT.getAddress(), encodedTransfer);
            await expect(moleculaPool.removeToken(USDT)).to.be.rejectedWith(
                'ENotZeroValueToRedeemOfRemovedToken()',
            );
        });

        it('Test requestDeposit for user0 (not for msg.sender)', async () => {
            const {
                moleculaPool,
                rebaseToken,
                agent,
                user0,
                caller,
                malicious,
                controller,
                randAccount,
                USDT,
            } = await loadFixture(deployNitrogenV11WithUSDT);
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
            expect(await rebaseToken.balanceOf(user0)).to.equal(0);
            expect(await rebaseToken.sharesOf(caller)).to.equal(0);
            expect(await USDT.balanceOf(caller)).to.equal(0);
            expect(await USDT.balanceOf(user0)).to.equal(0);

            await moleculaPool.connect(randAccount).redeem([operationId]);
            // Anyone can call confirmRedeem
            await rebaseToken.connect(malicious).confirmRedeem(operationId);

            // Controller got their USDT
            expect(await USDT.balanceOf(controller)).to.equal(depositValue);
            expect(await USDT.balanceOf(caller)).to.equal(0);
            expect(await USDT.balanceOf(user0)).to.equal(0);
        });

        it('Distribute yield', async () => {
            const { moleculaPool, supplyManager, agent, user1, rebaseToken, malicious } =
                await loadFixture(deployNitrogenV11WithUSDT);

            const val = 100n * 10n ** 18n;
            expect(await supplyManager.totalSupply()).to.equal(val);
            expect(await supplyManager.totalSharesSupply()).to.equal(val);
            const DAI = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.DAI_ADDRESS);

            // generate income
            await grantERC20(await moleculaPool.getAddress(), DAI, val);

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

            // Try again
            await expect(supplyManager.distributeYield([party], 5000)).to.be.rejectedWith(
                'ENoRealYield()',
            );

            // Try from malicious address
            await expect(agent.connect(malicious).distribute([], [])).to.be.rejectedWith(
                'EBadSender()',
            );

            // Try with a wrong agent
            const maliciousParty = {
                parties: [
                    {
                        party: user1,
                        portion: 10n ** 18n,
                    },
                ],
                agent: malicious.address,
                ethValue: 0n,
            };
            await expect(supplyManager.distributeYield([maliciousParty], 0)).to.be.rejectedWith(
                'EWrongAgent()',
            );

            // Try with wrong agents
            const maliciousParties = [
                {
                    parties: [
                        {
                            party: user1,
                            portion: 250n * 10n ** 15n,
                        },
                    ],
                    agent: malicious.address,
                    ethValue: 0n,
                },
                {
                    parties: [
                        {
                            party: user1,
                            portion: 250n * 10n ** 15n,
                        },
                    ],
                    agent: malicious.address,
                    ethValue: 0n,
                },
                {
                    parties: [
                        {
                            party: user1,
                            portion: 250n * 10n ** 15n,
                        },
                    ],
                    agent: malicious.address,
                    ethValue: 0n,
                },
                {
                    parties: [
                        {
                            party: user1,
                            portion: 250n * 10n ** 15n,
                        },
                    ],
                    agent: malicious.address,
                    ethValue: 0n,
                },
            ];
            await expect(supplyManager.distributeYield(maliciousParties, 0)).to.be.rejectedWith(
                'EWrongAgent()',
            );
        });
    });

    describe('Test special cases', () => {
        it('Should be MOLECULA_POOL.totalSupply > 0', async () => {
            const { moleculaPool, poolOwner } = await loadFixture(deployMoleculaPoolV11);

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

        it('Check push invalid token', async () => {
            const { moleculaPool, poolOwner } = await loadFixture(deployNitrogenV11WithStakedUSDe);

            // It's not smart-contract
            await expect(moleculaPool.addToken(poolOwner)).to.be.rejectedWith('ENotContract');
        });

        it('Check duplicated pools', async () => {
            const { moleculaPool, poolOwner } = await loadFixture(deployMoleculaPoolV11);
            const token = ethMainnetBetaConfig.USDT_ADDRESS;
            const token2 = ethMainnetBetaConfig.USDC_ADDRESS;

            await moleculaPool.connect(poolOwner).addToken(token);
            await expect(moleculaPool.connect(poolOwner).addToken(token)).to.be.rejectedWith(
                'EDuplicatedToken()',
            );

            // Check that pool is empty
            await expect(moleculaPool.connect(poolOwner).removeToken(token2)).to.be.rejectedWith(
                'ETokenNotExist()',
            );
            await moleculaPool.connect(poolOwner).removeToken(token);
            expect((await moleculaPool.connect(poolOwner).getTokenPool()).length).to.be.equal(0);

            const USDT = await ethers.getContractAt('IERC20', token);
            await moleculaPool.connect(poolOwner).addToken(USDT);
            await grantERC20(moleculaPool, USDT, 100_000_000n);
            await expect(moleculaPool.connect(poolOwner).removeToken(USDT)).to.be.rejectedWith(
                'ENotZeroBalanceOfRemovedToken()',
            );
        });

        it('Test remove tokens', async () => {
            const { moleculaPool, poolOwner } = await loadFixture(deployMoleculaPoolV11);
            const token = ethMainnetBetaConfig.USDT_ADDRESS;
            const token2 = ethMainnetBetaConfig.USDC_ADDRESS;
            const token3 = ethMainnetBetaConfig.USDE_ADDRESS;

            await moleculaPool.connect(poolOwner).addToken(token);
            await moleculaPool.connect(poolOwner).addToken(token2);
            await moleculaPool.connect(poolOwner).addToken(token3);
            // in pool: token, token2, token3
            await moleculaPool.connect(poolOwner).removeToken(token);
            expect((await moleculaPool.connect(poolOwner).poolMap(token)).tokenType).to.be.equal(0);
            // in pool: token2, token3
            for (const t of [token2, token3]) {
                const { arrayIndex } = await moleculaPool.connect(poolOwner).poolMap(t);
                const res = await moleculaPool.connect(poolOwner).pool(arrayIndex);
                expect(t.toLocaleLowerCase()).to.be.equal(res.token.toLocaleLowerCase());
            }
        });

        it('Check duplicated pools 4626', async () => {
            const { moleculaPool, poolOwner } = await loadFixture(deployMoleculaPoolV11);

            const { susde, usde, usdeMinter } = await getEthena();

            await moleculaPool.connect(poolOwner).addToken(susde);
            await expect(moleculaPool.connect(poolOwner).addToken(susde)).to.be.rejectedWith(
                'EDuplicatedToken()',
            );

            await expect(
                moleculaPool.connect(poolOwner).removeToken(ethMainnetBetaConfig.USDC_ADDRESS),
            ).to.be.rejectedWith('ETokenNotExist()');
            await moleculaPool.connect(poolOwner).removeToken(susde);
            await expect(moleculaPool.connect(poolOwner).pool(0)).to.be.rejected;

            await moleculaPool.connect(poolOwner).addToken(susde);
            await grantStakedUSDE(moleculaPool, 100_000_000n, usde, susde, usdeMinter);
            await expect(moleculaPool.connect(poolOwner).removeToken(susde)).to.be.rejectedWith(
                'ENotZeroBalanceOfRemovedToken()',
            );
        });

        it('Check SupplyManager.apyFormatter', async () => {
            const { moleculaPool, poolOwner, USDT } = await loadFixture(deployMoleculaPoolV11);
            await moleculaPool.connect(poolOwner).addToken(USDT);
            await grantERC20(await moleculaPool.getAddress(), USDT, 100_000_000n);

            const SupplyManager = await ethers.getContractFactory('SupplyManager');
            const APY_FACTOR = 10_000;
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
            const { usde, susde, usdeMinter } = await getEthena();
            const {
                moleculaPool,
                agent,
                rebaseToken,
                supplyManager,
                user1,
                malicious,
                randAccount,
            } = await loadFixture(deployNitrogenV11WithStakedUSDe);

            // deposit 123 stakedUSDe
            const susdeUserDeposit = 123n * 10n ** (await susde.decimals());
            await grantStakedUSDE(user1.address, susdeUserDeposit, usde, susde, usdeMinter);
            expect(await susde.balanceOf(user1)).to.equal(susdeUserDeposit);
            expect(await susde.balanceOf(await moleculaPool.getAddress())).to.equal(0n);
            expect(await susde.balanceOf(await moleculaPool.poolKeeper())).to.equal(0n);

            // Let's increase total USDe (that locked by StakedUSDe) in 2 times!
            const totalLockedUsde = await susde.totalAssets();
            await grantUSDe(await susde.getAddress(), usde, usdeMinter, totalLockedUsde);
            // Shares (sUSDe) is not changed
            expect(await susde.balanceOf(user1.getAddress())).to.be.equal(susdeUserDeposit);
            // Assets (USDe) is increased
            expect(await susde.convertToAssets(susdeUserDeposit)).to.be.greaterThan(
                susdeUserDeposit,
            );

            // User deposits their tokens
            const startTotalDepositedSupply = await supplyManager.totalDepositedSupply();
            // Approve sUSDe tokens to agent
            await susde.connect(user1).approve(await agent.getAddress(), susdeUserDeposit);
            // user0 calls requestDeposit on rebaseToken
            await rebaseToken.connect(user1).requestDeposit(susdeUserDeposit, user1, user1);

            // Print stake
            const totalDepositedSupply = await supplyManager.totalDepositedSupply();
            const deltaTotalDeposit = totalDepositedSupply - startTotalDepositedSupply;
            expect(deltaTotalDeposit).to.be.greaterThan(susdeUserDeposit);

            // User calls rebaseToken.requestRedeem
            const redeemShares = await rebaseToken.sharesOf(user1);
            const tx = await rebaseToken.connect(user1).requestRedeem(redeemShares, user1, user1);
            const erc4626ValueToRedeem = (await moleculaPool.totalPoolsSupplyAndRedeem())[1];
            // erc4626ValueToRedeem > deltaTotalDeposit because sUSDe is always increasing their value.
            expect(erc4626ValueToRedeem).to.be.greaterThan(deltaTotalDeposit);
            const eventData = await findRequestRedeemEvent(tx);

            const { operationId } = eventData;
            expect(eventData.agentAddress).to.equal(await agent.getAddress());
            expect(eventData.redeemShares).to.equal(deltaTotalDeposit);
            // It should be equal, but we store mUSD (kind of USDe) and sUSDe cost is always increasing.
            expect(eventData.redeemValue).to.be.lessThan(susdeUserDeposit);

            // User get back theis tokens
            await moleculaPool.connect(randAccount).redeem([operationId]);
            // `valueToRedeem` must be 0, but we have some rounding error
            expect((await moleculaPool.poolMap(susde)).valueToRedeem).to.be.equal(0);
            await rebaseToken.connect(malicious).confirmRedeem(operationId);
            expectEqual(
                await susde.balanceOf(user1.getAddress()),
                susdeUserDeposit,
                await susde.decimals(),
                5n,
            );
        });

        it('Test white list', async () => {
            const { moleculaPool, poolOwner, malicious } = await loadFixture(deployMoleculaPoolV11);

            // Test deleteFromWhiteList
            expect(
                await moleculaPool
                    .connect(poolOwner)
                    .isInWhiteList(ethMainnetBetaConfig.USDT_ADDRESS),
            ).to.be.true;
            await moleculaPool
                .connect(poolOwner)
                .deleteFromWhiteList(ethMainnetBetaConfig.USDT_ADDRESS);
            await expect(
                moleculaPool
                    .connect(poolOwner)
                    .deleteFromWhiteList(ethMainnetBetaConfig.USDT_ADDRESS),
            ).to.be.rejectedWith('EAlreadyDeleted');

            // Test addInWhiteList
            expect(
                await moleculaPool
                    .connect(poolOwner)
                    .isInWhiteList(ethMainnetBetaConfig.USDT_ADDRESS),
            ).to.be.false;
            await moleculaPool.connect(poolOwner).addInWhiteList(ethMainnetBetaConfig.USDT_ADDRESS);
            expect(
                await moleculaPool
                    .connect(poolOwner)
                    .isInWhiteList(ethMainnetBetaConfig.USDT_ADDRESS),
            ).to.be.true;
            await expect(
                moleculaPool.connect(poolOwner).addInWhiteList(ethMainnetBetaConfig.USDT_ADDRESS),
            ).to.be.rejectedWith('EAlreadyAdded');

            // Test wrong user0
            await expect(
                moleculaPool.connect(malicious).addInWhiteList(ethMainnetBetaConfig.USDT_ADDRESS),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');
            await expect(
                moleculaPool
                    .connect(malicious)
                    .deleteFromWhiteList(ethMainnetBetaConfig.USDT_ADDRESS),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');
        });

        it('Test execute', async () => {
            const { moleculaPool, randAccount, poolOwner, USDT } =
                await loadFixture(deployNitrogenV11WithUSDT);
            const keeperSigner = await ethers.getImpersonatedSigner(
                await moleculaPool.poolKeeper(),
            );
            const encodedApprove = USDT.interface.encodeFunctionData('approve', [
                randAccount.address,
                100500n,
            ]);
            const encodedBalanceOf = USDT.interface.encodeFunctionData('balanceOf', [
                randAccount.address,
            ]);
            await expect(
                moleculaPool.connect(keeperSigner).execute(USDT.getAddress(), encodedBalanceOf),
            ).to.be.rejectedWith('ENotInWhiteList()');
            await expect(
                moleculaPool.connect(keeperSigner).execute(USDT.getAddress(), encodedApprove),
            ).to.be.rejectedWith('ENotInWhiteList()');
            await expect(
                moleculaPool
                    .connect(keeperSigner)
                    .execute(USDT.getAddress(), encodedApprove, { value: 1 }),
            ).to.be.rejectedWith('EMsgValueIsNotZero()');
            await moleculaPool.connect(poolOwner).addInWhiteList(randAccount.address);
            await moleculaPool.connect(keeperSigner).execute(USDT.getAddress(), encodedApprove);

            expect(
                await USDT.allowance(moleculaPool.getAddress(), randAccount.address),
            ).to.be.equal(100500n);

            const testSeqnoFactory = await ethers.getContractFactory('TestSeqno');
            const testSeqno = await testSeqnoFactory.connect(randAccount).deploy();
            const encodedIncAndPay = testSeqno.interface.encodeFunctionData('incAndPay', [13n]);
            await moleculaPool.connect(poolOwner).addInWhiteList(testSeqno.getAddress());
            await moleculaPool
                .connect(keeperSigner)
                .execute(testSeqno.getAddress(), encodedIncAndPay, { value: 124 });
            expect(await testSeqno.seqno()).to.be.equal(13n);
            expect(await randAccount.provider.getBalance(testSeqno.getAddress())).to.be.equal(124);

            // Call receive function
            await moleculaPool
                .connect(keeperSigner)
                .execute(testSeqno.getAddress(), '0x', { value: 124 });
            expect(await testSeqno.seqno()).to.be.equal(13n + 10n);
            expect(await randAccount.provider.getBalance(testSeqno.getAddress())).to.be.equal(
                2 * 124,
            );

            // Call touch function
            const encodedTouch = testSeqno.interface.encodeFunctionData('touch');
            await moleculaPool
                .connect(keeperSigner)
                .execute(testSeqno.getAddress(), encodedTouch, { value: 124 });
            expect(await testSeqno.seqno()).to.be.equal(13n + 10n + 1n);
            expect(await randAccount.provider.getBalance(testSeqno.getAddress())).to.be.equal(
                3 * 124,
            );
        });

        it('Test migration from MoleculaPool to MoleculaPoolTreasury', async () => {
            const {
                poolOwner,
                supplyManager,
                moleculaPool,
                rebaseToken,
                user0,
                agent,
                malicious,
                USDT,
                poolKeeper,
                poolKeeperSigner,
            } = await loadFixture(deployNitrogen);

            const { usdeMinter, usde, susde } = await getEthena();

            const musde = await ethers.deployContract('MUSDE', [
                await susde.getAddress(),
                await moleculaPool.poolKeeper(),
            ]);
            await moleculaPool.addPool20(musde.getAddress(), 0n);
            await mintmUSDe(
                await moleculaPool.poolKeeper(),
                usdeMinter,
                usde,
                susde,
                musde,
                123n * 10n ** 18n,
            );

            // User deposits and redeems their value
            // deposit 100 USDT
            const depositValue = 100_000_000n;

            // Grant user wallet with tokens
            await grantERC20(user0, USDT, depositValue);

            // approve USDT to agent
            await USDT.connect(user0).approve(await agent.getAddress(), depositValue);

            // user0 calls requestDeposit on rebaseToken
            await rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0);

            // user asks for redeem
            const tx = await rebaseToken
                .connect(user0)
                .requestRedeem(await rebaseToken.sharesOf(user0), user0, user0);
            const eventData = await findRequestRedeemEvent(tx);
            const { operationId } = eventData;
            const valueToRedeem = await moleculaPool.valueToRedeem();
            const totalSupply = await moleculaPool.totalSupply();

            // Migrate from moleculaPool to moleculaPoolV11
            const moleculaPoolV11 = await deployMoleculaPoolV11WithParams(
                poolOwner,
                await supplyManager.getAddress(),
            );
            expect(await USDT.balanceOf(poolKeeperSigner)).to.be.greaterThan(0n);
            for (const t of await moleculaPool.getPools20()) {
                const token = await ethers.getContractAt('IERC20', t[0]);
                await token
                    .connect(poolKeeperSigner)
                    .approve(moleculaPoolV11.getAddress(), (1n << 256n) - 1n);
            }

            for (const t of await moleculaPool.getPools4626()) {
                const token = await ethers.getContractAt('IERC4626', t[0]);
                await token
                    .connect(poolKeeperSigner)
                    .approve(moleculaPoolV11.getAddress(), (1n << 256n) - 1n);
            }
            await USDT.connect(poolKeeper).approve(await agent.getAddress(), valueToRedeem);

            // User redeems their tokens using MoleculaPoolTreasury
            await moleculaPool.connect(poolOwner).redeem([operationId]);

            // Now user does not have their tokens
            expect(await USDT.balanceOf(user0)).to.be.equal(0n);

            await rebaseToken.connect(malicious).confirmRedeem(operationId);
            // User get their tokens back
            expect(await USDT.balanceOf(user0)).to.be.greaterThan(0n);

            await supplyManager.connect(poolOwner).setMoleculaPool(moleculaPoolV11.getAddress());

            expect((await moleculaPoolV11.poolMap(USDT)).valueToRedeem).to.be.equal(0n);

            expectEqual(await moleculaPoolV11.totalSupply(), totalSupply, 18n, 6n);

            const agents = await supplyManager.getAgents();

            for (const agentAddr of agents) {
                const agentContract = await ethers.getContractAt('IAgent', agentAddr);
                const erc20Token = await ethers.getContractAt(
                    'IERC20',
                    await agentContract.getERC20Token(),
                );
                const allowance = await erc20Token.allowance(
                    moleculaPoolV11.getAddress(),
                    agentAddr,
                );
                expect(allowance).to.be.equal((1n << 256n) - 1n);
            }

            expect(await USDT.balanceOf(poolKeeperSigner)).to.be.equal(0n);
            for (const t of await moleculaPool.getPools20()) {
                const erc20 = await ethers.getContractAt('IERC20', t[0]);
                expect(
                    await erc20.connect(poolKeeperSigner).balanceOf(poolKeeperSigner),
                ).to.be.equal(0n);
            }
            for (const t of await moleculaPool.getPools4626()) {
                const erc4626 = await ethers.getContractAt('IERC4626', t[0]);
                expect(
                    await erc4626.connect(poolKeeperSigner).balanceOf(poolKeeperSigner),
                ).to.be.equal(0n);
            }
        });

        it('Test migration from MoleculaPool to MoleculaPoolTreasury with non zero redeem value bug', async () => {
            const {
                moleculaPool,
                supplyManager,
                rebaseToken,
                agent,
                user0,
                poolOwner,
                USDT,
                rebaseTokenOwner,
                poolKeeperSigner,
            } = await loadFixture(deployNitrogen);

            const depositValue = 200_000_000n;
            const redeemIterations = 2n;

            await rebaseToken
                .connect(rebaseTokenOwner)
                .setMinRedeemValue(1_000_000_000_000_000_000n);

            // Grant user wallet with 200 USDT
            await grantERC20(user0, USDT, depositValue);
            expect(await USDT.balanceOf(user0)).to.equal(depositValue);
            // approve USDT to agent
            await USDT.connect(user0).approve(await agent.getAddress(), depositValue);

            // user0 call requestDeposit on rebaseToken
            await rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0);

            const totalUserShares = await rebaseToken.sharesOf(user0);

            const redeemShares = totalUserShares / redeemIterations;
            const operationIds = [];
            for (let i = 0n; i < redeemIterations; i++) {
                const tx = await rebaseToken
                    .connect(user0)
                    .requestRedeem(redeemShares - 1n, user0, user0);
                const { operationId } = await findRequestRedeemEvent(tx);
                operationIds.push(operationId);
            }

            await USDT.connect(poolKeeperSigner).approve(await agent.getAddress(), depositValue);

            await moleculaPool.connect(poolOwner).redeem(operationIds);

            for (let i = 0; i < redeemIterations; ++i) {
                await rebaseToken.connect(user0).confirmRedeem(operationIds[i]!);
            }

            // Note: the first main check of the test!
            expect(await moleculaPool.valueToRedeem()).to.be.greaterThan(0n);

            // Migrate from moleculaPool to moleculaPoolV11
            const moleculaPoolV11 = await deployMoleculaPoolV11WithParams(
                poolOwner,
                await supplyManager.getAddress(),
            );
            expect(await USDT.balanceOf(poolKeeperSigner)).to.be.greaterThan(0n);
            for (const t of await moleculaPool.getPools20()) {
                const token = await ethers.getContractAt('IERC20', t[0]);
                await token
                    .connect(poolKeeperSigner)
                    .approve(moleculaPoolV11.getAddress(), (1n << 256n) - 1n);
            }

            for (const t of await moleculaPool.getPools4626()) {
                const token = await ethers.getContractAt('IERC4626', t[0]);
                await token
                    .connect(poolKeeperSigner)
                    .approve(moleculaPoolV11.getAddress(), (1n << 256n) - 1n);
            }

            await supplyManager.connect(poolOwner).setMoleculaPool(moleculaPoolV11.getAddress());

            // Note: the second main check of the test! `valueToRedeem` was not equal to zero, but now it is.
            expect((await moleculaPoolV11.poolMap(USDT)).valueToRedeem).to.be.equal(0n);
        });

        it('Test modifiers reverts MoleculaPoolTreasury', async () => {
            const { moleculaPool, randAccount, malicious, USDT } =
                await loadFixture(deployNitrogenV11WithUSDT);

            await expect(
                moleculaPool.connect(randAccount).addToken(randAccount),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');

            await expect(
                moleculaPool.connect(randAccount).removeToken(randAccount),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');

            await expect(
                moleculaPool.connect(randAccount).setPoolKeeper(randAccount),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');

            await expect(moleculaPool.setPoolKeeper(ethers.ZeroAddress)).to.be.rejectedWith(
                'EZeroAddress()',
            );

            await expect(
                moleculaPool.deposit(ethers.ZeroAddress, 0n, ethers.ZeroAddress, 0n),
            ).to.be.rejectedWith('EBadSender()');

            await expect(moleculaPool.requestRedeem(ethers.ZeroAddress, 0n)).to.be.rejectedWith(
                'EBadSender()',
            );

            await expect(moleculaPool.connect(randAccount).redeem([])).to.be.rejectedWith(
                'EEmptyArray()',
            );

            await expect(moleculaPool.addInWhiteList(ethers.ZeroAddress)).to.be.rejectedWith(
                'EZeroAddress()',
            );

            await expect(moleculaPool.deleteFromWhiteList(ethers.ZeroAddress)).to.be.rejectedWith(
                'EZeroAddress()',
            );

            const encodedTransfer = USDT.interface.encodeFunctionData('transfer', [
                malicious.address,
                await USDT.balanceOf(moleculaPool.getAddress()),
            ]);
            await expect(
                moleculaPool.connect(randAccount).execute(USDT.getAddress(), encodedTransfer),
            ).to.be.rejectedWith('EBadSender()');

            await expect(
                moleculaPool.connect(randAccount).setAgent(ethers.ZeroAddress, true),
            ).to.be.rejectedWith('EBadSender()');

            await expect(
                moleculaPool.connect(randAccount).migrate(ethers.ZeroAddress),
            ).to.be.rejectedWith('EBadSender()');

            await moleculaPool.setPoolKeeper(randAccount);
        });

        it('Test MoleculaPoolTreasury constructor zero address in array', async () => {
            const { poolOwner } = await loadFixture(deployNitrogenV11WithUSDT);

            const MoleculaPool_revert = await ethers.getContractFactory('MoleculaPoolTreasury');
            await expect(
                MoleculaPool_revert.connect(poolOwner).deploy(
                    poolOwner.address,
                    [],
                    poolOwner.address,
                    poolOwner.address,
                    [ethers.ZeroAddress],
                    poolOwner.address,
                ),
            ).to.be.rejectedWith('EZeroAddress()');
        });
    });

    describe('Test pause', () => {
        it('Test pauseExecute', async () => {
            const {
                moleculaPool,
                guardian,
                poolOwner,
                failToExecuteFunctions,
                executeFunctions,
                randAccount,
            } = await loadFixture(initNitrogenForPause);

            // Tests msg.sender
            await expect(moleculaPool.connect(randAccount).pauseExecute()).to.be.rejectedWith(
                'EBadSender()',
            );
            await expect(moleculaPool.connect(guardian).unpauseExecute()).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            // Pause `execute` function
            await moleculaPool.connect(guardian).pauseExecute();
            // Fail to call `execute` function
            await failToExecuteFunctions('EExecutePaused()');
            // Unpause `execute` function
            await moleculaPool.connect(poolOwner).unpauseExecute();
            // Call `execute` function
            await executeFunctions();
        });

        it('Test pauseAll', async () => {
            const {
                moleculaPool,
                guardian,
                poolOwner,
                failToExecuteFunctions,
                executeFunctions,
                randAccount,
            } = await loadFixture(initNitrogenForPause);

            // Tests msg.sender
            await expect(moleculaPool.connect(randAccount).pauseAll()).to.be.rejectedWith(
                'EBadSender()',
            );
            await expect(moleculaPool.connect(guardian).unpauseAll()).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            // Pause `execute` function
            await moleculaPool.connect(guardian).pauseAll();
            // Fail to call `execute` function
            await failToExecuteFunctions('EExecutePaused()');
            // Unpause `execute` function
            await moleculaPool.connect(poolOwner).unpauseAll();
            // Call `execute` function
            await executeFunctions();
        });

        it('Test block token and execute function', async () => {
            const {
                moleculaPool,
                guardian,
                poolOwner,
                failToExecuteFunctions,
                executeFunctions,
                USDT,
            } = await loadFixture(initNitrogenForPause);

            // Tests msg.sender
            await expect(
                moleculaPool.connect(guardian).setBlockToken(USDT, true),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');

            // Pause `execute` function
            await moleculaPool.connect(poolOwner).setBlockToken(USDT, true);
            // Fail to call `execute` function
            await failToExecuteFunctions('ETokenBlocked');
            // Unpause `execute` function
            await moleculaPool.connect(poolOwner).setBlockToken(USDT, false);
            // Call `execute` function
            await executeFunctions();
        });

        it('Test pause redeem', async () => {
            const {
                moleculaPool,
                guardian,
                user0,
                rebaseToken,
                malicious,
                poolOwner,
                USDT,
                operationId,
                redeemValue,
                randAccount,
            } = await loadFixture(initNitrogenAndRequestDeposit);

            await expect(moleculaPool.connect(randAccount).pauseRedeem()).to.be.rejectedWith(
                'EBadSender()',
            );
            await expect(moleculaPool.connect(guardian).unpauseRedeem()).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            // pause redeem, fail to redeem to user
            await moleculaPool.connect(guardian).pauseRedeem();
            await expect(moleculaPool.connect(malicious).redeem([operationId])).to.be.rejectedWith(
                'ERedeemPaused()',
            );

            // unpause redeem, redeem to user
            await moleculaPool.connect(poolOwner).unpauseRedeem();
            await moleculaPool.connect(malicious).redeem([operationId]);

            // anyone call confirmRedeem for user
            await rebaseToken.connect(user0).confirmRedeem(operationId);
            expect(await USDT.balanceOf(user0)).to.be.equal(redeemValue);
        });

        it('Test pauseAll', async () => {
            const {
                moleculaPool,
                guardian,
                user0,
                rebaseToken,
                malicious,
                poolOwner,
                USDT,
                operationId,
                redeemValue,
            } = await loadFixture(initNitrogenAndRequestDeposit);

            await expect(moleculaPool.connect(guardian).unpauseAll()).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );

            // pause redeem, fail to redeem to user
            await moleculaPool.connect(guardian).pauseAll();
            await expect(moleculaPool.connect(malicious).redeem([operationId])).to.be.rejectedWith(
                'ERedeemPaused()',
            );

            // unpause redeem, redeem to user
            await moleculaPool.connect(poolOwner).unpauseAll();
            await moleculaPool.connect(malicious).redeem([operationId]);

            // anyone call confirmRedeem for user
            await rebaseToken.connect(user0).confirmRedeem(operationId);
            expect(await USDT.balanceOf(user0)).to.be.equal(redeemValue);
        });

        it('Test changeGuardian', async () => {
            const { moleculaPool, randAccount, poolOwner } =
                await loadFixture(deployNitrogenV11WithUSDT);
            expect(await moleculaPool.guardian()).to.not.equal(randAccount);
            await expect(
                moleculaPool.connect(randAccount).changeGuardian(randAccount),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');
            await moleculaPool.connect(poolOwner).changeGuardian(randAccount);
            expect(await moleculaPool.guardian()).to.equal(randAccount);
        });

        it('Should block token', async () => {
            const {
                moleculaPool,
                user0,
                rebaseToken,
                malicious,
                poolOwner,
                USDT,
                randAccount,
                operationId,
                redeemValue,
            } = await loadFixture(initNitrogenAndRequestDeposit);

            await expect(
                moleculaPool.connect(poolOwner).setBlockToken(randAccount, true),
            ).to.be.rejectedWith('ETokenNotExist');
            await expect(
                moleculaPool.connect(randAccount).setBlockToken(USDT, true),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount');

            // block token, fail to redeem to user
            await moleculaPool.connect(poolOwner).setBlockToken(USDT, true);
            await expect(moleculaPool.connect(malicious).redeem([operationId])).to.be.rejectedWith(
                'ETokenBlocked()',
            );

            // unblock token, redeem to user
            await moleculaPool.connect(poolOwner).setBlockToken(USDT, false);
            await moleculaPool.connect(malicious).redeem([operationId]);

            // anyone call confirmRedeem for user
            await rebaseToken.connect(user0).confirmRedeem(operationId);
            expect(await USDT.balanceOf(user0)).to.be.equal(redeemValue);
        });

        it('Test pause agent accountant', async () => {
            const { moleculaPool, rebaseToken, agent, user0, USDT } =
                await loadFixture(deployNitrogenV11WithUSDT);
            const depositValue = 100_000_000n;

            await grantERC20(user0, USDT, 2n * depositValue);
            // approve USDT to agent
            await USDT.connect(user0).approve(await agent.getAddress(), 2n * depositValue);

            // user0 calls requestDeposit on rebaseToken
            await agent.pauseRequestDeposit();
            await expect(
                rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0),
            ).to.be.rejectedWith('ERequestDepositPaused');
            await agent.unpauseRequestDeposit();
            await rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0);

            // user0 calls requestDeposit on rebaseToken
            await agent.pauseAll();
            await expect(
                rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0),
            ).to.be.rejectedWith('ERequestDepositPaused');
            await agent.unpauseAll();
            await rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0);

            const redeemShares = await rebaseToken.sharesOf(user0);

            // user asks for redeem
            await agent.pauseRequestRedeem();
            await expect(
                rebaseToken.connect(user0).requestRedeem(redeemShares / 2n, user0, user0),
            ).to.be.rejectedWith('ERequestRedeemPaused()');
            await agent.unpauseRequestRedeem();
            let tx = await rebaseToken
                .connect(user0)
                .requestRedeem(redeemShares / 2n, user0, user0);
            const { operationId: operationId0, redeemValue: redeemValue0 } =
                await findRequestRedeemEvent(tx);

            // user asks for redeem
            await agent.pauseAll();
            await expect(
                rebaseToken
                    .connect(user0)
                    .requestRedeem(redeemShares - redeemShares / 2n, user0, user0),
            ).to.be.rejectedWith('ERequestRedeemPaused()');
            await agent.unpauseAll();
            tx = await rebaseToken
                .connect(user0)
                .requestRedeem(redeemShares - redeemShares / 2n, user0, user0);
            const { operationId: operationId1, redeemValue: redeemValue1 } =
                await findRequestRedeemEvent(tx);

            // redeem and confirmRedeem
            await moleculaPool.connect(user0).redeem([operationId0, operationId1]);
            await rebaseToken.connect(user0).confirmRedeem(operationId0);
            await rebaseToken.connect(user0).confirmRedeem(operationId1);
            expect(await USDT.balanceOf(user0)).to.be.equal(redeemValue0 + redeemValue1);
        });

        it('Test changeGuardian for agent accountant', async () => {
            const { agent, poolOwner, randAccount } = await loadFixture(deployNitrogenV11WithUSDT);
            await expect(agent.connect(randAccount).changeGuardian(randAccount)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );
            await agent.connect(poolOwner).changeGuardian(randAccount);
        });

        it('Test pause agent accountant (conner cases)', async () => {
            const { agent, randAccount } = await loadFixture(deployNitrogenV11WithUSDT);
            await agent.pauseAll();
            await agent.pauseAll();

            await expect(agent.connect(randAccount).pauseAll()).to.be.rejectedWith('EBadSender()');
            await expect(agent.connect(randAccount).pauseRequestDeposit()).to.be.rejectedWith(
                'EBadSender()',
            );
            await expect(agent.connect(randAccount).pauseRequestRedeem()).to.be.rejectedWith(
                'EBadSender()',
            );

            await expect(agent.connect(randAccount).unpauseAll()).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );
            await expect(agent.connect(randAccount).unpauseRequestDeposit()).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );
            await expect(agent.connect(randAccount).unpauseRequestRedeem()).to.be.rejectedWith(
                'OwnableUnauthorizedAccount',
            );
        });

        it('Test migrate from AgentAccountant to AccountantAgent (Pausable) ', async () => {
            const {
                poolOwner,
                supplyManager,
                moleculaPool,
                rebaseToken,
                user0,
                agent,
                malicious,
                rebaseTokenOwner,
                USDT,
                poolKeeper,
            } = await loadFixture(deployNitrogen);
            const depositValue = 100_000_000n;

            // Grant user wallet with tokens
            await grantERC20(user0, USDT, depositValue);

            // approve USDT to agent
            await USDT.connect(user0).approve(await agent.getAddress(), depositValue);

            // user0 calls requestDeposit on rebaseToken
            await rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0);

            // The migration flow:
            // 0. Deploy pausable agent accountant
            const Agent = await ethers.getContractFactory('AccountantAgent');
            const pausableAgent = await Agent.connect(poolOwner).deploy(
                poolOwner.address,
                rebaseToken,
                supplyManager,
                USDT,
                poolOwner.address,
            );
            // 1. Disable a previous Agent in SupplyManager
            await supplyManager.setAgent(agent, false);
            // 2. Ensure to satisfy all pending requests (if any).
            expect(await moleculaPool.valueToRedeem()).to.be.equal(0);
            // 3. Change accountant agent in RebaseToken
            await rebaseToken.connect(rebaseTokenOwner).setAccountant(pausableAgent);
            // 4. Add new accountant agent to SupplyManager
            await supplyManager.connect(poolOwner).setAgent(pausableAgent, true);

            // Check pause functional
            await pausableAgent.pauseAll();
            await expect(
                rebaseToken
                    .connect(user0)
                    .requestRedeem(await rebaseToken.sharesOf(user0), user0, user0),
            ).to.be.rejectedWith('ERequestRedeemPaused');
            await pausableAgent.unpauseAll();

            // user asks for redeem
            const tx = await rebaseToken
                .connect(user0)
                .requestRedeem(await rebaseToken.sharesOf(user0), user0, user0);
            const { operationId, redeemValue } = await findRequestRedeemEvent(tx);

            // User redeems their tokens using MoleculaPool
            await USDT.connect(poolKeeper).approve(await pausableAgent.getAddress(), redeemValue);
            await moleculaPool.connect(poolOwner).redeem([operationId]);
            await rebaseToken.connect(malicious).confirmRedeem(operationId);
            // User get their tokens back
            expect(await USDT.balanceOf(user0)).to.be.greaterThan(0n);
            expect(await USDT.balanceOf(user0)).to.be.equal(redeemValue);
        });
    });

    describe('Test Router', () => {
        it('Should deposit and redeem via router', async () => {
            const { router, routerAgent, USDC, user0, user1, user2, operator, rebaseToken } =
                await loadFixture(deployNitrogenV11WithRouter);

            const decimals: bigint = await USDC.decimals();
            const depositValue = 100n * 10n ** decimals;

            // Grand USD and approve tokens for routerAgent
            await grantERC20(user0, USDC, 2n * depositValue);
            await USDC.connect(user0).approve(routerAgent, 2n * depositValue);

            // user0 sets operator and deposit tokens two times
            await router.connect(user0).setOperator(operator, true);
            await router.connect(operator).requestDeposit(depositValue, user1, user0, USDC);
            await router.connect(user0).requestDeposit(depositValue, user1, user0, USDC);

            const shares = 100n * 10n ** 18n;
            expect(await rebaseToken.balanceOf(user1)).to.be.equal(2n * shares);

            // user1 request redeem
            expect(await USDC.balanceOf(user1)).to.be.equal(0);

            await router.connect(user1).redeemImmediately(shares, user1, user1, USDC);
            expect(await rebaseToken.balanceOf(user1)).to.be.equal(shares);
            expect(await USDC.balanceOf(user1)).to.be.equal(depositValue);
            expect(await USDC.balanceOf(user2)).to.be.equal(0);

            // operator requests redeem in behalf of user1 and gives tokens to user2
            await router.connect(user1).setOperator(operator, true);
            await router.connect(operator).redeemImmediately(shares, user2, user1, USDC);
            expect(await rebaseToken.balanceOf(user1)).to.be.equal(0);
            expect(await USDC.balanceOf(user1)).to.be.equal(depositValue);
            expect(await USDC.balanceOf(user2)).to.be.equal(depositValue);
        });

        it('Should deposit and redeem in one transaction via router', async () => {
            const {
                router,
                routerAgent,
                USDC,
                user0,
                rebaseToken,
                supplyManager,
                moleculaPool,
                poolKeeper,
                randAccount,
                poolOwner,
            } = await loadFixture(deployNitrogenV11WithRouter);

            const decimals: bigint = await USDC.decimals();
            const depositValue = 100n * 10n ** decimals;

            // Grand USD and approve tokens for routerAgent
            await grantERC20(user0, USDC, depositValue);
            await USDC.connect(user0).approve(routerAgent, depositValue);

            // user0 deposits tokens
            await router.connect(user0).requestDeposit(depositValue, user0, user0, USDC);
            const shares = 100n * 10n ** 18n;
            expect(await rebaseToken.balanceOf(user0)).to.be.equal(shares);

            // user0 request redeem
            let tx = await router.connect(user0).redeemImmediately(shares / 2n, user0, user0, USDC);
            await tx.wait();
            let { operationId } = await findRequestRedeemEvent(tx);
            await expect(tx)
                .to.emit(supplyManager, 'Redeem')
                .withArgs([operationId], [depositValue / 2n]);

            // check balance
            expect(await rebaseToken.balanceOf(user0)).to.be.equal(shares / 2n);
            expect(await USDC.balanceOf(user0)).to.be.equal(depositValue / 2n);

            // get rid of USDC from moleculaPool
            await moleculaPool.connect(poolOwner).addInWhiteList(USDC.getAddress());
            const encodedTransfer = USDC.interface.encodeFunctionData('transfer', [
                randAccount.address,
                await USDC.balanceOf(moleculaPool.getAddress()),
            ]);
            await moleculaPool.connect(poolKeeper).execute(USDC.getAddress(), encodedTransfer);

            // user0 request redeem
            tx = await router.connect(user0).requestRedeem(shares / 2n, user0, user0, USDC);
            await tx.wait();
            const eventData = await findRequestRedeemEvent(tx);
            operationId = eventData.operationId;
            expect(await rebaseToken.balanceOf(user0)).to.be.equal(0);
            expect(await USDC.balanceOf(user0)).to.be.equal(depositValue / 2n);

            // Return USDC tokens to moleculaPool
            await USDC.connect(randAccount).transfer(
                moleculaPool.getAddress(),
                await USDC.balanceOf(randAccount),
            );

            // user0 redeems their tokens.
            await moleculaPool.connect(user0).redeem([operationId]);
            expect(await rebaseToken.balanceOf(user0)).to.be.equal(0);
            expect(await USDC.balanceOf(user0)).to.be.equal(50_000_000);

            // user0 confirms redeem.
            await router.connect(user0).confirmRedeem(operationId);
            expect(await USDC.balanceOf(user0)).to.be.equal(50_000_000 + 33_333_333);
        });

        it('Test min deposit value', async () => {
            const { router, routerAgent, USDC, user0, rebaseToken } = await loadFixture(
                deployNitrogenV11WithRouter,
            );

            const decimals: bigint = await USDC.decimals();
            const depositValue = 5n * 10n ** (decimals - 1n);

            // Grand USD and approve tokens for routerAgent
            await grantERC20(user0, USDC, depositValue);
            await USDC.connect(user0).approve(routerAgent, depositValue);

            // Fail to deposit, set new min deposit value and deposit
            await expect(
                router.connect(user0).requestDeposit(depositValue, user0, user0, USDC),
            ).to.be.rejectedWith('ETooLowDepositValue(');
            await router.setMinDepositValue(USDC, depositValue);
            await router.connect(user0).requestDeposit(depositValue, user0, user0, USDC);
            expect(await rebaseToken.balanceOf(user0)).to.be.greaterThan(0n);

            // Fail to set min deposit value (no such token)
            await expect(router.setMinDepositValue(user0.address, depositValue)).to.be.rejectedWith(
                'ENoAgent(',
            );
        });

        it('Should pause/unpause', async () => {
            const { router, routerAgent, USDC, user0, rebaseToken, poolOwner, guardian } =
                await loadFixture(deployNitrogenV11WithRouter);

            const decimals: bigint = await USDC.decimals();
            const depositValue = 100n * 10n ** decimals;

            // Grand USD and approve tokens for routerAgent
            const depositQty = 4n;
            await grantERC20(user0, USDC, depositQty * depositValue);
            await USDC.connect(user0).approve(routerAgent, depositQty * depositValue);

            // pause/unpause request deposit for token
            await router.connect(guardian).pauseTokenRequestDeposit(USDC);
            await expect(
                router.connect(user0).requestDeposit(depositValue, user0, user0, USDC),
            ).to.be.rejectedWith('ETokenRequestDepositPaused(');
            await router.connect(poolOwner).unpauseTokenRequestDeposit(USDC);
            await router.connect(user0).requestDeposit(depositValue, user0, user0, USDC);

            // pause/unpause request deposit for all tokens
            await router.connect(guardian).pauseRequestDeposit();
            await router.connect(guardian).pauseRequestDeposit(); // Must be ok if call again
            await expect(
                router.connect(user0).requestDeposit(depositValue, user0, user0, USDC),
            ).to.be.rejectedWith('ERequestDepositPaused(');
            await router.connect(poolOwner).unpauseRequestDeposit();
            await router.connect(poolOwner).unpauseRequestDeposit(); // Must be ok if call again
            await router.connect(user0).requestDeposit(depositValue, user0, user0, USDC);

            // pause/unpause request deposit and redeem for token
            await router.connect(guardian).pauseToken(USDC);
            await expect(
                router.connect(user0).requestDeposit(depositValue, user0, user0, USDC),
            ).to.be.rejectedWith('ETokenRequestDepositPaused(');
            await router.connect(poolOwner).unpauseToken(USDC);
            await router.connect(user0).requestDeposit(depositValue, user0, user0, USDC);

            // pause/unpause request deposit and redeem for all token
            await router.connect(guardian).pauseAll();
            await expect(
                router.connect(user0).requestDeposit(depositValue, user0, user0, USDC),
            ).to.be.rejectedWith('ERequestDepositPaused(');
            await router.connect(poolOwner).unpauseAll();
            await router.connect(user0).requestDeposit(depositValue, user0, user0, USDC);

            const shares = 100n * 10n ** 18n;

            // pause/unpause request redeem for token
            await router.connect(guardian).pauseTokenRequestRedeem(USDC);
            await expect(
                router.connect(user0).redeemImmediately(shares, user0, user0, USDC),
            ).to.be.rejectedWith('ETokenRequestRedeemPaused(');
            await router.connect(poolOwner).unpauseTokenRequestRedeem(USDC);
            await router.connect(user0).redeemImmediately(shares, user0, user0, USDC);

            // pause/unpause request redeem for all token
            await router.connect(guardian).pauseRequestRedeem();
            await router.connect(guardian).pauseRequestRedeem(); // Must be ok if call again
            await expect(
                router.connect(user0).redeemImmediately(shares, user0, user0, USDC),
            ).to.be.rejectedWith('ERequestRedeemPaused(');
            await router.connect(poolOwner).unpauseRequestRedeem();
            await router.connect(poolOwner).unpauseRequestRedeem(); // Must be ok if call again
            await router.connect(user0).redeemImmediately(shares, user0, user0, USDC);

            // pause/unpause request deposit and redeem for token
            await router.connect(guardian).pauseToken(USDC);
            await expect(
                router.connect(user0).redeemImmediately(shares, user0, user0, USDC),
            ).to.be.rejectedWith('ETokenRequestRedeemPaused(');
            await router.connect(poolOwner).unpauseToken(USDC);
            await router.connect(user0).redeemImmediately(shares, user0, user0, USDC);

            // pause/unpause request deposit and redeem for all token
            await router.connect(guardian).pauseAll();
            await expect(
                router.connect(user0).redeemImmediately(shares, user0, user0, USDC),
            ).to.be.rejectedWith('ERequestRedeemPaused(');
            await router.connect(poolOwner).unpauseAll();
            await router.connect(user0).redeemImmediately(shares, user0, user0, USDC);

            // check user0's balances
            expect(await rebaseToken.balanceOf(user0)).to.be.equal(0);
            expect(await USDC.balanceOf(user0)).to.be.equal(depositQty * depositValue);
        });

        it('Should set parameters', async () => {
            const { router, user0, user1, rebaseToken, poolOwner } = await loadFixture(
                deployNitrogenV11WithRouter,
            );

            await router.callRebaseToken(
                rebaseToken.interface.encodeFunctionData('setAccountant', [user0.address]),
            );
            expect(await rebaseToken.accountant()).to.be.equal(user0);

            await router.callRebaseToken(
                rebaseToken.interface.encodeFunctionData('setOracle', [user1.address]),
            );
            expect(await rebaseToken.oracle()).to.be.equal(user1);

            await router.callRebaseToken(
                rebaseToken.interface.encodeFunctionData('setMinDepositValue', [123]),
            );
            expect(await rebaseToken.minDepositValue()).to.be.equal(123);

            await router.callRebaseToken(
                rebaseToken.interface.encodeFunctionData('setMinRedeemValue', [1234]),
            );
            expect(await rebaseToken.minRedeemValue()).to.be.equal(1234);

            await expect(
                router
                    .connect(poolOwner)
                    .callRebaseToken(
                        rebaseToken.interface.encodeFunctionData('transferOwnership', [
                            user0.address,
                        ]),
                    ),
            ).to.be.rejectedWith('EBadSelector()');

            await router.changeGuardian(user0);
            expect(await router.guardian()).to.be.equal(user0);
        });

        it('Should remove token', async () => {
            const { router, USDC, user0 } = await loadFixture(deployNitrogenV11WithRouter);

            // Remove token
            await router.removeToken(USDC);
            await expect(router.removeToken(USDC)).to.be.rejectedWith('EAlreadyRemoved(');
            await expect(
                router.connect(user0).requestDeposit(1, user0, user0, USDC),
            ).to.be.rejectedWith('ENoAgent(');
            await expect(
                router.connect(user0).redeemImmediately(1, user0, user0, USDC),
            ).to.be.rejectedWith('ENoAgent(');
        });

        it('Distribute yield via router routerAgent', async () => {
            const { routerAgent, rebaseToken, USDC, user1, supplyManager, moleculaPool } =
                await loadFixture(deployNitrogenV11WithRouter);

            // generate income
            const decimals: bigint = await USDC.decimals();
            const income = 100500n * 10n ** decimals;
            await grantERC20(await moleculaPool.getAddress(), USDC, income);

            // distribute yield
            const party = {
                parties: [
                    {
                        party: user1,
                        portion: 10n ** 18n,
                    },
                ],
                agent: await routerAgent.getAddress(),
                ethValue: 0n,
            };
            expect(await rebaseToken.balanceOf(user1)).to.equal(0);
            await supplyManager.distributeYield([party], 5000);
            expect(await rebaseToken.balanceOf(user1)).to.greaterThan(0);
        });

        it('White list for agents in the router', async () => {
            const { router, randAccount, supplyManager, DAI } = await loadFixture(
                deployNitrogenV11WithRouter,
            );

            // Create new dai routerAgent and add it in router
            const Agent = await ethers.getContractFactory('RouterAgent');
            const daiAgent = await Agent.connect(randAccount).deploy(
                randAccount.address,
                router.getAddress(),
                supplyManager,
            );
            await daiAgent.connect(randAccount).setErc20Token(DAI);
            await router.addAgent(daiAgent.getAddress(), false, false, 10n ** 6n, 10n ** 18n);

            // Remove dia routerAgent
            await router.removeToken(DAI);

            // Remove code hash from white list
            const codeHash = keccak256((await daiAgent.getDeployedCode())!);
            await router.setAgentCodeHashInWhiteList(codeHash, false);
            await expect(router.setAgentCodeHashInWhiteList(codeHash, false)).to.be.rejectedWith(
                'EAlreadySetStatus()',
            );

            // Fail to add dai routerAgent
            await expect(
                router.addAgent(daiAgent.getAddress(), false, false, 10n ** 6n, 10n ** 18n),
            ).to.be.rejectedWith('AgentCodeHashIsNotInWhiteList()');
        });

        it('Test router.{deposit,redeem} errors', async () => {
            const { user0, user1, router, routerAgent, USDC } = await loadFixture(
                deployNitrogenV11WithRouter,
            );

            await expect(router.redeem([], [])).to.be.rejectedWith('EEmptyArray(');
            await expect(router.confirmRedeem(123)).to.be.rejectedWith('EBadOperationParameters(');

            const decimals: bigint = await USDC.decimals();
            const depositValue = 100n * 10n ** decimals;

            // Grand USD and approve tokens for routerAgent
            await grantERC20(user0, USDC, depositValue);
            await USDC.connect(user0).approve(routerAgent, depositValue);

            await expect(
                router.connect(user1).requestDeposit(depositValue, user1, user0, USDC),
            ).to.be.rejectedWith('EBadOwner(');
            await router.connect(user0).requestDeposit(depositValue, user0, user0, USDC);

            const shares = 100n * 10n ** 18n;

            await expect(
                router.connect(user1).requestRedeem(shares, user1, user0, USDC),
            ).to.be.rejectedWith('EBadOwner(');
            await expect(
                router.connect(user0).requestRedeem(1, user0, user0, USDC),
            ).to.be.rejectedWith('ETooLowRedeemValue(');

            const tx = await router
                .connect(user0)
                .requestRedeem(ethers.MaxUint256, user0, user0, USDC);
            const operationId0 = (await findRequestRedeemEvent(tx)).operationId;

            await expect(router.redeem([operationId0], [1])).to.be.rejectedWith('EBadSender(');
        });

        it('Test router errors', async () => {
            const { router, supplyManager, routerAgent, randAccount, USDC, DAI, rebaseToken } =
                await loadFixture(deployNitrogenV11WithRouter);

            // Create new dai routerAgent
            const Agent = await ethers.getContractFactory('RouterAgent');
            const daiAgent = await Agent.connect(randAccount).deploy(
                randAccount.address,
                router.getAddress(),
                supplyManager,
            );
            // await daiAgent.connect(randAccount).setErc20Token(DAI);
            await expect(
                router
                    .connect(randAccount)
                    .addAgent(daiAgent.getAddress(), false, false, 10n ** 6n, 10n ** 18n),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount(');
            await expect(
                router.addAgent(daiAgent.getAddress(), false, false, 10n ** 6n, 10n ** 18n),
            ).to.be.rejectedWith('EZeroAddress(');
            await expect(
                router.addAgent(routerAgent.getAddress(), false, false, 10n ** 6n, 10n ** 18n),
            ).to.be.rejectedWith('EAlreadyHasToken(');

            await expect(router.connect(randAccount).callRebaseToken('0x')).to.be.rejectedWith(
                'OwnableUnauthorizedAccount(',
            );

            await expect(
                router.connect(randAccount).setMinDepositValue(USDC, 0),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount(');
            await expect(router.connect(randAccount).removeToken(USDC)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount(',
            );

            await expect(
                router.callRebaseToken(
                    rebaseToken.interface.encodeFunctionData('renounceOwnership'),
                ),
            ).to.be.rejectedWith('EBadSelector(');
            await expect(
                router.callRebaseToken(
                    rebaseToken.interface.encodeFunctionData('mint', [ethers.ZeroAddress, 0]),
                ),
            ).to.be.rejectedWith('EBadSelector(');
            await expect(
                router.callRebaseToken(
                    rebaseToken.interface.encodeFunctionData('burn', [ethers.ZeroAddress, 0]),
                ),
            ).to.be.rejectedWith('EBadSelector(');

            await expect(router.connect(randAccount).changeGuardian(USDC)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount(',
            );
            await expect(router.changeGuardian(ethers.ZeroAddress)).to.be.rejectedWith(
                'EZeroAddress(',
            );

            await expect(router.connect(randAccount).pauseRequestDeposit()).to.be.rejectedWith(
                'EBadSender(',
            );
            await expect(router.connect(randAccount).unpauseRequestDeposit()).to.be.rejectedWith(
                'OwnableUnauthorizedAccount(',
            );

            await expect(router.connect(randAccount).pauseRequestRedeem()).to.be.rejectedWith(
                'EBadSender(',
            );
            await expect(router.connect(randAccount).unpauseRequestRedeem()).to.be.rejectedWith(
                'OwnableUnauthorizedAccount(',
            );

            await expect(router.connect(randAccount).pauseAll()).to.be.rejectedWith('EBadSender(');
            await expect(router.connect(randAccount).unpauseAll()).to.be.rejectedWith(
                'OwnableUnauthorizedAccount(',
            );

            await expect(
                router.connect(randAccount).pauseTokenRequestDeposit(USDC),
            ).to.be.rejectedWith('EBadSender(');
            await expect(
                router.connect(randAccount).unpauseTokenRequestDeposit(USDC),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount(');

            await expect(
                router.connect(randAccount).pauseTokenRequestRedeem(USDC),
            ).to.be.rejectedWith('EBadSender(');
            await expect(
                router.connect(randAccount).unpauseTokenRequestRedeem(USDC),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount(');

            await expect(router.connect(randAccount).pauseToken(USDC)).to.be.rejectedWith(
                'EBadSender(',
            );
            await expect(router.connect(randAccount).unpauseToken(USDC)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount(',
            );

            await expect(
                router.connect(randAccount).setAgentCodeHashInWhiteList(ethers.ZeroHash, false),
            ).to.be.rejectedWith('OwnableUnauthorizedAccount(');

            await expect(router.pauseTokenRequestDeposit(DAI)).to.be.rejectedWith('ENoAgent(');
            await expect(router.pauseTokenRequestRedeem(DAI)).to.be.rejectedWith('ENoAgent(');
        });

        it('Test routerAgent errors', async () => {
            const { routerAgent, randAccount, USDC } = await loadFixture(
                deployNitrogenV11WithRouter,
            );

            await expect(
                routerAgent.connect(randAccount).setErc20Token(ethers.ZeroAddress),
            ).to.be.rejectedWith('EZeroAddress()');
            await expect(routerAgent.connect(randAccount).setErc20Token(USDC)).to.be.rejectedWith(
                'OwnableUnauthorizedAccount(',
            );
            await expect(routerAgent.setErc20Token(USDC)).to.be.rejectedWith('EAlreadySetToken()');

            await expect(
                routerAgent.connect(randAccount).requestDeposit(0, ethers.ZeroAddress, 0),
            ).to.be.rejectedWith('EBadSender(');
            await expect(
                routerAgent
                    .connect(randAccount)
                    .requestDeposit(0, ethers.ZeroAddress, 0, { value: 1n }),
            ).to.be.rejectedWith('EMsgValueIsNotZero()');

            await expect(routerAgent.connect(randAccount).requestRedeem(0, 0)).to.be.rejectedWith(
                'EBadSender(',
            );

            await expect(
                routerAgent
                    .connect(randAccount)
                    .redeem(ethers.ZeroAddress, [], [], 0, { value: 1n }),
            ).to.be.rejectedWith('EMsgValueIsNotZero()');
            await expect(
                routerAgent.connect(randAccount).redeem(ethers.ZeroAddress, [], [], 0),
            ).to.be.rejectedWith('EBadSender()');

            await expect(
                routerAgent.connect(randAccount).confirmRedeem(ethers.ZeroAddress, 0),
            ).to.be.rejectedWith('EBadSender()');

            await expect(
                routerAgent.connect(randAccount).distribute([], [], { value: 1n }),
            ).to.be.rejectedWith('EMsgValueIsNotZero()');
            await expect(routerAgent.connect(randAccount).distribute([], [])).to.be.rejectedWith(
                'EBadSender()',
            );
        });
    });
});

/* eslint-disable camelcase, max-lines, no-await-in-loop, no-restricted-syntax, no-bitwise, no-plusplus */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { keccak256 } from 'ethers';
import { ethers } from 'hardhat';

import { deployNitrogenV11WithRouter } from '../utils/NitrogenCommonV1.1';
import { findRequestRedeemEvent } from '../utils/event';
import { grantERC20 } from '../utils/grant';

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
                    rebaseToken.interface.encodeFunctionData('transferOwnership', [user0.address]),
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
        await expect(router.connect(user0).requestRedeem(1, user0, user0, USDC)).to.be.rejectedWith(
            'ETooLowRedeemValue(',
        );

        const tx = await router.connect(user0).requestRedeem(ethers.MaxUint256, user0, user0, USDC);
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

        await expect(router.connect(randAccount).setMinDepositValue(USDC, 0)).to.be.rejectedWith(
            'OwnableUnauthorizedAccount(',
        );
        await expect(router.connect(randAccount).removeToken(USDC)).to.be.rejectedWith(
            'OwnableUnauthorizedAccount(',
        );

        await expect(
            router.callRebaseToken(rebaseToken.interface.encodeFunctionData('renounceOwnership')),
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
        await expect(router.changeGuardian(ethers.ZeroAddress)).to.be.rejectedWith('EZeroAddress(');

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

        await expect(router.connect(randAccount).pauseTokenRequestDeposit(USDC)).to.be.rejectedWith(
            'EBadSender(',
        );
        await expect(
            router.connect(randAccount).unpauseTokenRequestDeposit(USDC),
        ).to.be.rejectedWith('OwnableUnauthorizedAccount(');

        await expect(router.connect(randAccount).pauseTokenRequestRedeem(USDC)).to.be.rejectedWith(
            'EBadSender(',
        );
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
        const { routerAgent, randAccount, USDC } = await loadFixture(deployNitrogenV11WithRouter);

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
            routerAgent.connect(randAccount).redeem(ethers.ZeroAddress, [], [], 0, { value: 1n }),
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

/* eslint-disable camelcase, max-lines, no-await-in-loop, no-restricted-syntax, no-bitwise, no-plusplus */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { keccak256 } from 'ethers';
import { ethers } from 'hardhat';

import { expectEqual } from '../../utils/Common';
import { deployNitrogenV11WithTokenVault, getRidOf } from '../../utils/NitrogenCommonV1.1';
import { findRequestRedeemEvent } from '../../utils/event';
import { FAUCET, grantERC20 } from '../../utils/grant';

describe('Test TokenVault', () => {
    it('Should deposit and redeem via tokenUSDCVault', async () => {
        const { tokenUSDCVault, USDC, user0, user1, user2, operator, rebaseToken } =
            await loadFixture(deployNitrogenV11WithTokenVault);

        const decimals: bigint = await USDC.decimals();
        const depositValue = 100n * 10n ** decimals;

        // Grand USD and approve tokens for tokenUSDCVault
        await grantERC20(user0, USDC, 2n * depositValue);
        await USDC.connect(user0).approve(tokenUSDCVault, 2n * depositValue);

        // user0 sets operator and deposit tokens two times
        await tokenUSDCVault.connect(user0).setOperator(operator, true);
        await tokenUSDCVault
            .connect(operator)
            ['deposit(uint256,address,address)'](depositValue, user1, user0);
        await tokenUSDCVault
            .connect(user0)
            ['deposit(uint256,address,address)'](depositValue, user1, user0);

        const shares = 100n * 10n ** 18n;
        expect(await rebaseToken.balanceOf(user1)).to.be.equal(2n * shares);

        // user1 request redeem
        expect(await USDC.balanceOf(user1)).to.be.equal(0);

        await tokenUSDCVault.connect(user1).redeemImmediately(shares, user1, user1);
        expect(await rebaseToken.balanceOf(user1)).to.be.equal(shares);
        expect(await USDC.balanceOf(user1)).to.be.equal(depositValue);
        expect(await USDC.balanceOf(user2)).to.be.equal(0);

        // operator requests redeem on behalf of user1 and gives tokens to user2
        await tokenUSDCVault.connect(user1).setOperator(operator, true);
        await tokenUSDCVault.connect(operator).redeemImmediately(shares, user2, user1);
        expect(await rebaseToken.balanceOf(user1)).to.be.equal(0);
        expect(await USDC.balanceOf(user1)).to.be.equal(depositValue);
        expect(await USDC.balanceOf(user2)).to.be.equal(depositValue);

        await expect(
            tokenUSDCVault.connect(user0).redeemImmediately(1, user1, user1),
        ).to.be.rejectedWith('EInvalidOperator');
    });

    it('Should deposit and redeemImmediately using claimableRedeemAssets', async () => {
        const { tokenUSDCVault, USDC, user0, rebaseToken, moleculaPool } = await loadFixture(
            deployNitrogenV11WithTokenVault,
        );

        const decimals: bigint = await USDC.decimals();
        const depositValue = 100n * 10n ** decimals;

        // Grand USD and approve tokens for tokenUSDCVault
        await grantERC20(user0, USDC, depositValue);
        await USDC.connect(user0).approve(tokenUSDCVault, depositValue);

        // user0 deposits tokens
        await tokenUSDCVault
            .connect(user0)
            ['deposit(uint256,address,address)'](depositValue, user0, user0);
        const shares = 100n * 10n ** 18n;

        // Generate yield
        await grantERC20(moleculaPool, USDC, 3n * depositValue);
        expect(await rebaseToken.sharesOf(user0)).to.be.equal(shares);

        // See redeemImmediately `if (shares <= claimableRedeemShares) {`
        expect(await tokenUSDCVault.claimableRedeemAssets(user0)).to.be.equal(0);
        const tx = await tokenUSDCVault.connect(user0).requestRedeem(shares / 3n, user0, user0);
        const redeemEvent = await findRequestRedeemEvent(tx);
        await moleculaPool.redeem([redeemEvent.operationId]);
        expect(await tokenUSDCVault.claimableRedeemAssets(user0)).to.be.greaterThan(0);
        await tokenUSDCVault.connect(user0).redeemImmediately(shares / 4n, user0, user0);
        expect(await tokenUSDCVault.claimableRedeemAssets(user0)).to.be.greaterThan(0);

        // See redeemImmediately `if (shares <= claimableRedeemShares) {` is not true
        const restShares = await rebaseToken.sharesOf(user0);
        await tokenUSDCVault.connect(user0).redeemImmediately(restShares, user0, user0);
        expectEqual(await tokenUSDCVault.claimableRedeemAssets(user0), 0n);

        // Check user's balance
        expectEqual(await USDC.balanceOf(user0), 160n * 10n ** decimals, 18, 9);
    });

    it('Should deposit and redeem in one transaction via tokenUSDCVault', async () => {
        const {
            tokenUSDCVault,
            USDC,
            user0,
            rebaseToken,
            supplyManager,
            moleculaPool,
            poolKeeper,
            randAccount,
            poolOwner,
        } = await loadFixture(deployNitrogenV11WithTokenVault);

        const decimals: bigint = await USDC.decimals();
        const depositValue = 100n * 10n ** decimals;

        // Grand USD and approve tokens for tokenUSDCVault
        await grantERC20(user0, USDC, depositValue);
        await USDC.connect(user0).approve(tokenUSDCVault, depositValue);

        // user0 deposits tokens
        await tokenUSDCVault
            .connect(user0)
            ['deposit(uint256,address,address)'](depositValue, user0, user0);
        const shares = 100n * 10n ** 18n;
        expect(await rebaseToken.balanceOf(user0)).to.be.equal(shares);

        // user0 request redeem
        let tx = await tokenUSDCVault.connect(user0).redeemImmediately(shares / 2n, user0, user0);
        await tx.wait();
        let { operationId } = await findRequestRedeemEvent(tx);
        await expect(tx)
            .to.emit(supplyManager, 'Redeem')
            .withArgs([operationId], [depositValue / 2n]);

        // check balance
        expect(await rebaseToken.balanceOf(user0)).to.be.equal(shares / 2n);
        expect(await USDC.balanceOf(user0)).to.be.equal(depositValue / 2n);

        // get rid of USDC from moleculaPool
        await getRidOf(moleculaPool, poolOwner, USDC, randAccount.address, poolKeeper);

        // user0 request redeem
        tx = await tokenUSDCVault.connect(user0).requestRedeem(shares / 2n, user0, user0);
        await tx.wait();
        const eventData = await findRequestRedeemEvent(tx);
        operationId = eventData.operationId;
        expect(await rebaseToken.balanceOf(user0)).to.be.equal(0);
        expect(await USDC.balanceOf(user0)).to.be.equal(depositValue / 2n);

        // Return USDC tokens to moleculaPool
        await USDC.connect(randAccount).transfer(moleculaPool, await USDC.balanceOf(randAccount));

        // user0 redeems their tokens.
        await moleculaPool.connect(user0).redeem([operationId]);
        expectEqual(await rebaseToken.balanceOf(user0), 0n);
        expect(await USDC.balanceOf(user0)).to.be.equal(50_000_000);

        // user0 confirms redeem.
        const claimableRedeemAssets = await tokenUSDCVault.claimableRedeemAssets(user0);
        await tokenUSDCVault.connect(user0).withdraw(claimableRedeemAssets, user0, user0);
        // expect(await USDC.balanceOf(user0)).to.be.equal(50_000_000 + 33_333_333);
    });

    it('Test set min deposit / redeem value', async () => {
        const { tokenUSDCVault, USDC, user0, rebaseToken } = await loadFixture(
            deployNitrogenV11WithTokenVault,
        );

        const decimals: bigint = await USDC.decimals();
        const depositValue = 5n * 10n ** (decimals - 1n);

        // Grand USD and approve tokens for tokenUSDCVault
        await grantERC20(user0, USDC, depositValue);
        await USDC.connect(user0).approve(tokenUSDCVault, depositValue);

        // Fail to deposit, set new min deposit value and deposit
        await expect(
            tokenUSDCVault
                .connect(user0)
                ['deposit(uint256,address,address)'](depositValue, user0, user0),
        ).to.be.rejectedWith('ETooLowDepositAssets(');
        await tokenUSDCVault.setMinDepositAssets(depositValue);
        await tokenUSDCVault
            .connect(user0)
            ['deposit(uint256,address,address)'](depositValue, user0, user0);
        expect(await rebaseToken.balanceOf(user0)).to.be.greaterThan(0n);

        await tokenUSDCVault.setMinRedeemShares(12345);
        expect(await tokenUSDCVault.minRedeemShares()).to.be.equal(12345);
    });

    it('Should pause/unpause', async () => {
        const { tokenUSDCVault, USDC, user0, rebaseToken, poolOwner, guardian } = await loadFixture(
            deployNitrogenV11WithTokenVault,
        );

        const decimals: bigint = await USDC.decimals();
        const depositValue = 100n * 10n ** decimals;

        // Grand USD and approve tokens for tokenUSDCVault
        const depositQty = 2n;
        await grantERC20(user0, USDC, depositQty * depositValue);
        await USDC.connect(user0).approve(tokenUSDCVault, depositQty * depositValue);

        // pause and unpause request deposit and then call requestDeposit
        await tokenUSDCVault.connect(guardian).pauseRequestDeposit();
        await expect(
            tokenUSDCVault
                .connect(user0)
                ['deposit(uint256,address,address)'](depositValue, user0, user0),
        ).to.be.rejectedWith('EFunctionPaused(');
        await tokenUSDCVault.connect(poolOwner).unpauseRequestDeposit();
        await tokenUSDCVault
            .connect(user0)
            ['deposit(uint256,address,address)'](depositValue, user0, user0);

        // pauseAll and unpauseAll and then call requestDeposit
        await tokenUSDCVault.connect(guardian).pauseAll();
        await expect(
            tokenUSDCVault
                .connect(user0)
                ['deposit(uint256,address,address)'](depositValue, user0, user0),
        ).to.be.rejectedWith('EFunctionPaused("');
        await tokenUSDCVault.connect(poolOwner).unpauseAll();
        await tokenUSDCVault
            .connect(user0)
            ['deposit(uint256,address,address)'](depositValue, user0, user0);

        const shares = 100n * 10n ** 18n;

        // pause and unpause requestRedeem and then call redeemImmediately
        await tokenUSDCVault.connect(guardian).pauseRequestRedeem();
        await expect(
            tokenUSDCVault.connect(user0).redeemImmediately(shares, user0, user0),
        ).to.be.rejectedWith('EFunctionPaused("');
        await tokenUSDCVault.connect(poolOwner).unpauseRequestRedeem();
        await tokenUSDCVault.connect(user0).redeemImmediately(shares, user0, user0);

        // pauseAll and unpauseAll and then call redeemImmediately
        await tokenUSDCVault.connect(guardian).pauseAll();
        await expect(
            tokenUSDCVault.connect(user0).redeemImmediately(shares, user0, user0),
        ).to.be.rejectedWith('EFunctionPaused("');
        await tokenUSDCVault.connect(poolOwner).unpauseAll();
        await tokenUSDCVault.connect(user0).redeemImmediately(shares, user0, user0);

        // check user0's balances
        expect(await rebaseToken.balanceOf(user0)).to.be.equal(0);
        expect(await USDC.balanceOf(user0)).to.be.equal(depositQty * depositValue);
    });

    it('Should set parameters', async () => {
        const { rebaseTokenOwner, user0, user1, rebaseToken, poolOwner } = await loadFixture(
            deployNitrogenV11WithTokenVault,
        );

        await rebaseTokenOwner.callRebaseToken(
            rebaseToken.interface.encodeFunctionData('setAccountant', [user0.address]),
        );
        expect(await rebaseToken.accountant()).to.be.equal(user0);

        await rebaseTokenOwner.callRebaseToken(
            rebaseToken.interface.encodeFunctionData('setOracle', [user1.address]),
        );
        expect(await rebaseToken.oracle()).to.be.equal(user1);

        await rebaseTokenOwner.callRebaseToken(
            rebaseToken.interface.encodeFunctionData('setMinDepositValue', [123]),
        );
        expect(await rebaseToken.minDepositValue()).to.be.equal(123);

        await rebaseTokenOwner.callRebaseToken(
            rebaseToken.interface.encodeFunctionData('setMinRedeemValue', [1234]),
        );
        expect(await rebaseToken.minRedeemValue()).to.be.equal(1234);

        await expect(
            rebaseTokenOwner
                .connect(poolOwner)
                .callRebaseToken(
                    rebaseToken.interface.encodeFunctionData('transferOwnership', [user0.address]),
                ),
        ).to.be.rejectedWith('EBadSelector()');

        await rebaseTokenOwner.changeGuardian(user0);
        expect(await rebaseTokenOwner.guardian()).to.be.equal(user0);
    });

    it('Should remove token', async () => {
        const { tokenUSDCVault, rebaseTokenOwner, USDC, user0 } = await loadFixture(
            deployNitrogenV11WithTokenVault,
        );

        const decimals: bigint = await USDC.decimals();
        const depositValue = 100n * 10n ** decimals;

        // Grand USD and approve tokens for tokenUSDCVault
        await grantERC20(user0, USDC, depositValue);
        await USDC.connect(user0).approve(tokenUSDCVault, depositValue);

        // Remove token
        await rebaseTokenOwner.removeTokenVault(tokenUSDCVault);
        await expect(rebaseTokenOwner.removeTokenVault(USDC)).to.be.rejectedWith('ENoTokenVault(');
        await expect(
            tokenUSDCVault
                .connect(user0)
                ['deposit(uint256,address,address)'](10n ** 6n, user0, user0),
        ).to.be.rejectedWith('TokenVaultNotAllowed(');
    });

    it('Distribute yield via tokenUSDCVault tokenUSDCVault', async () => {
        const { tokenUSDCVault, rebaseToken, USDC, user1, supplyManager, moleculaPool } =
            await loadFixture(deployNitrogenV11WithTokenVault);

        // generate income
        const decimals: bigint = await USDC.decimals();
        const income = 100500n * 10n ** decimals;
        await grantERC20(moleculaPool, USDC, income);

        // distribute yield
        const party = {
            parties: [
                {
                    party: user1,
                    portion: 10n ** 18n,
                },
            ],
            agent: tokenUSDCVault,
            ethValue: 0n,
        };
        expect(await rebaseToken.balanceOf(user1)).to.equal(0);
        await supplyManager.distributeYield([party], 5000);
        expect(await rebaseToken.balanceOf(user1)).to.greaterThan(0);
    });

    it('White list for agents in the tokenUSDCVault', async () => {
        const { rebaseToken, rebaseTokenOwner, guardian, randAccount, supplyManager, DAI } =
            await loadFixture(deployNitrogenV11WithTokenVault);

        // Create new dai tokenUSDCVault and add it in tokenUSDCVault
        const TokenVault = await ethers.getContractFactory('NitrogenTokenVault');
        const daiTokenVault = await TokenVault.connect(randAccount).deploy(
            randAccount,
            rebaseToken, // share
            supplyManager,
            rebaseTokenOwner,
            guardian,
        );
        await daiTokenVault.connect(randAccount).init(DAI, 10n ** 6n, 10n ** 18n);

        // Add TokenVault into RebaseTokenOwner
        await rebaseTokenOwner.addTokenVault(daiTokenVault);

        // Remove dia tokenUSDCVault
        await rebaseTokenOwner.removeTokenVault(daiTokenVault);

        // Remove code hash from whitelist
        const codeHash = keccak256((await daiTokenVault.getDeployedCode())!);
        await rebaseTokenOwner.setCodeHash(codeHash, false);
        await expect(rebaseTokenOwner.setCodeHash(codeHash, false)).to.be.rejectedWith(
            'EAlreadySetStatus()',
        );

        // Fail to add TokenVault into RebaseTokenOwner
        await expect(rebaseTokenOwner.addTokenVault(daiTokenVault)).to.be.rejectedWith(
            'CodeHashNotInWhiteList()',
        );
    });

    it('Test tokenUSDCVault.{deposit,redeem} errors', async () => {
        const { user0, user1, tokenUSDCVault, USDC } = await loadFixture(
            deployNitrogenV11WithTokenVault,
        );

        const decimals: bigint = await USDC.decimals();
        const depositValue = 100n * 10n ** decimals;

        // Grand USD and approve tokens for tokenUSDCVault
        await grantERC20(user0, USDC, depositValue);
        await USDC.connect(user0).approve(tokenUSDCVault, depositValue);

        await expect(
            tokenUSDCVault
                .connect(user1)
                ['deposit(uint256,address,address)'](depositValue, user1, user0),
        ).to.be.rejectedWith('EInvalidOperator(');
        await tokenUSDCVault
            .connect(user0)
            ['deposit(uint256,address,address)'](depositValue, user0, user0);

        const shares = 100n * 10n ** 18n;

        await expect(
            tokenUSDCVault.connect(user1).requestRedeem(shares, user1, user0),
        ).to.be.rejectedWith('EInvalidOperator(');
        await expect(
            tokenUSDCVault.connect(user0).requestRedeem(1, user0, user0),
        ).to.be.rejectedWith('ETooLowRequestRedeemShares(');

        const restShares = await tokenUSDCVault.maxRedeem(user0);
        const tx = await tokenUSDCVault.connect(user0).requestRedeem(restShares, user0, user0);
        const operationId0 = (await findRequestRedeemEvent(tx)).operationId;

        await expect(
            tokenUSDCVault['redeem(address,uint256[],uint256[],uint256)'](
                user0,
                [operationId0],
                [1],
                1,
            ),
        ).to.be.rejectedWith('ENotAuthorized(');
    });

    it('Test rebaseTokenOwner pause', async () => {
        const { tokenUSDCVault, USDC, user0, rebaseTokenOwner, rebaseToken } = await loadFixture(
            deployNitrogenV11WithTokenVault,
        );

        const decimals: bigint = await USDC.decimals();
        const depositValue = 100n * 10n ** decimals;

        // Grand USD and approve tokens for tokenUSDCVault
        await grantERC20(user0, USDC, 2n * depositValue);
        await USDC.connect(user0).approve(tokenUSDCVault, 2n * depositValue);

        // user0 deposits tokens
        await rebaseTokenOwner.pauseMint();
        await expect(
            tokenUSDCVault.connect(user0).requestDeposit(depositValue, user0, user0),
        ).to.be.rejectedWith('EFunctionPaused("');
        await rebaseTokenOwner.unpauseMint();
        await tokenUSDCVault.connect(user0).requestDeposit(depositValue, user0, user0);

        await rebaseTokenOwner.pauseAll();
        await expect(
            tokenUSDCVault.connect(user0).requestDeposit(depositValue, user0, user0),
        ).to.be.rejectedWith('EFunctionPaused("');
        await rebaseTokenOwner.unpauseAll();
        await tokenUSDCVault.connect(user0).requestDeposit(depositValue, user0, user0);

        const shares = (await rebaseToken.balanceOf(user0)) / 2n;
        // user0 redeem tokens
        await rebaseTokenOwner.pauseBurn();
        await expect(
            tokenUSDCVault.connect(user0).redeemImmediately(shares, user0, user0),
        ).to.be.rejectedWith('EFunctionPaused(');
        await rebaseTokenOwner.unpauseBurn();
        await tokenUSDCVault.connect(user0).redeemImmediately(shares, user0, user0);

        await rebaseTokenOwner.pauseAll();
        await expect(
            tokenUSDCVault.connect(user0).redeemImmediately(shares, user0, user0),
        ).to.be.rejectedWith('EFunctionPaused(');
        await rebaseTokenOwner.unpauseAll();
        await tokenUSDCVault.connect(user0).redeemImmediately(shares, user0, user0);

        await expect(rebaseTokenOwner.connect(user0).pauseMint()).to.be.rejectedWith(
            'ENotAuthorizedForPause(',
        );
        await expect(rebaseTokenOwner.connect(user0).pauseBurn()).to.be.rejectedWith(
            'ENotAuthorizedForPause(',
        );
        await expect(rebaseTokenOwner.connect(user0).unpauseMint()).to.be.rejectedWith(
            'OwnableUnauthorizedAccount(',
        );
        await expect(rebaseTokenOwner.connect(user0).unpauseBurn()).to.be.rejectedWith(
            'OwnableUnauthorizedAccount(',
        );
    });

    it('Test rebaseTokenOwner errors', async () => {
        const {
            supplyManager,
            tokenUSDCVault,
            randAccount,
            USDC,
            rebaseToken,
            rebaseTokenOwner,
            guardian,
        } = await loadFixture(deployNitrogenV11WithTokenVault);

        await expect(rebaseTokenOwner.addTokenVault(tokenUSDCVault)).to.be.rejectedWith(
            'EHasTokenVaultForAsset(',
        );

        // Create new dai tokenVault
        const TokenVault = await ethers.getContractFactory('NitrogenTokenVault');
        const daiTokenVault = await TokenVault.connect(randAccount).deploy(
            randAccount,
            rebaseToken, // share
            supplyManager,
            rebaseTokenOwner,
            guardian,
        );

        await expect(
            rebaseTokenOwner.connect(randAccount).addTokenVault(daiTokenVault),
        ).to.be.rejectedWith('OwnableUnauthorizedAccount(');
        await expect(rebaseTokenOwner.addTokenVault(daiTokenVault)).to.be.rejectedWith(
            'ETokenVaultNotInit(',
        );

        await expect(
            rebaseTokenOwner.connect(randAccount).callRebaseToken('0x'),
        ).to.be.rejectedWith('OwnableUnauthorizedAccount(');

        await expect(tokenUSDCVault.connect(randAccount).setMinDepositAssets(0)).to.be.rejectedWith(
            'OwnableUnauthorizedAccount(',
        );
        await expect(tokenUSDCVault.connect(randAccount).setMinRedeemShares(0)).to.be.rejectedWith(
            'OwnableUnauthorizedAccount(',
        );
        await expect(
            rebaseTokenOwner.connect(randAccount).removeTokenVault(tokenUSDCVault),
        ).to.be.rejectedWith('OwnableUnauthorizedAccount(');
        await expect(rebaseTokenOwner.connect(randAccount).mint(randAccount, 1)).to.be.rejectedWith(
            'TokenVaultNotAllowed(',
        );
        await expect(rebaseTokenOwner.connect(randAccount).burn(randAccount, 1)).to.be.rejectedWith(
            'TokenVaultNotAllowed(',
        );
        await expect(rebaseTokenOwner.connect(randAccount).distribute([], [])).to.be.rejectedWith(
            'TokenVaultNotAllowed(',
        );

        await expect(
            rebaseTokenOwner.callRebaseToken(
                rebaseToken.interface.encodeFunctionData('renounceOwnership'),
            ),
        ).to.be.rejectedWith('EBadSelector(');
        await expect(
            rebaseTokenOwner.callRebaseToken(
                rebaseToken.interface.encodeFunctionData('mint', [ethers.ZeroAddress, 0]),
            ),
        ).to.be.rejectedWith('EBadSelector(');
        await expect(
            rebaseTokenOwner.callRebaseToken(
                rebaseToken.interface.encodeFunctionData('burn', [ethers.ZeroAddress, 0]),
            ),
        ).to.be.rejectedWith('EBadSelector(');

        await expect(tokenUSDCVault.connect(randAccount).changeGuardian(USDC)).to.be.rejectedWith(
            'OwnableUnauthorizedAccount(',
        );
        await expect(tokenUSDCVault.changeGuardian(ethers.ZeroAddress)).to.be.rejectedWith(
            'EZeroAddress(',
        );

        await expect(tokenUSDCVault.connect(randAccount).pauseRequestDeposit()).to.be.rejectedWith(
            'ENotAuthorizedForPause(',
        );
        await expect(
            tokenUSDCVault.connect(randAccount).unpauseRequestDeposit(),
        ).to.be.rejectedWith('OwnableUnauthorizedAccount(');

        await expect(tokenUSDCVault.connect(randAccount).pauseRequestRedeem()).to.be.rejectedWith(
            'ENotAuthorizedForPause(',
        );
        await expect(tokenUSDCVault.connect(randAccount).unpauseRequestRedeem()).to.be.rejectedWith(
            'OwnableUnauthorizedAccount(',
        );

        await expect(tokenUSDCVault.connect(randAccount).pauseAll()).to.be.rejectedWith(
            'ENotAuthorizedForPause(',
        );
        await expect(tokenUSDCVault.connect(randAccount).unpauseAll()).to.be.rejectedWith(
            'OwnableUnauthorizedAccount(',
        );

        await expect(
            rebaseTokenOwner.connect(randAccount).setCodeHash(ethers.ZeroHash, false),
        ).to.be.rejectedWith('OwnableUnauthorizedAccount(');
    });

    it('Test tokenUSDCVault errors', async () => {
        const { tokenUSDCVault, randAccount, USDC } = await loadFixture(
            deployNitrogenV11WithTokenVault,
        );

        await expect(
            tokenUSDCVault.connect(randAccount).init(ethers.ZeroAddress, 0, 0),
        ).to.be.rejectedWith('EZeroAddress()');
        await expect(tokenUSDCVault.connect(randAccount).init(USDC, 1, 1)).to.be.rejectedWith(
            'OwnableUnauthorizedAccount(',
        );
        await expect(tokenUSDCVault.init(USDC, 1, 1)).to.be.rejectedWith('EAlreadyInitialized()');

        await expect(
            tokenUSDCVault
                .connect(randAccount)
                ['deposit(uint256,address,address)'](0, ethers.ZeroAddress, ethers.ZeroAddress),
        ).to.be.rejectedWith('EZeroAddress(');

        await expect(
            tokenUSDCVault
                .connect(randAccount)
                .requestRedeem(0, ethers.ZeroAddress, ethers.ZeroAddress),
        ).to.be.rejectedWith('EInvalidOperator(');
        await expect(
            tokenUSDCVault
                .connect(randAccount)
                .requestWithdraw(0, ethers.ZeroAddress, ethers.ZeroAddress),
        ).to.be.rejectedWith('EInvalidOperator(');

        await expect(
            tokenUSDCVault
                .connect(randAccount)
                ['redeem(address,uint256[],uint256[],uint256)'](ethers.ZeroAddress, [], [], 0),
        ).to.be.rejectedWith('ENotAuthorized()');

        await expect(
            tokenUSDCVault.connect(randAccount).distribute([], [], { value: 1n }),
        ).to.be.rejectedWith('EMsgValueIsNotZero()');
        await expect(
            tokenUSDCVault
                .connect(randAccount)
                [
                    'redeem(address,uint256[],uint256[],uint256)'
                ](ethers.ZeroAddress, [], [], 0, { value: 1n }),
        ).to.be.rejectedWith('EMsgValueIsNotZero()');
        await expect(tokenUSDCVault.connect(randAccount).distribute([], [])).to.be.rejectedWith(
            'ENotAuthorized()',
        );
    });

    it('Test tokenUSDCVault transfer ownership ', async () => {
        const { tokenUSDCVault, rebaseTokenOwner, user1, poolOwner } = await loadFixture(
            deployNitrogenV11WithTokenVault,
        );

        for (const ownableContract of [tokenUSDCVault, rebaseTokenOwner]) {
            await ownableContract.transferOwnership(user1);
            expect(await ownableContract.owner()).to.be.equal(poolOwner);
            await ownableContract.connect(user1).acceptOwnership();
            expect(await ownableContract.owner()).to.be.equal(user1);
        }
    });

    it('Should support interface', async () => {
        const { tokenUSDCVault, rebaseTokenOwner } = await loadFixture(
            deployNitrogenV11WithTokenVault,
        );

        // https://eips.ethereum.org/EIPS/eip-7540
        expect(await tokenUSDCVault.supportsInterface('0xe3bc4e65')).to.be.equal(true);
        expect(await tokenUSDCVault.supportsInterface('0xce3bbe50')).to.be.equal(true);
        expect(await tokenUSDCVault.supportsInterface('0x620ee8e4')).to.be.equal(true);

        // https://eips.ethereum.org/EIPS/eip-7575
        expect(await tokenUSDCVault.supportsInterface('0x2f0a18c5')).to.be.equal(true);
        expect(await rebaseTokenOwner.supportsInterface('0xf815c03d')).to.be.equal(true);
        expect(await tokenUSDCVault.supportsInterface('0x01ffc9a7')).to.be.equal(true);
        expect(await rebaseTokenOwner.supportsInterface('0x01ffc9a7')).to.be.equal(true);

        // Just bad ids
        expect(await tokenUSDCVault.supportsInterface('0x11223344')).to.be.equal(false);
        expect(await rebaseTokenOwner.supportsInterface('0x11223344')).to.be.equal(false);
    });

    it('Test conversions', async () => {
        const {
            poolOwner,
            poolKeeper,
            randAccount,
            supplyManager,
            rebaseToken,
            tokenUSDCVault,
            tokenSUSDEVault,
            moleculaPool,
            USDC,
            SUSDE,
            user0,
        } = await loadFixture(deployNitrogenV11WithTokenVault);

        // Generate yield
        await grantERC20(moleculaPool, USDC, 10n ** 6n - 1n);
        await grantERC20(moleculaPool, SUSDE, 10n ** 18n - 1n, FAUCET.sUSDe);

        const { pool: totalPool, shares: totalShares } = await supplyManager.getTotalSupply();
        const shares = 10n ** 18n;

        // Test totalAssets
        expect(await tokenUSDCVault.totalAssets()).to.be.equal(await USDC.balanceOf(moleculaPool));
        expect(await tokenSUSDEVault.totalAssets()).to.be.equal(
            await SUSDE.balanceOf(moleculaPool),
        );

        // Test tokenUSDCVault
        const usdcAmount = await tokenUSDCVault.convertToAssets(shares);
        expect(usdcAmount).to.be.equal((shares * totalPool) / totalShares / 10n ** 12n);
        expect(await tokenUSDCVault.convertToShares(usdcAmount)).to.be.equal(
            (usdcAmount * 10n ** 12n * totalShares) / totalPool,
        );

        // Test tokenUSDEVault
        const susdeAmount = await tokenSUSDEVault.convertToAssets(shares);
        expect(susdeAmount).to.be.equal(
            await SUSDE.connect(user0).convertToShares((shares * totalPool) / totalShares),
        );
        expect(await tokenSUSDEVault.convertToShares(susdeAmount)).to.be.equal(
            ((await SUSDE.connect(user0).convertToAssets(susdeAmount)) * totalShares) / totalPool,
        );

        // User0 deposits sUSDe. Then we check user0's shares with the expected amount
        await grantERC20(user0, SUSDE, susdeAmount, FAUCET.sUSDe);
        expect(await rebaseToken.sharesOf(user0)).to.be.equal(0);
        await SUSDE.connect(user0).approve(tokenSUSDEVault, susdeAmount);
        await tokenSUSDEVault.connect(user0).requestDeposit(susdeAmount, user0, user0);
        const userShares = await rebaseToken.sharesOf(user0);
        expect(userShares).to.be.equal(await tokenSUSDEVault.convertToShares(susdeAmount));

        // user0 redeems their shares
        const userSUSDE = await tokenSUSDEVault.connect(user0).convertToAssets(userShares);
        await tokenSUSDEVault.connect(user0).redeemImmediately(userShares, user0, user0);
        expectEqual(await SUSDE.connect(user0).balanceOf(user0), userSUSDE, 18, 6);

        // Get rid of USDC, USDE from moleculaPool, remove tokens and test errors
        await getRidOf(moleculaPool, poolOwner, USDC, randAccount.address, poolKeeper);
        await getRidOf(moleculaPool, poolOwner, SUSDE, randAccount.address, poolKeeper);
        await moleculaPool.removeToken(USDC);
        await moleculaPool.removeToken(SUSDE);
        await expect(tokenUSDCVault.convertToAssets(shares)).to.be.rejectedWith('ETokenNotExist()');
        await expect(tokenSUSDEVault.convertToShares(shares)).to.be.rejectedWith(
            'ETokenNotExist()',
        );
    });
});

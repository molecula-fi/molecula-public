/* eslint-disable camelcase */

import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import type { BigNumberish, AddressLike } from 'ethers';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import type { IERC20 } from '../../typechain-types/@openzeppelin/contracts/token/ERC20/IERC20';

import { RebaseTokenCommon__factory as RebaseToken__factory } from '../../typechain-types/factories/contracts/common/rebase/RebaseTokenCommon__factory';
import { TronOracle__factory as Oracle__factory } from '../../typechain-types/factories/contracts/solutions/Carbon/tron/TronOracle__factory';

const REQUEST_DEPOSIT = '0x01';
const CONFIRM_DEPOSIT = '0x02';
const REQUEST_REDEEM = '0x03';
const CONFIRM_REDEEM = '0x04';
const DISTRIBUTE_YIELD = '0x05';

describe('Test Layer Zero Rebase Token solution', () => {
    async function grantERC20(
        wallet: AddressLike,
        token: IERC20,
        amount: BigNumberish,
        check: boolean = true,
    ) {
        // Prepare an impersonated signer to work as a faucet in the test
        const faucet = '0xA69babEF1cA67A37Ffaf7a485DfFF3382056e78C';
        const faucetSigner = await ethers.getImpersonatedSigner(faucet);
        // transfer ERC20 token
        await token.connect(faucetSigner).transfer(wallet, amount);
        const balance = await token.balanceOf(wallet);
        if (check) {
            expect(balance).to.equal(amount);
        }
    }
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployVaultSolution() {
        // Contracts are deployed using the first signer/account by default
        const [owner, user] = await ethers.getSigners();
        expect(owner).to.exist;
        expect(user).to.exist;

        // deploy mockSwftSwap
        const MockSwftSwap = (await ethers.getContractFactory('MockSwftSwap')).connect(owner!);
        const mockSwftSwap = await MockSwftSwap.deploy(owner!.address);

        // deploy mock LZ Endpoint
        const MockLZEndpoint = await ethers.getContractFactory('MockLZEndpoint');
        const mockLZEndpoint = await MockLZEndpoint.deploy();

        // deploy Oracle and setup
        const OracleFactory = new Oracle__factory(owner!);
        const oracle = await OracleFactory.deploy(
            ethMainnetBetaConfig.INITIAL_DAI_SUPPLY, // shares
            ethMainnetBetaConfig.INITIAL_DAI_SUPPLY * 2n, // pool
            owner!.address,
            owner!.address,
            owner!.address,
        );

        // deploy Accountant LZ
        const AccountantFactory = await ethers.getContractFactory('AccountantLZ');
        const accountantLZ = await AccountantFactory.deploy(
            owner!.address,
            owner!.address,
            owner!.address,
            await mockLZEndpoint.getAddress(),
            ethMainnetBetaConfig.LAYER_ZERO_ETHEREUM_EID,
            owner!.address, // to set latter
            owner!.address, // to set latter
            ethMainnetBetaConfig.USDT_ADDRESS,
            '0x00', // mock for test
            await oracle.getAddress(),
        );
        // set peer
        await accountantLZ.setPeer(
            ethMainnetBetaConfig.LAYER_ZERO_ETHEREUM_EID,
            ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
        );

        // set Oracle's accountant
        await oracle.setAccountant(await accountantLZ.getAddress());

        // deploy molecula token
        const RebaseTokenFactory = new RebaseToken__factory(owner!);
        const moleculaToken = await RebaseTokenFactory.deploy(
            owner!.address,
            await accountantLZ.getAddress(),
            ethMainnetBetaConfig.INITIAL_DAI_SUPPLY,
            await oracle.getAddress(),
            'YGT Token',
            'YGT',
            ethMainnetBetaConfig.DAI_TOKEN_DECIMALS,
            10_000_000n,
            1_000_000_000_000_000_000n,
        );

        // deploy Treasury
        const Treasury = await ethers.getContractFactory('Treasury');
        const treasury = await Treasury.deploy(
            owner!.address,
            owner!.address,
            await mockLZEndpoint.getAddress(),
            await accountantLZ.getAddress(),
            ethMainnetBetaConfig.USDT_ADDRESS,
            '0x00', // mock for test
            owner!.address,
            ethMainnetBetaConfig.LAYER_ZERO_ETHEREUM_EID,
            await mockSwftSwap.getAddress(),
            'EthWmUSDTAddress', // mock dst address for swft
        );

        // set vault for swap driver
        await accountantLZ.setMoleculaToken(await moleculaToken.getAddress());

        // set treasury
        await accountantLZ.setTreasury(await treasury.getAddress());

        // set LZ options
        await accountantLZ.setGasLimit(REQUEST_DEPOSIT, 300_000n, 0n);
        await accountantLZ.setGasLimit(REQUEST_REDEEM, 200_000n, 0n);

        // grant USDT to user
        const USDT = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.USDT_ADDRESS);
        const depositAmount = 100_000e6;
        await grantERC20(user!.address, USDT, depositAmount);

        return {
            mockLZEndpoint,
            oracle,
            moleculaToken,
            accountantLZ,
            treasury,
            owner,
            user,
        };
    }

    describe('Deployment', () => {
        it('Should set the right owner', async () => {
            const { moleculaToken, owner, accountantLZ, treasury } =
                await loadFixture(deployVaultSolution);
            expect(moleculaToken.owner()).to.exist;
            expect(await moleculaToken.owner()).to.equal(owner!.address);
            expect(await accountantLZ.treasury()).to.equal(await treasury.getAddress());
        });
        it('Success Deposit', async () => {
            const { moleculaToken, oracle, user, mockLZEndpoint, accountantLZ, treasury } =
                await loadFixture(deployVaultSolution);
            const USDT = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.USDT_ADDRESS);
            const value = 10000000n; // 10e6
            const intialTokenBalance = await USDT.balanceOf(user!.address);
            expect(intialTokenBalance).to.greaterThanOrEqual(Number(value));
            const intialYgtBalance = await moleculaToken.balanceOf(user!.address);
            const intialYgtShares = await moleculaToken.sharesOf(user!.address);
            // check oracle
            const initialShare = await oracle.getTotalSharesSupply();
            const initialPool = await oracle.getTotalPoolSupply();

            // approve accountant to get erc20 token from user's wallet
            const approveTx = await USDT.connect(user).approve(
                await moleculaToken.accountant(),
                value,
            );
            await approveTx.wait();
            // call requestDeposit
            // Note in real life we should set right options and
            // add a value to message from quote call
            // get quote
            const quoteDeposit = await accountantLZ.quote(REQUEST_DEPOSIT);
            expect(quoteDeposit.nativeFee).to.not.equal(0n);
            // call requestDeposit
            const tx = await moleculaToken
                .connect(user)
                .requestDeposit(value, user!.address, user!.address, {
                    value: quoteDeposit.nativeFee,
                });
            const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
            const iRebaseToken = RebaseToken__factory.createInterface();
            const { data } = receipt!.logs[1]!;
            const { topics } = receipt!.logs[1]!;
            const event = await iRebaseToken.decodeEventLog('DepositRequest', data, topics);
            const requestId = event[2];
            expect(event[3]).to.equal(user!.address);
            expect(event[4]).to.equal(value);

            // check user token balances
            const tokenBalance = await USDT.balanceOf(user!.address);
            expect(tokenBalance).to.equal(intialTokenBalance - value);
            const ygtBalance = await moleculaToken.balanceOf(user!.address);
            expect(ygtBalance).to.equal(intialYgtBalance);
            expect(await USDT.balanceOf(await treasury.getAddress())).to.equal(value);

            // Confirm Deposit
            // Receive Deposit confirmation from layer zero
            const shares = 5n * 10n ** 18n;
            const confirmedValue = 10n * 10n ** 18n; // 10e6
            const txConfirmDeposit = await mockLZEndpoint.lzReceive(
                await accountantLZ.getAddress(),
                ethMainnetBetaConfig.LAYER_ZERO_ETHEREUM_EID,
                ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
                CONFIRM_DEPOSIT,
                requestId,
                shares,
            );
            const confirmReceipt = await ethers.provider.getTransactionReceipt(
                txConfirmDeposit.hash,
            );
            const { data: confirmData, topics: confirmTopics } = confirmReceipt!.logs[2]!;
            const confirmEvent = await iRebaseToken.decodeEventLog(
                'DepositConfirm',
                confirmData,
                confirmTopics,
            );
            expect(confirmEvent[1]).to.equal(user!.address);
            expect(confirmEvent[2]).to.equal(confirmedValue);

            // update Oracle
            const pool = initialPool + confirmedValue;
            const share = initialShare + shares;
            await oracle.setTotalSupply(pool, share);

            // check user token balances
            const confirmTokenBalance = await USDT.balanceOf(user!.address);
            expect(confirmTokenBalance).to.equal(intialTokenBalance - value);
            const confirmYgtBalance = await moleculaToken.balanceOf(user!.address);
            expect(confirmYgtBalance).to.equal(intialYgtBalance + confirmEvent[2]);
            const ygtShares = await moleculaToken.sharesOf(user!.address);
            expect(ygtShares).to.equal(intialYgtShares + shares);

            // request redeem
            // Note: get quote from AccountantLZ contract
            // get quote
            const quoteRedeem = await accountantLZ.quote(REQUEST_REDEEM);
            expect(quoteDeposit.nativeFee).to.not.equal(0n);
            // call requestDeposit
            const redeemTx = await moleculaToken
                .connect(user)
                .requestRedeem(shares, user!.address, user!.address, {
                    value: quoteRedeem.nativeFee,
                });
            const redeemReceipt = await ethers.provider.getTransactionReceipt(redeemTx.hash);
            // const iVault = RebaseToken__factory.createInterface();
            const { data: rData, topics: rTopics } = redeemReceipt!.logs[2]!;
            // emit RedeemRequest(controller, owner, requestId, msg.sender, shares);
            const redeemEvent = await iRebaseToken.decodeEventLog('RedeemRequest', rData, rTopics);
            const redeemRequestId = redeemEvent[2];
            expect(redeemEvent[3]).to.equal(user!.address);
            expect(redeemEvent[4]).to.equal(shares);
            expect((await moleculaToken.redeemRequests(redeemRequestId)).status).to.equal(1);

            // grant usdt to Treasury
            await grantERC20(await treasury.getAddress(), USDT, value, false);

            const badRequest = { id: 7, value: 100 };
            // call redeem from AccountantLZ
            await mockLZEndpoint.lzReceiveRedeem(
                await accountantLZ.getAddress(),
                ethMainnetBetaConfig.LAYER_ZERO_ETHEREUM_EID,
                ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
                CONFIRM_REDEEM,
                [redeemRequestId, badRequest.id],
                [value * 2n, badRequest.value],
            );
            expect(await USDT.balanceOf(await treasury.getAddress())).to.equal(value * 2n);
            expect(await treasury.lockedToRedeem()).to.equal(value * 2n);
            expect(await USDT.balanceOf(user!.address)).to.equal(confirmTokenBalance);
            expect((await moleculaToken.redeemRequests(redeemRequestId)).status).to.equal(4);
            expect((await moleculaToken.redeemRequests(badRequest.id)).status).to.equal(0);

            // call confirm redeem
            await moleculaToken.confirmRedeem(redeemRequestId);
            expect(await USDT.balanceOf(await treasury.getAddress())).to.equal(0n);
            expect(await treasury.lockedToRedeem()).to.equal(0n);
            expect(await USDT.balanceOf(user!.address)).to.equal(confirmTokenBalance + value * 2n);
            expect((await moleculaToken.redeemRequests(redeemRequestId)).status).to.equal(2);
        });
        it('Distribute yield', async () => {
            const { moleculaToken, user, owner, mockLZEndpoint, accountantLZ } =
                await loadFixture(deployVaultSolution);

            expect(await moleculaToken.balanceOf(user!.address)).to.equal(0n);
            expect(await moleculaToken.sharesOf(user!.address)).to.equal(0n);
            expect(await moleculaToken.balanceOf(owner!.address)).to.equal(0n);
            expect(await moleculaToken.sharesOf(owner!.address)).to.equal(0n);

            await mockLZEndpoint.lzReceiveDistributeYield(
                await accountantLZ.getAddress(),
                ethMainnetBetaConfig.LAYER_ZERO_ETHEREUM_EID,
                ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
                DISTRIBUTE_YIELD,
                [user!.address, owner!.address],
                [100n * 10n ** 18n, 150n * 10n ** 18n],
            );

            expect(await moleculaToken.balanceOf(user!.address)).to.equal(200n * 10n ** 18n);
            expect(await moleculaToken.sharesOf(user!.address)).to.equal(100n * 10n ** 18n);
            expect(await moleculaToken.balanceOf(owner!.address)).to.equal(300n * 10n ** 18n);
            expect(await moleculaToken.sharesOf(owner!.address)).to.equal(150n * 10n ** 18n);
        });
    });
});

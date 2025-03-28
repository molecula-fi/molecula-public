/* eslint-disable camelcase, max-lines */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import {
    CONFIRM_DEPOSIT,
    CONFIRM_DEPOSIT_AND_UPDATE_ORACLE,
    DISTRIBUTE_YIELD,
    UPDATE_ORACLE,
} from '../../scripts/utils/lzMsgTypes';

import { deployCarbon, INITIAL_SUPPLY } from '../utils/deployCarbon';

import { grantERC20 } from '../utils/grant';

describe('Test Carbon', () => {
    describe('General solution tests', () => {
        it('Should set the right owner', async () => {
            const { moleculaPool, supplyManager, owner } = await loadFixture(deployCarbon);

            expect(await moleculaPool.owner!()).to.equal(await owner!.getAddress());
            expect(await supplyManager.owner!()).to.equal(await owner!.getAddress());
            expect(await moleculaPool.totalSupply()).to.equal(100_000_000_000_000_000_000n);
            expect(await supplyManager.totalSupply()).to.equal(100_000_000_000_000_000_000n);
        });
        it('Test set lzOptions', async () => {
            const { agentLZ } = await loadFixture(deployCarbon);

            await agentLZ.setGasLimit(CONFIRM_DEPOSIT, 300_000n, 0n);
            await agentLZ.setGasLimit(CONFIRM_DEPOSIT_AND_UPDATE_ORACLE, 350_000n, 0n);
            await agentLZ.setGasLimit(DISTRIBUTE_YIELD, 200_000n, 50_000n);

            expect(await agentLZ.getLzOptions(CONFIRM_DEPOSIT, 0)).to.equal(
                '0x000301001101000000000000000000000000000493e0',
            );
            expect(await agentLZ.getLzOptions(CONFIRM_DEPOSIT, 5)).to.equal(
                '0x000301001101000000000000000000000000000493e0',
            );
            expect(await agentLZ.getLzOptions(CONFIRM_DEPOSIT_AND_UPDATE_ORACLE, 0)).to.equal(
                '0x00030100110100000000000000000000000000055730',
            );
            expect(await agentLZ.getLzOptions(DISTRIBUTE_YIELD, 0)).to.equal(
                '0x00030100110100000000000000000000000000030d40',
            );
            expect(await agentLZ.getLzOptions(DISTRIBUTE_YIELD, 1)).to.equal(
                '0x0003010011010000000000000000000000000003d090',
            );
            expect(await agentLZ.getLzOptions(DISTRIBUTE_YIELD, 3)).to.equal(
                '0x00030100110100000000000000000000000000055730',
            );
        });
        it('Test update oracle', async () => {
            const { supplyManager, agentLZ, moleculaPool } = await loadFixture(deployCarbon);

            const val = INITIAL_SUPPLY * 3n;
            expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY);
            expect(await supplyManager.totalSharesSupply()).to.equal(INITIAL_SUPPLY);
            const DAI = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.DAI_ADDRESS);
            // generate income
            await grantERC20(await moleculaPool.poolKeeper(), DAI, val);

            // get quote
            const quote = await agentLZ.quote(UPDATE_ORACLE, 0);

            // update oracle
            await agentLZ.updateOracle({ value: quote.nativeFee });
        });
        // it('LZ Deposit and Redeem Flow', async () => {
        //     const {
        //         moleculaPool,
        //         supplyManager,
        //         agentLZ,
        //         mockLZEndpoint,
        //         user,
        //         owner,
        //         lzMessageDecoder,
        //         USDT,
        //         poolKeeper,
        //     } = await loadFixture(deployCarbon);
        //     // We have LZ query from Tron after requestDeposit call
        //     // We receive requestId and minted mUSD depositValue from Tron
        //     // Emulate LZ query from Tron with our mock endpoint
        //     const requestId = 1;
        //     const depositValue = 100_000_000n;
        //     const shares = depositValue * 10n ** 12n;
        //     const txDeposit = await mockLZEndpoint.lzReceive(
        //         await agentLZ.getAddress(),
        //         ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
        //         ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
        //         REQUEST_DEPOSIT,
        //         requestId,
        //         depositValue,
        //     );

        // await expect(txDeposit)
        //     .to.emit(agentLZ, 'Deposit')
        //     .withArgs(requestId, depositValue, shares);
        // expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 2n);
        // expect(await supplyManager.totalSharesSupply()).to.equal(INITIAL_SUPPLY * 2n);
        // expect((await agentLZ.deposits(requestId)).status).to.equal(1);

        // // Ready to confirm deposit now anyone can do it
        // // Note: before confirm deposit in real life we should build options and
        // // add depositValue to message from qoute() call
        // // get quote
        // const quoteConfirmDeposit = await agentLZ.quote(CONFIRM_DEPOSIT, 0);
        // expect(quoteConfirmDeposit.nativeFee).to.not.equal(0n);
        // // call confirm deposit
        // await agentLZ
        //     .connect(user!)
        //     .confirmDeposit(requestId, { value: quoteConfirmDeposit.nativeFee });
        // expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 2n);
        // expect(await supplyManager.totalSharesSupply()).to.equal(INITIAL_SUPPLY * 2n);
        // expect((await agentLZ.deposits(requestId)).status).to.equal(2);
        // const cdRes = await lzMessageDecoder.decodeConfirmDepositMessageAndUpdateOracle(
        //     await mockLZEndpoint.lastMessage(),
        // );
        // expect(cdRes.requestId).to.equal(requestId);
        // expect(cdRes.shares).to.equal(INITIAL_SUPPLY);
        // expect(cdRes.totalValue).to.equal(INITIAL_SUPPLY * 2n);
        // expect(cdRes.totalShares).to.equal(INITIAL_SUPPLY * 2n);

        // // generate income. make x2 share price.
        // const income = 500_000_000n;
        // await grantERC20(await moleculaPool.poolKeeper(), USDT, income);
        // expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 4n);
        // expect(await supplyManager.totalSharesSupply()).to.equal(INITIAL_SUPPLY * 2n);

        // // Layer Zero call deposit on agentLZ
        // // oops same requestId
        // await expect(
        //     mockLZEndpoint.lzReceive(
        //         await agentLZ.getAddress(),
        //         ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
        //         ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
        //         REQUEST_DEPOSIT,
        //         requestId,
        //         depositValue,
        //     ),
        // ).to.be.revertedWithCustomError(agentLZ, 'EOperationAlreadyExists');

        // // make a new deposit
        // const secondRequestId = 4;
        // const txSecondDeposit = await mockLZEndpoint.lzReceive(
        //     await agentLZ.getAddress(),
        //     ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
        //     ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
        //     REQUEST_DEPOSIT,
        //     secondRequestId,
        //     depositValue,
        // );
        // const secondSares = (depositValue * 10n ** 12n) / 2n;
        // await expect(txSecondDeposit)
        //     .to.emit(agentLZ, 'Deposit')
        //     .withArgs(secondRequestId, depositValue, secondSares);
        // expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 5n);
        // expect(await supplyManager.totalSharesSupply()).to.equal(
        //     INITIAL_SUPPLY + shares + secondSares,
        // );
        // expect((await agentLZ.deposits(secondRequestId)).status).to.equal(1);

        // // Ready to confirm deposit now anyone can do it
        // // Note: before confirm deposit in real life we should build options and
        // // add depositValue to message from qoute() call
        // // get quote
        // // Did it before: const quoteConfirmDeposit = await agentLZ.quote(CONFIRM_DEPOSIT, 0);
        // expect(quoteConfirmDeposit.nativeFee).to.not.equal(0n);
        // // call confirm deposit
        // await agentLZ
        //     .connect(user!)
        //     .confirmDeposit(secondRequestId, { value: quoteConfirmDeposit.nativeFee });
        // expect(await supplyManager.totalSupply()).to.equal(INITIAL_SUPPLY * 5n);
        // expect(await supplyManager.totalSharesSupply()).to.equal(
        //     INITIAL_SUPPLY + shares + secondSares,
        // );
        // expect((await agentLZ.deposits(secondRequestId)).status).to.equal(2);

        // // call redeem request
        // const redeemRequestId = 4;
        // const redeemShares = shares / 2n;
        // await mockLZEndpoint.lzReceive(
        //     await agentLZ.getAddress(),
        //     ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
        //     ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
        //     REQUEST_REDEEM,
        //     redeemRequestId,
        //     redeemShares,
        // );

        // expect(await supplyManager.totalSupply()).to.equal(460000000000000000000n);
        // expect(await supplyManager.totalSharesSupply()).to.equal(230000000000000000000n);
        // expect((await supplyManager.redeemRequests(redeemRequestId)).status).to.equal(1);
        // expect((await supplyManager.redeemRequests(redeemRequestId)).value).to.equal(
        //     depositValue,
        // );

        // // call second redeem request
        // const secondRedeemRequestId = 5;
        // const secondRedeemShares = redeemShares;
        // await mockLZEndpoint.lzReceive(
        //     await agentLZ.getAddress(),
        //     ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
        //     ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
        //     REQUEST_REDEEM,
        //     secondRedeemRequestId,
        //     secondRedeemShares,
        // );
        // expect(await supplyManager.totalSupply()).to.equal(412173913043478260869n);
        // expect(await supplyManager.totalSharesSupply()).to.equal(206086956521739130434n);
        // expect((await supplyManager.redeemRequests(secondRedeemRequestId)).status).to.equal(1);
        // expect((await supplyManager.redeemRequests(secondRedeemRequestId)).value).to.equal(
        //     depositValue,
        // );

        //         // Approve depositValue to redeem from poolKeeper
        //         // const poolKeeperSigner = await ethers.getImpersonatedSigner(
        //         //     await moleculaPool.poolKeeper(),
        //         // );
        //         // const totalRedeem =
        //         //     (await supplyManager.redeemRequests(secondRedeemRequestId)).value +
        //         //     (await supplyManager.redeemRequests(redeemRequestId)).value;

        //         // call confirm redeem
        //         const quote = await agentLZ.quote(CONFIRM_REDEEM, 2);
        //         await moleculaPool
        //             .connect(owner!)
        //             .redeem([redeemRequestId, secondRedeemRequestId], { value: quote.nativeFee });
        //         expect(await moleculaPool.totalSupply()).to.equal(INITIAL_SUPPLY * 6n);
        //         expect(await supplyManager.totalSupply()).to.equal(412173913043478260869n);
        //         expect(await supplyManager.totalSharesSupply()).to.equal(206086956521739130434n);
        //         expect((await supplyManager.redeemRequests(secondRedeemRequestId)).status).to.equal(2);
        // });
        it('Distribute yield', async () => {
            const { moleculaPool, supplyManager, agentLZ, user } = await loadFixture(deployCarbon);

            const val = 100_000_000_000_000_000_000n;
            expect(await supplyManager.totalSupply()).to.equal(val);
            expect(await supplyManager.totalSharesSupply()).to.equal(val);
            const DAI = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.DAI_ADDRESS);

            // generate income
            await grantERC20(await moleculaPool.poolKeeper(), DAI, val);

            expect(await supplyManager.totalSupply()).to.equal(140n * 10n ** 18n);
            expect(await supplyManager.totalSharesSupply()).to.equal(val);

            // get quote
            const quote = await agentLZ.quote(DISTRIBUTE_YIELD, 1);

            // distribute yield params
            const party = {
                parties: [
                    {
                        party: user!.address,
                        portion: 1_000_000_000_000_000_000n,
                    },
                ],
                agent: agentLZ,
                ethValue: quote.nativeFee,
            };
            // distribute yield
            await supplyManager.distributeYield([party], 5000, { value: quote.nativeFee });

            expect(await supplyManager.apyFormatter()).to.equal(5000);
            expect(await supplyManager.totalSupply()).to.equal(200n * 10n ** 18n);
            expect(await supplyManager.totalSharesSupply()).to.equal(142857142857142857142n);
        });
    });
});

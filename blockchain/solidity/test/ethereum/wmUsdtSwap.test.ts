/* eslint-disable camelcase, max-lines */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { deployCarbon } from '../utils/deployCarbon';
import { grantERC20 } from '../utils/grant';

describe('Test Swap USDT <-> WMUSDT for carbon solution', () => {
    describe('General solution tests', () => {
        it('Should set the right owner', async () => {
            const { moleculaPool, supplyManager, wmUSDT, agentLZ, owner } =
                await loadFixture(deployCarbon);

            expect(await moleculaPool.owner!()).to.equal(await owner!.getAddress());
            expect(await supplyManager.owner!()).to.equal(await owner!.getAddress());
            expect(await moleculaPool.totalSupply()).to.equal(100_000_000_000_000_000_000n);
            expect(await supplyManager.totalSupply()).to.equal(100_000_000_000_000_000_000n);
            expect(await wmUSDT.AGENT()).to.equal(await agentLZ!.getAddress());
        });
        it('Swap USDT <-> WMUSDT', async () => {
            const { moleculaPool, mockLZEndpoint, wmUSDT, owner, USDT } =
                await loadFixture(deployCarbon);

            // User swap USDT to WMUSDT
            const depositValue = 100_000_000n;
            const minReturnValue = 90_000_000n;
            // Grant USDT to pool
            await grantERC20(ethMainnetBetaConfig.POOL_KEEPER, USDT, depositValue);

            // check balances
            expect(await moleculaPool.totalSupply()).to.equal(200_000_000_000_000_000_000n);
            expect(await USDT.balanceOf(ethMainnetBetaConfig.POOL_KEEPER)).to.equal(depositValue);
            expect(await wmUSDT.balanceOf(ethMainnetBetaConfig.POOL_KEEPER)).to.equal(0n);

            // Approve to wmUSDT
            const poolKeeper = await ethers.getImpersonatedSigner(ethMainnetBetaConfig.POOL_KEEPER);
            await USDT.connect(poolKeeper).approve(await wmUSDT.getAddress(), depositValue);
            // Call wmUSDT
            const swapUsdtTx = await wmUSDT
                .connect(owner)
                .requestToSwapUSDT(depositValue, minReturnValue);
            await expect(swapUsdtTx)
                .to.emit(wmUSDT, 'USDTSwapRequest')
                .withArgs(depositValue, minReturnValue);
            // check balances
            expect(await moleculaPool.totalSupply()).to.equal(200_000_000_000_000_000_000n);
            expect(await USDT.balanceOf(ethMainnetBetaConfig.POOL_KEEPER)).to.equal(0);
            expect(await wmUSDT.balanceOf(ethMainnetBetaConfig.POOL_KEEPER)).to.equal(depositValue);
            // tokens go to SWFT bridge
            // Receive confirm over Layer Zero
            await mockLZEndpoint.lzReceiveConfirmToSwapUSDT(
                await wmUSDT.getAddress(),
                ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
                ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
                minReturnValue,
            );

            // check balances
            expect(await moleculaPool.totalSupply()).to.equal(190_000_000_000_000_000_000n);
            expect(await USDT.balanceOf(ethMainnetBetaConfig.POOL_KEEPER)).to.equal(0);
            expect(await wmUSDT.balanceOf(ethMainnetBetaConfig.POOL_KEEPER)).to.equal(
                minReturnValue,
            );

            /// ///////////////////////////////////
            // User swap WMUSDT to USDT
            /// ///////////////////////////////////
            const poolKeeperSigner = await ethers.getImpersonatedSigner(
                await moleculaPool.poolKeeper(),
            );
            const wmUsdtValue = 50n * 10n ** 6n;
            const usdtValue = 40n * 10n ** 6n;
            // Token keeper approve swap
            await wmUSDT.connect(poolKeeperSigner).approve(await wmUSDT.getAddress(), wmUsdtValue);
            // Call requestToSwapWmUSDT
            const quote = await wmUSDT.quote();
            await wmUSDT
                .connect(owner)
                .requestToSwapWmUSDT(wmUsdtValue, { value: quote.nativeFee });
            // check balances
            expect(await moleculaPool.totalSupply()).to.equal(190_000_000_000_000_000_000n);
            expect(await USDT.balanceOf(ethMainnetBetaConfig.POOL_KEEPER)).to.equal(0);
            expect(await wmUSDT.balanceOf(ethMainnetBetaConfig.POOL_KEEPER)).to.equal(
                minReturnValue,
            );
            expect(await wmUSDT.swapValue()).to.equal(wmUsdtValue);

            // From tron we receive only 40 USDT
            await grantERC20(await wmUSDT.getAddress(), USDT, usdtValue);
            // check balances
            expect(await moleculaPool.totalSupply()).to.equal(190_000_000_000_000_000_000n);
            expect(await USDT.balanceOf(ethMainnetBetaConfig.POOL_KEEPER)).to.equal(0);
            expect(await wmUSDT.balanceOf(ethMainnetBetaConfig.POOL_KEEPER)).to.equal(
                minReturnValue,
            );
            expect(await wmUSDT.swapValue()).to.equal(wmUsdtValue);

            // Call confirmSwap
            await wmUSDT.connect(owner).confirmSwapWmUSDT();
            // check balances
            expect(await moleculaPool.totalSupply()).to.equal(180_000_000_000_000_000_000n);
            expect(await USDT.balanceOf(ethMainnetBetaConfig.POOL_KEEPER)).to.equal(usdtValue);
            expect(await wmUSDT.balanceOf(ethMainnetBetaConfig.POOL_KEEPER)).to.equal(
                minReturnValue - wmUsdtValue,
            );
            expect(await wmUSDT.swapValue()).to.equal(0n);
        });
    });
});

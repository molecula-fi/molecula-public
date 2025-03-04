/* eslint-disable camelcase */

import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { RebaseTokenCommon__factory as RebaseToken__factory } from '../../typechain-types/factories/contracts/common/rebase/RebaseTokenCommon__factory';
import { TronOracle__factory as Oracle__factory } from '../../typechain-types/factories/contracts/solutions/Carbon/tron/TronOracle__factory';
import { grantERC20 } from '../utils/grant';

describe('Test Swap USDT <-> WMUSDT for carbon solution', () => {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployVaultSolution() {
        // Contracts are deployed using the first signer/account by default
        const [owner, user] = await ethers.getSigners();
        expect(owner).to.exist;
        expect(user).to.exist;

        // deploy mockSwftSwap
        const MockSwftSwap = (await ethers.getContractFactory('SwftSwap')).connect(owner!);
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
        // add peer for treasury MOCK
        await treasury.setPeer(
            ethMainnetBetaConfig.LAYER_ZERO_ETHEREUM_EID,
            ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
        );

        // set vault for swap driver
        await accountantLZ.setMoleculaToken(await moleculaToken.getAddress());

        // set treasury
        await accountantLZ.setTreasury(await treasury.getAddress());

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
            expect(await moleculaToken.owner()).to.equal(owner?.address);
            expect(await accountantLZ.treasury()).to.equal(await treasury.getAddress());
        });
        it('Swap USDT <-> WMUSDT', async () => {
            const { owner, mockLZEndpoint, treasury } = await loadFixture(deployVaultSolution);

            const USDT = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.USDT_ADDRESS);

            // User swap USDT to WMUSDT
            // Swft transfer tokens
            const value = 90_000_000n;
            grantERC20(await treasury.getAddress(), USDT, value);

            // Server process deposit
            const quote = await treasury.quote();
            await treasury.connect(owner!).confirmSwapUsdt({ value: quote.nativeFee });

            // check balances
            expect(await USDT.balanceOf(await treasury.getAddress())).to.equal(value);

            // User swap WMUSDT to USDT
            const requesValue = 50_000_000n;
            // receive request from LayerZero
            const requestTx = await mockLZEndpoint.lzReceiveRequestToSwapWmUSDT(
                await treasury.getAddress(),
                ethMainnetBetaConfig.LAYER_ZERO_ETHEREUM_EID,
                ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
                requesValue,
            );
            await expect(requestTx).to.emit(treasury, 'SwapRequest').withArgs(requesValue);
            expect(await treasury.swapValue()).to.equal(requesValue);
            expect(await USDT.balanceOf(await treasury.getAddress())).to.equal(value);

            // Now server process swap to SWFT bridge
            const minReturnValue = 40_000_000n;
            const confirmTx = await treasury.swapWmUsdt(minReturnValue);
            await expect(confirmTx).to.emit(treasury, 'Swap').withArgs(requesValue, minReturnValue);
            expect(await treasury.swapValue()).to.equal(0);
            expect(await USDT.balanceOf(await treasury.getAddress())).to.equal(value - requesValue);
        });
    });
});

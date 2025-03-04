/* eslint-disable camelcase, max-lines */
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import type { ICurveStableSwapFactoryNG, ICurveStableSwapNG, IERC20 } from '../../typechain-types';

const fees = [
    { fee: 0n, description: '0% fee' },
    { fee: 1000000n, description: '0.01% fee' },
    { fee: 2000000n, description: '0.02% fee' },
    { fee: 5000000n, description: '0.05% fee' },
    { fee: 10000000n, description: '0.1% fee' },
    { fee: 15000000n, description: '0.15% fee' },
    { fee: 20000000n, description: '0.2% fee' },
    { fee: 50000000n, description: '0.5% fee' },
    { fee: 100000000n, description: '1% fee' },
];
const amounts = [5n, 100n, 1000n, 10000n, 50000n];

type Result = {
    fee: string;
    amount: bigint;
    DAI_to_USDT: number;
    USDT_to_DAI: number;
    DAI_balance: number;
    USDT_balance: number;
};

const results: Result[] = [];

async function fetchCurveFactory() {
    // Contracts are deployed using the first signer/account by default
    const forkAddresses = {
        faucet: '0x6cC5F688a315f3dC28A7781717a9A798a59fDA7b',
        curve3Pool: '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7',
        factoryAddress: '0x6a8cbed756804b16e05e741edabd5cb544ae21bf',
        mUSDPool: '0x5bcaa8a1216d8120a59489f7df4585e834c90eaf',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    };
    const faucetSigner = await ethers.getImpersonatedSigner(forkAddresses.faucet);
    expect(faucetSigner).to.exist;
    // Deploy LZMessageLib
    const curveFactory = await ethers.getContractAt(
        'ICurveStableSwapFactoryNG',
        forkAddresses.factoryAddress,
        faucetSigner,
    );
    const mUSDSwapPool = await ethers.getContractAt('ICurveStableSwapNG', forkAddresses.mUSDPool);
    const curve3Pool = await ethers.getContractAt(
        'ICurveStableSwapNG',
        forkAddresses.curve3Pool,
        faucetSigner,
    );
    const usdt = await ethers.getContractAt('IERC20', forkAddresses.USDT, faucetSigner);
    const dai = await ethers.getContractAt('IERC20', forkAddresses.DAI, faucetSigner);

    return {
        curveFactory,
        curve3Pool,
        mUSDSwapPool,
        usdt,
        dai,
        faucetSigner,
    };
}

const poolTest = async (fee: bigint, description: string, amount: bigint) => {
    const { curveFactory, curve3Pool, usdt, dai, faucetSigner } =
        (await loadFixture(fetchCurveFactory))!;

    const pools_count = await curveFactory.pool_count();
    await curveFactory.deploy_plain_pool(
        `Curve.fi DAI/USDT fork ${description}`,
        'crvDAIUSDT',
        [await dai.getAddress(), await usdt.getAddress()],
        10000n,
        fee,
        0,
        866,
        0,
        [2, 0],
        ['0x00000000', '0x00000000'],
        [ethers.ZeroAddress, ethers.ZeroAddress],
    );

    expect(await curveFactory.pool_count()).to.equal(pools_count + 1n);
    const poolAddress = await curveFactory.pool_list(pools_count);

    await dai.approve(await curve3Pool.getAddress(), ethers.MaxUint256);
    await curve3Pool.exchange(0, 2, ethers.parseEther('1000000'), ethers.parseUnits('998000', 6));

    const pool = await ethers.getContractAt('ICurveStableSwapNG', poolAddress);
    await dai.approve(poolAddress, ethers.MaxUint256);
    await usdt.approve(poolAddress, ethers.MaxUint256);
    await pool
        .connect(faucetSigner)
        .add_liquidity(
            [ethers.parseEther('900000'), ethers.parseUnits('100000', 6)],
            ethers.parseEther('299'),
            faucetSigner.address,
        );

    const balances = await pool.get_balances();
    const DAI_to_USDT = await pool.get_dy(0, 1, ethers.parseEther(amount.toString()));
    const USDT_to_DAI = await pool.get_dy(1, 0, ethers.parseUnits(amount.toString(), 6));

    results.push({
        fee: description,
        amount,
        DAI_to_USDT: Number(ethers.formatUnits(DAI_to_USDT, 6)),
        USDT_to_DAI: Number(ethers.formatEther(USDT_to_DAI)),
        DAI_balance: Number(ethers.formatEther(balances[0]!)),
        USDT_balance: Number(ethers.formatUnits(balances[1]!, 6)),
    });
};

// const generateReport = () => {
//     console.log('\nSwap Results Summary:');
//     console.log('----------------------------------------------------------------------------');
//     fees.forEach(({ description }) => {
//         console.log(`\nFee Tier: ${description}`);
//         console.log('Amount (DAI) | DAI → USDT    | USDT → DAI    | DAI Balance    | USDT Balance');
//         console.log('----------------------------------------------------------------------------');

//         results
//             .filter(r => r.fee === description)
//             .forEach(r => {
//                 console.log(
//                     `${r.amount.toString().padEnd(12)} | ${r.DAI_to_USDT.toFixed(6).padEnd(13)} | ${r.USDT_to_DAI.toFixed(6).padEnd(13)} | ${r.DAI_balance.toFixed(2).padEnd(13)} | ${r.USDT_balance.toFixed(2)}`,
//                 );
//             });
//     });
//     console.log('----------------------------------------------------------------------------');
// };

describe('Test Curve Pool Creation', () => {
    // after(() => {
    //     generateReport();
    // });

    it('Should create pool with A = 10000, fee = 0%', async () => {
        const { curveFactory, usdt, dai } = (await loadFixture(fetchCurveFactory))!;

        const pools_count = await curveFactory.pool_count();
        await curveFactory.deploy_plain_pool(
            'Curve.fi DAI/USDT fork 0% fee',
            'crvDAIUSDT',
            [await dai.getAddress(), await usdt.getAddress()],
            10000n,
            0,
            0,
            866,
            0,
            [0, 0],
            ['0x00000000', '0x00000000'],
            [ethers.ZeroAddress, ethers.ZeroAddress],
        );
        expect(await curveFactory.pool_count()).to.equal(pools_count + 1n);
    });
    it('Should create pool with A = 20000, fee = 0%', async () => {
        const { curveFactory, usdt, dai } = (await loadFixture(fetchCurveFactory))!;

        const pools_count = await curveFactory.pool_count();
        await curveFactory.deploy_plain_pool(
            'Curve.fi DAI/USDT fork 0% fee',
            'crvDAIUSDT',
            [await dai.getAddress(), await usdt.getAddress()],
            20000n,
            0,
            0,
            866,
            0,
            [0, 0],
            ['0x00000000', '0x00000000'],
            [ethers.ZeroAddress, ethers.ZeroAddress],
        );
        expect(await curveFactory.pool_count()).to.equal(pools_count + 1n);
    });
    it('Should create pool with A = max(uint256), fee = 0%, but fail to add liquidity', async () => {
        const { curveFactory, usdt, dai, faucetSigner } = (await loadFixture(fetchCurveFactory))!;

        const pools_count = await curveFactory.pool_count();
        await curveFactory.deploy_plain_pool(
            'Curve.fi DAI/USDT fork 0% fee',
            'crvDAIUSDT',
            [await dai.getAddress(), await usdt.getAddress()],
            ethers.MaxUint256,
            0,
            0,
            866,
            0,
            [0, 0],
            ['0x00000000', '0x00000000'],
            [ethers.ZeroAddress, ethers.ZeroAddress],
        );
        expect(await curveFactory.pool_count()).to.equal(pools_count + 1n);
        const poolAddress = await curveFactory.pool_list(pools_count);
        const pool = await ethers.getContractAt('ICurveStableSwapNG', poolAddress);
        await dai.approve(poolAddress, ethers.MaxUint256);
        await usdt.approve(poolAddress, ethers.MaxUint256);
        await expect(
            pool
                .connect(faucetSigner)
                .add_liquidity(
                    [ethers.parseEther('1000'), ethers.parseUnits('1000', 6)],
                    ethers.parseEther('999'),
                    faucetSigner.address,
                ),
        ).to.be.reverted;
    });
    it('Should fail to create a pool with A = 10000 and fee > 1%', async () => {
        const { curveFactory, usdt, dai } = (await loadFixture(fetchCurveFactory))!;

        const pools_count = await curveFactory.pool_count();
        await expect(
            curveFactory.deploy_plain_pool(
                'Curve.fi DAI/USDT fork >1% fee',
                'crvDAIUSDT',
                [await dai.getAddress(), await usdt.getAddress()],
                10000n,
                100000001n,
                0,
                866,
                0,
                [0, 0],
                ['0x00000000', '0x00000000'],
                [ethers.ZeroAddress, ethers.ZeroAddress],
            ),
        ).to.be.revertedWith('Invalid fee');
        expect(await curveFactory.pool_count()).to.equal(pools_count);
    });
    it('Should fail to create a pool ids len and token len mismatch', async () => {
        const { curveFactory, usdt, dai } = (await loadFixture(fetchCurveFactory))!;

        const pools_count = await curveFactory.pool_count();
        await expect(
            curveFactory.deploy_plain_pool(
                'Curve.fi DAI/USDT fork 1% fee',
                'crvDAIUSDT',
                [await dai.getAddress(), await usdt.getAddress()],
                10000n,
                100000000n,
                0,
                866,
                0,
                [0, 0],
                ['0x00000000', '0x00000000', '0x00000000'],
                [ethers.ZeroAddress, ethers.ZeroAddress],
            ),
        ).to.be.reverted;
        expect(await curveFactory.pool_count()).to.equal(pools_count);
    });
    it('Should fail to create a pool oracles len and token len mismatch', async () => {
        const { curveFactory, usdt, dai } = (await loadFixture(fetchCurveFactory))!;

        const pools_count = await curveFactory.pool_count();
        await expect(
            curveFactory.deploy_plain_pool(
                'Curve.fi DAI/USDT fork 1% fee',
                'crvDAIUSDT',
                [await dai.getAddress(), await usdt.getAddress()],
                10000n,
                100000000n,
                0,
                866,
                0,
                [0, 0],
                ['0x00000000', '0x00000000'],
                [ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress],
            ),
        ).to.be.reverted;
        expect(await curveFactory.pool_count()).to.equal(pools_count);
    });
    it('Should fail to create a pool types len and token len mismatch', async () => {
        const { curveFactory, usdt, dai } = (await loadFixture(fetchCurveFactory))!;

        const pools_count = await curveFactory.pool_count();
        await expect(
            curveFactory.deploy_plain_pool(
                'Curve.fi DAI/USDT fork 1% fee',
                'crvDAIUSDT',
                [await dai.getAddress(), await usdt.getAddress()],
                10000n,
                100000000n,
                0,
                866,
                0,
                [0, 0, 2],
                ['0x00000000', '0x00000000'],
                [ethers.ZeroAddress, ethers.ZeroAddress],
            ),
        ).to.be.reverted;
        expect(await curveFactory.pool_count()).to.equal(pools_count);
    });
    it('Should fail to create a pool with empty token list', async () => {
        const { curveFactory } = (await loadFixture(fetchCurveFactory))!;

        const pools_count = await curveFactory.pool_count();
        await expect(
            curveFactory.deploy_plain_pool(
                'Curve.fi DAI/USDT fork 1% fee',
                'crvDAIUSDT',
                [],
                10000n,
                100000000n,
                0,
                866,
                0,
                [0, 0],
                ['0x00000000', '0x00000000'],
                [ethers.ZeroAddress, ethers.ZeroAddress],
            ),
        ).to.be.reverted;
        expect(await curveFactory.pool_count()).to.equal(pools_count);
    });
    it('Should fail to create a pool with single token in the list', async () => {
        const { curveFactory, dai } = (await loadFixture(fetchCurveFactory))!;

        const pools_count = await curveFactory.pool_count();
        await expect(
            curveFactory.deploy_plain_pool(
                'Curve.fi DAI/USDT fork 1% fee',
                'crvDAIUSDT',
                [await dai.getAddress()],
                10000n,
                100000000n,
                0,
                866,
                0,
                [0, 0],
                ['0x00000000', '0x00000000'],
                [ethers.ZeroAddress, ethers.ZeroAddress],
            ),
        ).to.be.reverted;
        expect(await curveFactory.pool_count()).to.equal(pools_count);
    });

    async function proceedTest(
        curveFactory: ICurveStableSwapFactoryNG,
        mUSDSwapPool: ICurveStableSwapNG,
        usdt: IERC20,
        dai: IERC20,
        faucetSigner: HardhatEthersSigner,
        pools_count: bigint,
    ) {
        expect(await curveFactory.pool_count()).to.equal(pools_count + 1n);
        const poolAddress = await curveFactory.pool_list(pools_count);
        const pool = await ethers.getContractAt('ICurveStableSwapNG', poolAddress);

        const mUSD_pool_balances = await mUSDSwapPool.get_balances();
        // const mUSD_pool_dy = await mUSDSwapPool.get_dy(0, 1, ethers.parseEther('5'));
        // console.log(
        //     `- - - - - - - - - - - - - - - - - - - - - - - - - - - - -\nGetting out amount for ${await mUSDSwapPool.name()} with A = ${await mUSDSwapPool.A()}`,
        // );
        // console.log(
        //     `Pool balances: ${ethers.formatEther(mUSD_pool_balances[0]!)} mUSD, ${ethers.formatUnits(mUSD_pool_balances[1]!, 6)} USDT`,
        // );
        // console.log('Output amount for trade 5 mUSD -> USDT:', ethers.formatUnits(mUSD_pool_dy, 6));

        await dai.approve(poolAddress, ethers.MaxUint256);
        await usdt.approve(poolAddress, ethers.MaxUint256);
        await pool
            .connect(faucetSigner)
            .add_liquidity(
                [mUSD_pool_balances[0]!, mUSD_pool_balances[1]!],
                ethers.parseEther('299'),
                faucetSigner.address,
            );
        // const balances = await pool.get_balances();
        // const dy = await pool.get_dy(0, 1, ethers.parseEther('5'));
        // console.log(
        //     `- - - - - - - - - - - - - - - - - - - - - - - - - - - - -\nGetting out amount for ${await pool.name()} with A = ${await pool.A()}`,
        // );
        // console.log(
        //     `Pool balances: ${ethers.formatEther(balances[0]!)} DAI, ${ethers.formatUnits(balances[1]!, 6)} USDT`,
        // );
        // console.log('Output amount for trade 5 DAI -> USDT:', ethers.formatUnits(dy, 6));
    }

    it('Should create pool with A = 10000, fee = 0%, add liquidity(cloned) and swap 5 tokens', async () => {
        const { curveFactory, mUSDSwapPool, usdt, dai, faucetSigner } =
            (await loadFixture(fetchCurveFactory))!;

        const pools_count = await curveFactory.pool_count();
        await curveFactory.deploy_plain_pool(
            'Curve.fi DAI/USDT fork 0% fee',
            'crvDAIUSDT',
            [await dai.getAddress(), await usdt.getAddress()],
            10000n,
            0,
            0,
            866,
            0,
            [0, 0],
            ['0x00000000', '0x00000000'],
            [ethers.ZeroAddress, ethers.ZeroAddress],
        );
        await proceedTest(curveFactory, mUSDSwapPool, usdt, dai, faucetSigner, pools_count);
    });
    it('Should create pool with A = 20000, fee = 0% add liquidity(cloned) and swap 5 tokens', async () => {
        const { curveFactory, mUSDSwapPool, usdt, dai, faucetSigner } =
            (await loadFixture(fetchCurveFactory))!;

        const pools_count = await curveFactory.pool_count();
        await curveFactory.deploy_plain_pool(
            'Curve.fi DAI/USDT fork 0% fee',
            'crvDAIUSDT',
            [await dai.getAddress(), await usdt.getAddress()],
            20000n,
            0,
            0,
            866,
            0,
            [0, 0],
            ['0x00000000', '0x00000000'],
            [ethers.ZeroAddress, ethers.ZeroAddress],
        );
        await proceedTest(curveFactory, mUSDSwapPool, usdt, dai, faucetSigner, pools_count);
    });
    it('Should create a pool with A = 10000, fee = 1%, add liquidity(cloned) and swap 5 tokens', async () => {
        const { curveFactory, mUSDSwapPool, usdt, dai, faucetSigner } =
            (await loadFixture(fetchCurveFactory))!;

        const pools_count = await curveFactory.pool_count();
        await curveFactory.deploy_plain_pool(
            'Curve.fi DAI/USDT fork 1% fee',
            'crvDAIUSDT',
            [await dai.getAddress(), await usdt.getAddress()],
            10000n,
            100000000n,
            0,
            866,
            0,
            [0, 0],
            ['0x00000000', '0x00000000'],
            [ethers.ZeroAddress, ethers.ZeroAddress],
        );
        await proceedTest(curveFactory, mUSDSwapPool, usdt, dai, faucetSigner, pools_count);
    });
    fees.forEach(({ fee, description }) => {
        amounts.forEach(amount => {
            it(`Should create a pool with A = 10000, fee = ${description}, swap ${amount} tokens`, async () => {
                await poolTest(fee, description, amount);
            });
        });
    });
});

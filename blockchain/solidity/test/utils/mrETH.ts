/* eslint-disable camelcase */
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { grantERC20 } from './grant';

export const INITIAL_SUPPLY = 10n ** 12n;

export async function deployMrETh() {
    // Contracts are deployed using the first signer/account by default

    const signers = await ethers.getSigners();

    const owner = signers.at(0)!;
    const user0 = signers.at(0)!;
    const user1 = signers.at(0)!;
    const user2 = signers.at(0)!;

    const WETH = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.WETH_ADDRESS);
    const aWETH = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.AWETH_ADDRESS);
    const cWETHv3 = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.CWETH_V3);

    await grantERC20(owner, WETH, ethers.parseEther('20'));
    await grantERC20(user0, WETH, ethers.parseEther('20'));

    // calc future addresses
    const transactionCount = await owner.getNonce();
    const mrETHFutureAddress = ethers.getCreateAddress({
        from: owner.address,
        nonce: transactionCount + 3,
    });

    const AaveBufferLib = await ethers.getContractFactory('AaveBufferLib');
    const aaveBufferLib = await AaveBufferLib.connect(owner!).deploy();

    const CompoundBufferLib = await ethers.getContractFactory('CompoundBufferLib');
    const compoundBufferLib = await CompoundBufferLib.connect(owner!).deploy();

    // deploy rtSupplyManager
    const RTSupplyManager = await ethers.getContractFactory('RTSupplyManager');
    const rtSupplyManager = await RTSupplyManager.connect(owner!).deploy(
        owner!.address,
        owner!.address,
        owner!.address,
        mrETHFutureAddress,
        ethMainnetBetaConfig.WETH_ADDRESS,
        ethMainnetBetaConfig.EIGEN_POD_MANAGER,
        INITIAL_SUPPLY,
        4000,
        0,
    );

    const MrETH = await ethers.getContractFactory('MrETH');
    const mrETH = await MrETH.connect(owner!).deploy(
        owner!.address,
        await rtSupplyManager.getAddress(),
        INITIAL_SUPPLY,
        'mUSD release candidate',
        'mUSDrec',
        18n,
        10n ** 15n,
        10n ** 15n,
    );

    expect(await mrETH.getAddress()).to.be.equal(mrETHFutureAddress);

    await WETH.approve(rtSupplyManager, ethers.MaxUint256);
    const aavePool = ethMainnetBetaConfig.AAVE_POOL;

    await rtSupplyManager.initialize(
        [aavePool],
        [
            {
                poolToken: ethMainnetBetaConfig.AWETH_ADDRESS,
                poolLib: await aaveBufferLib.getAddress(),
                poolPortion: 10_000n,
                poolId: 0,
            },
        ],
        [true],
    );

    await expect(
        rtSupplyManager.initialize(
            [ethMainnetBetaConfig.AAVE_POOL],
            [
                {
                    poolToken: ethMainnetBetaConfig.AWETH_ADDRESS,
                    poolLib: await aaveBufferLib.getAddress(),
                    poolPortion: 10_000n,
                    poolId: 0,
                },
            ],
            [true],
        ),
    ).to.be.reverted;

    const withdrawalCredentials = await rtSupplyManager.getWithdrawalCredentials();

    return {
        rtSupplyManager,
        mrETH,
        owner,
        user0,
        user1,
        user2,
        WETH,
        aWETH,
        cWETHv3,
        aavePool,
        aaveBufferLib,
        compoundBufferLib,
        withdrawalCredentials,
    };
}

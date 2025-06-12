/* eslint-disable camelcase */
import { expect } from 'chai';
import { keccak256 } from 'ethers';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { FAUCET, grantERC20 } from './grant';

export const INITIAL_SUPPLY = 10n ** 12n;

export const approverSignatureAndExpiry = {
    signature: '0x',
    expiry: 0,
};

export const approverSalt = '0x0000000000000000000000000000000000000000000000000000000000000000';

export async function deployMrETh() {
    const signers = await ethers.getSigners();

    const owner = signers.at(0)!;
    const user0 = signers.at(0)!;
    const user1 = signers.at(0)!;
    const user2 = signers.at(0)!;

    const stETH = await ethers.getContractAt('IERC20Metadata', ethMainnetBetaConfig.STETH_ADDRESS);
    const WETH = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.WETH_ADDRESS);
    const aWETH = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.AWETH_ADDRESS);
    const cWETHv3 = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.CWETH_V3);

    // grant WETH tokens
    await grantERC20(owner, WETH, ethers.parseEther('20'));
    await grantERC20(user0, WETH, ethers.parseEther('20'));

    // grant stETH tokens
    await grantERC20(owner, stETH, ethers.parseEther('40'), FAUCET.stETH);
    await grantERC20(user0, stETH, ethers.parseEther('40'), FAUCET.stETH);

    const AaveBufferLib = await ethers.getContractFactory('AaveBufferLib');
    const aaveBufferLib = await AaveBufferLib.connect(owner!).deploy();
    const aavePool = ethMainnetBetaConfig.AAVE_POOL;

    const CompoundBufferLib = await ethers.getContractFactory('CompoundBufferLib');
    const compoundBufferLib = await CompoundBufferLib.connect(owner!).deploy();

    // calc future addresses
    const transactionCount = await owner.getNonce();
    const supplyManagerFutureAddress = ethers.getCreateAddress({
        from: owner.address,
        nonce: transactionCount + 2,
    });

    const rebaseERC20V2FutureAddress = ethers.getCreateAddress({
        from: owner.address,
        nonce: (await owner.getNonce()) + 3,
    });

    // deploy DepositManager
    const DepositManager = await ethers.getContractFactory('DepositManager');
    const depositManager = await DepositManager.connect(owner!).deploy(
        owner.address,
        owner.address,
        owner.address,
        supplyManagerFutureAddress,
        ethMainnetBetaConfig.WETH_ADDRESS,
        ethMainnetBetaConfig.STRATEGY_FACTORY,
        ethMainnetBetaConfig.DELEGATION_MANAGER,
    );

    await depositManager.initialize(
        0,
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

    // deploy supply manager
    const SupplyManagerV2 = await ethers.getContractFactory('SupplyManagerV2');
    const supplyManagerV2 = await SupplyManagerV2.connect(owner).deploy(
        owner,
        owner,
        depositManager,
        4000,
        rebaseERC20V2FutureAddress,
    );
    expect(await supplyManagerV2.getAddress()).to.be.equal(supplyManagerFutureAddress);

    // deploy RebaseERC20V2
    const RebaseTokenV2 = await ethers.getContractFactory('RebaseTokenV2');
    const rebaseTokenV2 = await RebaseTokenV2.connect(owner).deploy(
        supplyManagerV2,
        owner,
        'Test Molecula Rebase Token V2',
        'TMRTV2',
        18,
        supplyManagerV2,
    );
    expect(await rebaseTokenV2.getAddress()).to.be.equal(rebaseERC20V2FutureAddress);

    // deploy TokenVault
    const TokenVault = await ethers.getContractFactory('MockTokenVault');

    // deploy WETH token vault
    const tokenVaultWETH = await TokenVault.connect(owner).deploy(
        owner,
        rebaseTokenV2,
        supplyManagerV2,
        owner!.address,
        true,
    );

    await tokenVaultWETH.init(
        WETH,
        10n ** 6n, // minDepositValue
        10n ** 18n, // minRedeemShares
    );

    const tokenVaultStETH = await TokenVault.connect(owner).deploy(
        owner,
        rebaseTokenV2,
        supplyManagerV2,
        owner!.address,
        true,
    );

    await tokenVaultStETH.init(
        stETH,
        10n ** 6n, // minDepositValue
        10n ** 18n, // minRedeemShares
    );

    await depositManager.addStrategies(
        [ethMainnetBetaConfig.STETH_ADDRESS],
        [ethMainnetBetaConfig.STRATEGY_BASE_STETH],
    );

    // Add tokenVault into moleculaRebaseToken's white list
    const codeHash = keccak256((await tokenVaultWETH.getDeployedCode())!);
    await rebaseTokenV2.setCodeHash(codeHash, true);

    await rebaseTokenV2.addTokenVault(tokenVaultWETH);
    await rebaseTokenV2.addTokenVault(tokenVaultStETH);

    const operator = ethMainnetBetaConfig.EIGENLAYER_OPERATOR;
    const withdrawalCredentials = await depositManager.getWithdrawalCredentials();
    await WETH.approve(tokenVaultWETH, ethers.MaxUint256);
    await WETH.connect(user0).approve(tokenVaultWETH, ethers.MaxUint256);

    await stETH.approve(tokenVaultStETH, ethers.MaxUint256);
    await stETH.connect(user0).approve(tokenVaultStETH, ethers.MaxUint256);

    await tokenVaultWETH.unpauseAll();
    await tokenVaultStETH.unpauseAll();

    return {
        depositManager,
        supplyManagerV2,
        rebaseTokenV2,
        tokenVaultWETH,
        tokenVaultStETH,
        owner,
        user0,
        user1,
        user2,
        WETH,
        aWETH,
        cWETHv3,
        stETH,
        aavePool,
        aaveBufferLib,
        compoundBufferLib,
        withdrawalCredentials,
        operator,
    };
}

/* eslint-disable camelcase, max-lines, no-restricted-syntax, no-await-in-loop */
import { expect } from 'chai';
import { keccak256 } from 'ethers';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { generateRandomWallet } from './Common';

export async function deployCoreV2RewardBearingTokenWithoutInit() {
    const signers = await ethers.getSigners();
    const user0 = await generateRandomWallet();
    const poolOwner = signers.at(1)!;
    const user1 = signers.at(3)!;
    const guardian = signers.at(8)!;
    const operator = signers.at(11)!;
    const yieldDistributor = signers.at(12)!;
    const poolKeeper = await generateRandomWallet();

    const supplyManagerFutureAddress = ethers.getCreateAddress({
        from: poolOwner.address,
        nonce: (await poolOwner.getNonce()) + 1,
    });

    const rebaseERC20V2FutureAddress = ethers.getCreateAddress({
        from: poolOwner.address,
        nonce: (await poolOwner.getNonce()) + 2,
    });

    const USDC = await ethers.getContractAt('IERC20Metadata', ethMainnetBetaConfig.USDC_ADDRESS);
    const USDe = await ethers.getContractAt('IERC20Metadata', ethMainnetBetaConfig.USDE_ADDRESS);
    const nativeToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

    // deploy mock distributed pool
    const MockDistributedPool = await ethers.getContractFactory('MockDistributedPool');
    const mockDistributedPool = await MockDistributedPool.connect(poolOwner).deploy(
        poolOwner,
        [USDC, USDe, nativeToken],
        poolKeeper,
        supplyManagerFutureAddress,
        [],
        guardian,
    );

    // deploy supply manager
    const SupplyManagerV2 = await ethers.getContractFactory('SupplyManagerV2WithNative');
    const supplyManagerV2 = await SupplyManagerV2.connect(poolOwner).deploy(
        poolOwner,
        yieldDistributor,
        mockDistributedPool,
        4000,
        rebaseERC20V2FutureAddress,
    );
    expect(await supplyManagerV2.getAddress()).to.be.equal(supplyManagerFutureAddress);

    // deploy RebaseERC20V2
    const RewardBearingToken = await ethers.getContractFactory('RewardBearingToken');
    const rewardBearingToken = await RewardBearingToken.connect(poolOwner).deploy(
        'Test Molecula Reward Bearing Token',
        'TMRBT',
        poolOwner,
        supplyManagerV2,
        supplyManagerV2,
    );
    expect(await rewardBearingToken.getAddress()).to.be.equal(rebaseERC20V2FutureAddress);

    // deploy TokenVaults
    const TokenVault = await ethers.getContractFactory('MockTokenVault');
    const tokenUSDCVault = await TokenVault.connect(poolOwner).deploy(
        poolOwner,
        rewardBearingToken,
        supplyManagerV2,
        guardian,
        false,
    );
    const tokenUSDEVault = await TokenVault.connect(poolOwner).deploy(
        poolOwner,
        rewardBearingToken,
        supplyManagerV2,
        guardian,
        false,
    );

    const NativeTokenVault = await ethers.getContractFactory('MockNativeTokenVault');
    const nativeTokenVault = await NativeTokenVault.connect(poolOwner).deploy(
        poolOwner,
        rewardBearingToken,
        supplyManagerV2,
        guardian,
        false,
    );

    return {
        user0,
        user1,
        operator,
        rewardBearingToken,
        supplyManagerV2,
        tokenUSDCVault,
        tokenUSDEVault,
        mockDistributedPool,
        yieldDistributor,
        poolOwner,
        guardian,
        USDC,
        USDe,
        nativeTokenVault,
        nativeToken,
    };
}

export async function deployCoreV2RewardBearingToken() {
    const coreV2 = await deployCoreV2RewardBearingTokenWithoutInit();

    // Init TokenVaults
    await coreV2.tokenUSDCVault.init(
        coreV2.USDC,
        10n ** 6n, // minDepositAssets
        10n ** 18n, // minRedeemShares
    );
    await coreV2.tokenUSDEVault.init(
        coreV2.USDe,
        10n ** 6n, // minDepositAssets
        10n ** 18n, // minRedeemShares
    );
    await coreV2.nativeTokenVault.init(
        coreV2.nativeToken,
        10n ** 8n, // minDepositAssets
        10n ** 18n, // minRedeemShares
    );

    // Add tokenVault into moleculaRebaseToken's white list
    const codeHash = keccak256((await coreV2.tokenUSDCVault.getDeployedCode())!);
    await coreV2.rewardBearingToken.setCodeHash(codeHash, true);
    await coreV2.rewardBearingToken.addTokenVault(coreV2.tokenUSDCVault);
    await coreV2.rewardBearingToken.addTokenVault(coreV2.tokenUSDEVault);

    const codeHash2 = keccak256((await coreV2.nativeTokenVault.getDeployedCode())!);
    await coreV2.rewardBearingToken.setCodeHash(codeHash2, true);
    await coreV2.rewardBearingToken.addTokenVault(coreV2.nativeTokenVault);

    for (const tokenVault of [
        coreV2.tokenUSDCVault,
        coreV2.tokenUSDEVault,
        coreV2.nativeTokenVault,
    ]) {
        await tokenVault.unpauseRequestDeposit();
        await tokenVault.unpauseRequestRedeem();
    }

    return coreV2;
}

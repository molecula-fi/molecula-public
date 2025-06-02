/* eslint-disable camelcase, max-lines */
import { expect } from 'chai';
import { keccak256 } from 'ethers';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { generateRandomWallet } from './Common';

export async function deployCoreV2WithoutInit() {
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

    // deploy mock distributed pool
    const MockDistributedPool = await ethers.getContractFactory('MockDistributedPool');
    const mockDistributedPool = await MockDistributedPool.connect(poolOwner).deploy(
        poolOwner,
        [USDC, USDe],
        poolKeeper,
        supplyManagerFutureAddress,
        [],
        guardian,
    );

    // deploy supply manager
    const SupplyManagerV2 = await ethers.getContractFactory('SupplyManagerV2');
    const supplyManagerV2 = await SupplyManagerV2.connect(poolOwner).deploy(
        poolOwner,
        yieldDistributor,
        mockDistributedPool,
        4000,
        rebaseERC20V2FutureAddress,
    );
    expect(await supplyManagerV2.getAddress()).to.be.equal(supplyManagerFutureAddress);

    // deploy RebaseERC20V2
    const RebaseTokenV2 = await ethers.getContractFactory('RebaseTokenV2');
    const rebaseTokenV2 = await RebaseTokenV2.connect(poolOwner).deploy(
        supplyManagerV2,
        poolOwner,
        'Test Molecula Rebase Token V2',
        'TMRTV2',
        18,
        supplyManagerV2,
    );
    expect(await rebaseTokenV2.getAddress()).to.be.equal(rebaseERC20V2FutureAddress);

    // deploy TokenVaults
    const TokenVault = await ethers.getContractFactory('MockTokenVault');
    const tokenUSDCVault = await TokenVault.connect(poolOwner).deploy(
        poolOwner,
        rebaseTokenV2,
        supplyManagerV2,
        guardian,
    );
    const tokenUSDEVault = await TokenVault.connect(poolOwner).deploy(
        poolOwner,
        rebaseTokenV2,
        supplyManagerV2,
        guardian,
    );
    return {
        user0,
        user1,
        operator,
        rebaseTokenV2,
        supplyManagerV2,
        tokenUSDCVault,
        tokenUSDEVault,
        mockDistributedPool,
        yieldDistributor,
        poolOwner,
        guardian,
        USDC,
        USDe,
    };
}

export async function deployCoreV2() {
    const coreV2 = await deployCoreV2WithoutInit();

    // Init TokenVaults
    await coreV2.tokenUSDCVault.init(
        coreV2.USDC,
        10n ** 6n, // minDepositValue
        10n ** 18n, // minRedeemShares
    );
    await coreV2.tokenUSDEVault.init(
        coreV2.USDe,
        10n ** 6n, // minDepositValue
        10n ** 18n, // minRedeemShares
    );

    // Add tokenVault into moleculaRebaseToken's white list
    const codeHash = keccak256((await coreV2.tokenUSDCVault.getDeployedCode())!);
    await coreV2.rebaseTokenV2.setCodeHash(codeHash, true);
    await coreV2.rebaseTokenV2.addTokenVault(coreV2.tokenUSDCVault);
    await coreV2.rebaseTokenV2.addTokenVault(coreV2.tokenUSDEVault);

    return coreV2;
}

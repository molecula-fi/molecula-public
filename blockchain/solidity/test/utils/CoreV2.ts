/* eslint-disable camelcase, max-lines */
import { expect } from 'chai';
import { keccak256 } from 'ethers';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { generateRandomWallet } from './Common';
import { grantERC20 } from './grant';

export async function deployCoreV2() {
    const USDC = await ethers.getContractAt('IERC20Metadata', ethMainnetBetaConfig.USDC_ADDRESS);
    const signers = await ethers.getSigners();
    const user0 = await generateRandomWallet();
    const poolOwner = signers.at(0)!;
    const user1 = signers.at(3)!;
    const guardian = signers.at(8)!;
    const operator = signers.at(11)!;
    const poolKeeper = await generateRandomWallet();

    const supplyManagerFutureAddress = ethers.getCreateAddress({
        from: poolOwner.address,
        nonce: (await poolOwner.getNonce()) + 1,
    });

    const rebaseERC20V2FutureAddress = ethers.getCreateAddress({
        from: poolOwner.address,
        nonce: (await poolOwner.getNonce()) + 2,
    });

    // deploy mock distributed pool
    const MockDistributedPool = await ethers.getContractFactory('MockDistributedPool');
    const mockDistributedPool = await MockDistributedPool.connect(poolOwner).deploy(
        poolOwner,
        [USDC],
        poolKeeper,
        supplyManagerFutureAddress,
        [],
        guardian,
    );
    await grantERC20(mockDistributedPool, USDC, 1);

    // deploy supply manager
    const SupplyManagerV2 = await ethers.getContractFactory('SupplyManagerV2');
    const supplyManagerV2 = await SupplyManagerV2.connect(poolOwner).deploy(
        poolOwner,
        poolOwner,
        mockDistributedPool,
        4000,
        rebaseERC20V2FutureAddress,
    );
    expect(await supplyManagerV2.getAddress()).to.be.equal(supplyManagerFutureAddress);

    // deploy RebaseERC20V2
    const RebaseTokenV2 = await ethers.getContractFactory('RebaseTokenV2');
    const rebaseTokenV2 = await RebaseTokenV2.connect(poolOwner).deploy(
        1n,
        supplyManagerV2,
        poolOwner,
        'Test Molecula Rebase Token V2',
        'TMRTV2',
        18,
        guardian,
        supplyManagerV2,
    );
    expect(await rebaseTokenV2.getAddress()).to.be.equal(rebaseERC20V2FutureAddress);

    // deploy TokenVault
    const TokenVault = await ethers.getContractFactory('MockTokenVault');
    const tokenVault = await TokenVault.connect(poolOwner).deploy(
        poolOwner,
        rebaseTokenV2,
        supplyManagerV2,
        guardian,
    );

    await tokenVault.init(
        USDC,
        10n ** 6n, // minDepositValue
        10n ** 18n, // minRedeemShares
    );

    // Add tokenVault into moleculaRebaseToken's white list
    const codeHash = keccak256((await tokenVault.getDeployedCode())!);
    await rebaseTokenV2.setCodeHash(codeHash, true);
    await rebaseTokenV2.addTokenVault(tokenVault);

    return {
        user0,
        user1,
        operator,
        rebaseTokenV2,
        supplyManagerV2,
        tokenVault,
        USDC,
        mockDistributedPool,
    };
}

/* eslint-disable camelcase, max-lines */
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { grantERC20, grantETH, removeERC20 } from './grant';

const INITIAL_SUPPLY = 100_000_000_000_000_000_000n;

// We define a fixture to reuse the same setup in every test.
// We use loadFixture to run this setup once, snapshot that state,
// and reset Hardhat Network to that snapshot in every test.
export async function deployNitrogen() {
    // Contracts are deployed using the first signer/account by default
    const signers = await ethers.getSigners();
    const poolOwner = signers.at(0)!;
    const rebaseTokenOwner = signers.at(1)!;
    const user0 = signers.at(2)!;
    const user1 = signers.at(3)!;
    const caller = signers.at(4)!;
    const malicious = signers.at(5)!;
    const controller = signers.at(6)!;
    const guardian = signers.at(7)!;

    const poolKeeper = ethMainnetBetaConfig.POOL_KEEPER;

    // if POOL_KEEPER does not have DAI then transfer it
    const DAI = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.DAI_ADDRESS);
    const initBalance = await DAI.balanceOf(poolKeeper);

    if (initBalance < INITIAL_SUPPLY) {
        // grant DAI for initial supply
        await grantERC20(poolKeeper, DAI, INITIAL_SUPPLY - initBalance);
    } else if (initBalance > INITIAL_SUPPLY) {
        // Burn excess DAI for initial supply
        await removeERC20(poolKeeper, DAI, INITIAL_SUPPLY);
    }

    expect(await DAI.balanceOf(poolKeeper)).to.equal(INITIAL_SUPPLY);

    // Grant ETH to POOL_KEEPER
    await grantETH(poolKeeper, ethers.parseEther('20'));

    // calc future addresses
    const transactionCount = await poolOwner.getNonce();
    const addr = poolOwner.address;
    const smFutureAddress = ethers.getCreateAddress({
        from: addr,
        nonce: transactionCount + 2,
    });
    const rtFutureAddress = ethers.getCreateAddress({
        from: addr,
        nonce: transactionCount + 3,
    });
    // deploy moleculaPool
    const MoleculaPool = await ethers.getContractFactory('MoleculaPool');
    const moleculaPool = await MoleculaPool.connect(poolOwner).deploy(
        poolOwner.address,
        poolOwner.address,
        ethMainnetBetaConfig.POOLS20,
        ethMainnetBetaConfig.POOLS4626,
        poolKeeper,
        smFutureAddress,
    );

    // deploy agent accountant
    const USDT = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.USDT_ADDRESS);
    const Agent = await ethers.getContractFactory('AccountantAgent');
    const agent = await Agent.connect(poolOwner).deploy(
        poolOwner.address,
        rtFutureAddress,
        smFutureAddress,
        ethMainnetBetaConfig.USDT_ADDRESS,
        guardian,
    );

    // deploy supply manager
    const SupplyManager = await ethers.getContractFactory('SupplyManager');
    const supplyManager = await SupplyManager.connect(poolOwner).deploy(
        poolOwner.address,
        poolOwner.address,
        await moleculaPool.getAddress(),
        4000,
    );

    expect(await supplyManager.getAddress()).to.equal(smFutureAddress);

    const rebaseTokenName = 'ETH TEST molecula';
    const rebaseTokenSymbol = 'MTE';
    const rebaseTokenDecimals = ethMainnetBetaConfig.DAI_TOKEN_DECIMALS;
    // deploy Rebase Token
    const RebaseToken = await ethers.getContractFactory('RebaseToken');
    const rebaseToken = await RebaseToken.connect(poolOwner).deploy(
        rebaseTokenOwner.address,
        await agent.getAddress(),
        await supplyManager.totalSharesSupply(),
        await supplyManager.getAddress(),
        rebaseTokenName,
        rebaseTokenSymbol,
        rebaseTokenDecimals,
        10_000_000,
        10_000_000_000_000_000_000n,
    );
    expect(await rebaseToken.getAddress()).to.equal(rtFutureAddress);
    expect(await rebaseToken.name()).to.be.equal(rebaseTokenName);
    expect(await rebaseToken.symbol()).to.be.equal(rebaseTokenSymbol);
    expect(await rebaseToken.decimals()).to.be.equal(rebaseTokenDecimals);

    // set agent
    await supplyManager.setAgent(await agent.getAddress(), true);

    return {
        moleculaPool,
        agent,
        supplyManager,
        rebaseToken,
        poolOwner,
        rebaseTokenOwner,
        user0,
        user1,
        caller,
        malicious,
        controller,
        USDT,
        poolKeeper,
    };
}

export async function deployMoleculaPool() {
    const signers = await ethers.getSigners();
    const poolOwner = signers.at(0)!;
    const poolKeeper = signers.at(1)!;
    const randomAccount = signers.at(2)!;

    // deploy moleculaPool
    const MoleculaPool = await ethers.getContractFactory('MoleculaPool');
    const moleculaPool = await MoleculaPool.connect(poolOwner).deploy(
        poolOwner.address,
        randomAccount.address,
        [],
        [],
        poolKeeper.address,
        randomAccount.address,
    );

    await removeERC20(poolKeeper.address, ethMainnetBetaConfig.USDC_ADDRESS, 0n);
    const USDT = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.USDT_ADDRESS);

    return { moleculaPool, poolOwner, poolKeeper, USDT };
}

export async function deployMoleculaPoolAndSupplyManager(
    p4626: { pool: string; n: number }[],
    poolOwner: HardhatEthersSigner,
    poolKeeper: HardhatEthersSigner,
) {
    const smFutureAddress = ethers.getCreateAddress({
        from: poolOwner.address,
        nonce: (await poolOwner.getNonce()) + 1,
    });
    const MoleculaPool = await ethers.getContractFactory('MoleculaPool');
    const moleculaPool = await MoleculaPool.connect(poolOwner).deploy(
        poolOwner.address,
        poolOwner.address,
        [],
        p4626,
        poolKeeper.address,
        smFutureAddress,
    );
    // deploy supply manager
    const SupplyManager = await ethers.getContractFactory('SupplyManager');
    const supplyManager = await SupplyManager.connect(poolOwner).deploy(
        poolOwner.address,
        poolOwner.address,
        await moleculaPool.getAddress(),
        0,
    );
    expect(smFutureAddress).to.equal(await supplyManager.getAddress());
    return { supplyManager, moleculaPool };
}

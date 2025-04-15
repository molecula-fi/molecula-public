/* eslint-disable camelcase */
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import { generateRandomWallet } from './Common';
import { findRequestRedeemEvent } from './event';
import { grantERC20 } from './grant';

const INITIAL_SUPPLY = 100n * 10n ** 18n;

export async function deployNitrogenV2Common(token: string) {
    // Contracts are deployed using the first signer/account by default
    const signers = await ethers.getSigners();
    const poolKeeper = await generateRandomWallet();
    const poolOwner = signers.at(0)!;
    const rebaseTokenOwner = signers.at(1)!;
    const user0 = await generateRandomWallet();
    const user1 = signers.at(3)!;
    const caller = signers.at(4)!;
    const malicious = signers.at(5)!;
    const controller = signers.at(6)!;
    const randAccount = signers.at(7)!;
    const guardian = signers.at(8)!;

    // calc future addresses
    const transactionCount = await poolOwner.getNonce();
    const addr = poolOwner.address;
    const supplyManagerFutureAddress = ethers.getCreateAddress({
        from: addr,
        nonce: transactionCount + 2,
    });
    const rebaseTokenFutureAddress = ethers.getCreateAddress({
        from: addr,
        nonce: transactionCount + 3,
    });

    // deploy moleculaPool
    const MoleculaPool = await ethers.getContractFactory('MoleculaPoolTreasury');
    const moleculaPool = await MoleculaPool.connect(poolOwner).deploy(
        poolOwner.address,
        ethMainnetBetaConfig.TOKENS.map(x => x.token),
        poolKeeper,
        supplyManagerFutureAddress,
        [],
        guardian,
    );

    // if moleculaPool does not have DAI then transfer them
    const DAI = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.DAI_ADDRESS);
    const initBalance = await DAI.balanceOf(moleculaPool.getAddress());
    expect(initBalance).to.be.equal(0n);
    // grant DAI for initial supply
    await grantERC20(moleculaPool.getAddress(), DAI, INITIAL_SUPPLY);
    expect(await DAI.balanceOf(moleculaPool.getAddress())).to.equal(INITIAL_SUPPLY);

    // deploy pausable agent accountant
    const Agent = await ethers.getContractFactory('AccountantAgent');
    const agent = await Agent.connect(poolOwner).deploy(
        poolOwner.address,
        rebaseTokenFutureAddress,
        supplyManagerFutureAddress,
        token,
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

    expect(await supplyManager.getAddress()).to.equal(supplyManagerFutureAddress);

    // deploy Rebase Token
    const RebaseToken = await ethers.getContractFactory('RebaseToken');
    const rebaseToken = await RebaseToken.connect(poolOwner).deploy(
        rebaseTokenOwner.address,
        await agent.getAddress(),
        await supplyManager.totalSharesSupply(),
        await supplyManager.getAddress(),
        'ETH TEST molecula',
        'MTE',
        ethMainnetBetaConfig.DAI_TOKEN_DECIMALS,
        10_000_000,
        10_000_000_000_000_000_000n,
    );
    expect(await rebaseToken.getAddress()).to.equal(rebaseTokenFutureAddress);

    // set agent
    await supplyManager.setAgent(await agent.getAddress(), true);

    // verify force approve for Token correct work to increase allowance
    const Token = await ethers.getContractAt('IERC20', token);
    expect(await Token.allowance(moleculaPool, agent)).to.be.equal(ethers.MaxUint256);

    // verify force approve for Token correct work to decrease allowance
    await supplyManager.connect(poolOwner).setAgent(agent, false);
    expect(await Token.allowance(moleculaPool, agent)).to.be.equal(0n);

    await supplyManager.connect(poolOwner).setAgent(agent, true);
    expect(await Token.allowance(moleculaPool, agent)).to.be.equal(ethers.MaxUint256);

    const USDT = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.USDT_ADDRESS);

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
        randAccount,
        guardian,
        USDT,
    };
}

export function deployNitrogenV2WithUSDT() {
    return deployNitrogenV2Common(ethMainnetBetaConfig.USDT_ADDRESS);
}

export function deployNitrogenV2WithStakedUSDe() {
    return deployNitrogenV2Common(ethMainnetBetaConfig.SUSDE_ADDRESS);
}

export async function deployMoleculaPoolV11(
    poolOwner: HardhatEthersSigner,
    supplyManagerAddress: string,
) {
    const signers = await ethers.getSigners();
    const newPoolKeeper = signers.at(10)!;
    const guardian = signers.at(11)!;
    const MoleculaPoolTreasury = await ethers.getContractFactory('MoleculaPoolTreasury');
    const moleculaPoolV2 = await MoleculaPoolTreasury.connect(poolOwner).deploy(
        poolOwner.address,
        [],
        newPoolKeeper.address,
        supplyManagerAddress,
        [],
        guardian,
    );
    return moleculaPoolV2;
}

export async function deployMoleculaPoolV2() {
    const signers = await ethers.getSigners();
    const poolOwner = signers.at(0)!;
    const poolKeeper = signers.at(1)!;
    const randomAccount = signers.at(2)!;
    const malicious = signers.at(3)!;
    const guardian = signers.at(4)!;

    // deploy moleculaPool
    const MoleculaPool = await ethers.getContractFactory('MoleculaPoolTreasury');
    const moleculaPool = await MoleculaPool.connect(poolOwner).deploy(
        poolOwner.address,
        [],
        poolKeeper.address,
        randomAccount.address,
        [ethMainnetBetaConfig.USDT_ADDRESS],
        guardian,
    );
    const USDT = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.USDT_ADDRESS);
    return { moleculaPool, poolOwner, poolKeeper, malicious, USDT };
}

export async function initNitrogenForPause() {
    const { moleculaPool, randAccount, guardian, poolOwner } = await deployNitrogenV2WithUSDT();
    const USDT = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.USDT_ADDRESS);
    const keeperSigner = await ethers.getImpersonatedSigner(await moleculaPool.poolKeeper());
    await moleculaPool.addInWhiteList(USDT);
    await moleculaPool.addInWhiteList(randAccount);

    // Prepare messages
    const encodedApprove = USDT.interface.encodeFunctionData('approve', [
        randAccount.address,
        100500n,
    ]);
    const encodedBalanceOf = USDT.interface.encodeFunctionData('balanceOf', [randAccount.address]);

    const failToExecuteFunctions = async (errorMsg: string) => {
        await expect(
            moleculaPool.connect(keeperSigner).execute(USDT.getAddress(), encodedBalanceOf),
        ).to.be.rejectedWith(errorMsg);
        await expect(
            moleculaPool.connect(keeperSigner).execute(USDT.getAddress(), encodedApprove),
        ).to.be.rejectedWith(errorMsg);
    };
    const executeFunctions = async () => {
        await moleculaPool.connect(keeperSigner).execute(USDT.getAddress(), encodedBalanceOf);
        await moleculaPool.connect(keeperSigner).execute(USDT.getAddress(), encodedApprove);
    };
    return {
        moleculaPool,
        guardian,
        poolOwner,
        failToExecuteFunctions,
        executeFunctions,
        USDT,
        randAccount,
    };
}

export async function initNitrogenAndRequestDeposit() {
    const { moleculaPool, rebaseToken, guardian, poolOwner, agent, user0, malicious, randAccount } =
        await deployNitrogenV2WithUSDT();
    const USDT = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.USDT_ADDRESS);
    const depositValue = 100_000_000n;
    await grantERC20(user0, USDT, depositValue);
    // approve USDT to agent
    await USDT.connect(user0).approve(await agent.getAddress(), depositValue);
    // user0 calls requestDeposit on rebaseToken
    await rebaseToken.connect(user0).requestDeposit(depositValue, user0, user0);

    // user asks for redeem
    const redeemShares = await rebaseToken.sharesOf(user0);
    const tx = await rebaseToken.connect(user0).requestRedeem(redeemShares, user0, user0);
    const { operationId, redeemValue } = await findRequestRedeemEvent(tx);
    return {
        moleculaPool,
        guardian,
        user0,
        rebaseToken,
        malicious,
        poolOwner,
        USDT,
        randAccount,
        operationId,
        redeemValue,
    };
}

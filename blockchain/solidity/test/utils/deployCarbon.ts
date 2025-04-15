/* eslint-disable camelcase */
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';
import { tronMainnetBetaConfig } from '../../configs/tron/mainnetBetaTyped';

import { generateRandomWallet } from './Common';
import { grantERC20, grantETH } from './grant';

export const INITIAL_SUPPLY = 100_000_000_000_000_000_000n;

export async function deployCarbon() {
    // Contracts are deployed using the first signer/account by default
    const [owner, user] = await ethers.getSigners();
    const poolKeeper = await generateRandomWallet();
    expect(owner).to.exist;
    expect(user).to.exist;

    // if POOL_KEEPER do not have DAI then transfer it
    const DAI = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.DAI_ADDRESS);
    const initBalance = await DAI.balanceOf(poolKeeper);
    if (initBalance < INITIAL_SUPPLY) {
        const val = INITIAL_SUPPLY - initBalance;
        // grant DAI for initial supply
        await grantERC20(poolKeeper.address, DAI, val);
    }
    expect(await DAI.balanceOf(poolKeeper)).to.equal(INITIAL_SUPPLY);
    // Grant ETH to POOL_KEEPER
    await grantETH(poolKeeper.address, ethers.parseEther('20'));

    // calc supply manager future address
    const transactionCount = await owner!.getNonce();
    const addr = owner!.address;
    const smFutureAddress = ethers.getCreateAddress({
        from: addr,
        nonce: transactionCount + 1,
    });

    // deploy moleculaPool
    const MoleculaPool = await ethers.getContractFactory('MoleculaPool');
    const moleculaPool = await MoleculaPool.connect(owner!).deploy(
        owner!.address,
        owner!.address,
        ethMainnetBetaConfig.TOKENS.map(x => ({ pool: x.token, n: x.n })),
        [],
        poolKeeper.address,
        smFutureAddress,
    );

    // deploy supply manager
    const SupplyManager = await ethers.getContractFactory('SupplyManager');

    const supplyManager = await SupplyManager.connect(owner!).deploy(
        owner!.address,
        owner!.address,
        await moleculaPool.getAddress(),
        4000,
    );

    expect(await supplyManager.getAddress()).to.equal(smFutureAddress);

    // deploy mock LayerZero Endpoint
    const MockLZEndpoint = await ethers.getContractFactory('MockLZEndpoint');
    const mockLZEndpoint = await MockLZEndpoint.connect(owner!).deploy();

    // calc agent LZ future address
    const trxCount = await owner!.getNonce();
    const agentLZFutureAddress = ethers.getCreateAddress({
        from: owner!.address,
        nonce: trxCount,
    });

    // deploy agentLZ
    const AgentLZ = await ethers.getContractFactory('AgentLZ');

    const agentLZ = await AgentLZ.connect(owner!).deploy(
        owner!.address,
        owner!.address,
        await mockLZEndpoint.getAddress(),
        await supplyManager.getAddress(),
        ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
        ethMainnetBetaConfig.USDT_ADDRESS,
        ethMainnetBetaConfig.USDT_OFT,
    );
    expect(await agentLZ.getAddress()).to.equal(agentLZFutureAddress);

    await supplyManager.setAgent(await agentLZ.getAddress(), true);

    const USDT = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.USDT_ADDRESS);

    // deploy Tron contracts

    const Oracle = await ethers.getContractFactory('TronOracle');
    const oracle = await Oracle.connect(owner!).deploy(
        tronMainnetBetaConfig.MUSD_TOKEN_INITIAL_SUPPLY,
        tronMainnetBetaConfig.MUSD_TOKEN_INITIAL_SUPPLY,
        owner!.address,
        owner!.address,
        owner!.address,
    );

    const AccountantLZ = await ethers.getContractFactory('AccountantLZ');
    const accountantLZ = await AccountantLZ.connect(owner!).deploy(
        owner!.address,
        owner!.address,
        ethMainnetBetaConfig.LAYER_ZERO_ENDPOINT,
        ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
        ethMainnetBetaConfig.USDT_ADDRESS,
        ethMainnetBetaConfig.USDT_ADDRESS,
        await agentLZ.getAddress(),
        await oracle.getAddress(),
    );

    // Set Accountant to Oracle
    await oracle.setAccountant(await accountantLZ.getAddress());

    const RebaseTokenCommon = await ethers.getContractFactory('RebaseTokenTron');
    const rebaseToken = await RebaseTokenCommon.connect(owner!).deploy(
        owner!.address,
        await accountantLZ.getAddress(),
        0n,
        await oracle.getAddress(),
        tronMainnetBetaConfig.MUSD_TOKEN_DECIMALS,
        tronMainnetBetaConfig.MUSD_TOKEN_MIN_DEPOSIT,
        tronMainnetBetaConfig.MUSD_TOKEN_MIN_REDEEM,
    );

    await accountantLZ.setUnderlyingToken(await rebaseToken.getAddress());

    // deploy mUSDLock
    const MUSDLock = await ethers.getContractFactory('MUSDLock');
    const mUSDLock = await MUSDLock.connect(owner!).deploy(await rebaseToken.getAddress());

    // set AccountantLZ to AgentLZ
    await agentLZ.setAccountant(await accountantLZ.getAddress());

    // add Peer
    await agentLZ.setPeer(
        ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
        ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
    );

    // Deploy mock lz message decoder
    const MockLZMessageDecoder = await ethers.getContractFactory('MockLZMessageDecoder');
    const lzMessageDecoder = await MockLZMessageDecoder.connect(owner!).deploy();

    return {
        moleculaPool,
        supplyManager,
        agentLZ,
        oracle,
        accountantLZ,
        rebaseToken,
        mUSDLock,
        mockLZEndpoint,
        lzMessageDecoder,
        owner,
        user,
        USDT,
        poolKeeper,
    };
}

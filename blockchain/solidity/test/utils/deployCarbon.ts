/* eslint-disable camelcase */
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { ethMainnetBetaConfig } from '../../configs/ethereum/mainnetBetaTyped';

import {
    CONFIRM_DEPOSIT,
    CONFIRM_DEPOSIT_AND_UPDATE_ORACLE,
    CONFIRM_REDEEM,
    DISTRIBUTE_YIELD,
    DISTRIBUTE_YIELD_AND_UPDATE_ORACLE,
    SWAP_WMUSDT,
    UPDATE_ORACLE,
} from '../../scripts/utils/lzMsgTypes';

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

    // deploy mockSwftSwap
    const MockSwftSwap = (await ethers.getContractFactory('MockSwftSwap')).connect(owner!);
    const mockSwftSwap = await MockSwftSwap.deploy(owner!.address);

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
        ethMainnetBetaConfig.POOLS20,
        ethMainnetBetaConfig.POOLS4626,
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
        nonce: trxCount + 1,
    });

    // deploy wmUSDT token
    const addressesConfig = {
        initialOwner: owner!.address,
        agentAddress: agentLZFutureAddress,
        poolKeeperAddress: poolKeeper.address,
        server: owner!.address,
    };
    const layerZeroConfig = {
        endpoint: await mockLZEndpoint.getAddress(),
        authorizedLZConfigurator: owner!.address,
        lzBaseOpt: '0x000301001101', // mock Layer Zero options
        lzDstEid: ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
    };
    const swftConfig = {
        usdtTokenAddress: ethMainnetBetaConfig.USDT_ADDRESS,
        swftBridgeAddress: await mockSwftSwap.getAddress(),
        swftDest: 'TronTreasuryAddr', // mock dst address for swft
    };

    const WMUSDTToken = await ethers.getContractFactory('WmUsdtToken');
    const wmUSDT = await WMUSDTToken.connect(owner!).deploy(
        0,
        addressesConfig,
        layerZeroConfig,
        swftConfig,
    );

    // deploy agentLZ
    const AgentLZ = await ethers.getContractFactory('AgentLZ');
    const agentLZ = await AgentLZ.connect(owner!).deploy(
        owner!.address,
        owner!.address,
        owner!.address,
        await mockLZEndpoint.getAddress(),
        await supplyManager.getAddress(),
        ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
        await wmUSDT.getAddress(),
        '0x000301001101', // mock Layer Zero base options
    );
    expect(await agentLZ.getAddress()).to.equal(agentLZFutureAddress);

    // add Peer
    await agentLZ.setPeer(
        ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
        ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
    );
    // add peer for wmUSDT
    await wmUSDT.setPeer(
        ethMainnetBetaConfig.LAYER_ZERO_TRON_EID,
        ethMainnetBetaConfig.LAYER_ZERO_TRON_MAINNET_OAPP_MOCK,
    );
    // set agen LZ to supply manager
    await supplyManager.setAgent(await agentLZ.getAddress(), true);
    // add wmUSDT to molecula pool
    await moleculaPool.addPool20(await wmUSDT.getAddress(), 12);

    // Set agentLZ LZ options
    await agentLZ.setGasLimit(CONFIRM_DEPOSIT, 100_000n, 0n);
    await agentLZ.setGasLimit(CONFIRM_DEPOSIT_AND_UPDATE_ORACLE, 200_000n, 0n);
    await agentLZ.setGasLimit(DISTRIBUTE_YIELD, 300_000n, 50_000n);
    await agentLZ.setGasLimit(DISTRIBUTE_YIELD_AND_UPDATE_ORACLE, 350_000n, 50_000n);
    await agentLZ.setGasLimit(CONFIRM_REDEEM, 400_000n, 0n);
    await agentLZ.setGasLimit(UPDATE_ORACLE, 10n, 0n);

    // Set wmUSDT LZ options
    await wmUSDT.setGasLimit(SWAP_WMUSDT, 100_000n, 0n);

    // Deploy mock lz message decoder
    const MockLZMessageDecoder = await ethers.getContractFactory('MockLZMessageDecoder');
    const lzMessageDecoder = await MockLZMessageDecoder.connect(owner!).deploy();

    const USDT = await ethers.getContractAt('IERC20', ethMainnetBetaConfig.USDT_ADDRESS);

    return {
        moleculaPool,
        supplyManager,
        mockLZEndpoint,
        wmUSDT,
        agentLZ,
        owner,
        user,
        lzMessageDecoder,
        USDT,
        poolKeeper,
    };
}

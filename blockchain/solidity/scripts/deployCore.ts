import type { AddressLike } from 'ethers';
import { ethers } from 'hardhat';

import type { NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { DEPLOY_GAS_LIMIT } from '../configs/ethereum';

import { getConfig, increaseBalance, unitePool20And4626, getNonce } from './utils/deployUtils';

async function deploymUSDe(stakedUSDe: AddressLike, owner: AddressLike) {
    // deploy mUSDe
    const musdeFactory = await ethers.getContractFactory('MUSDE');
    const musde = await musdeFactory.deploy(stakedUSDe, owner, { gasLimit: DEPLOY_GAS_LIMIT });
    await musde.waitForDeployment();
    const musdeAddress = await musde.getAddress();
    console.log('mUSDe deployed: ', musdeAddress);

    return musdeAddress;
}

export async function deployCore(environment: NetworkType, nomUSDe: boolean) {
    const { config, account, USDT } = await getConfig(environment);

    // deploy mUSDe
    const mUSDe = nomUSDe ? '' : await deploymUSDe(config.SUSDE_ADDRESS, config.POOL_KEEPER);
    console.log('mUSDe address: ', mUSDe);

    // Pool keeper is already deployed
    const poolKeeper = config.POOL_KEEPER;

    // add mUSDe to pools20
    const pools20 = config.POOLS20;
    if (mUSDe !== '') {
        pools20.push({ pool: mUSDe, n: 0 });
    }
    console.log('pools20:', pools20);

    // deploy moleculaPool
    const supplyManagerFutureAddress = ethers.getCreateAddress({
        from: account,
        nonce: (await getNonce(account)) + 2, // deploy moleculaPool + transfer tokens
    });
    const MoleculaPoolFactory = await ethers.getContractFactory('MoleculaPoolTreasury');
    if (config.GUARDIAN_ADDRESS === '0x') {
        throw new Error(`Set guardian address in config.`);
    }
    const moleculaPool = await MoleculaPoolFactory.deploy(
        account,
        unitePool20And4626(pools20, config.POOLS4626),
        poolKeeper,
        supplyManagerFutureAddress,
        config.WHITE_LIST,
        config.USDT_ADDRESS,
        config.GUARDIAN_ADDRESS,
        { gasLimit: DEPLOY_GAS_LIMIT },
    );
    await moleculaPool.waitForDeployment();
    console.log('MoleculaPool address: ', await moleculaPool.getAddress());
    await increaseBalance(
        'MoleculaPoolTreasury',
        await moleculaPool.getAddress(),
        config.INITIAL_USDT_SUPPLY,
        USDT,
    );

    // deploy supply manager
    const SupplyManager = await ethers.getContractFactory('SupplyManager');
    const supplyManager = await SupplyManager.deploy(
        account, // In the end set owner to pool_keeper
        poolKeeper,
        await moleculaPool.getAddress(),
        config.APY_FORMATTER,
        { gasLimit: DEPLOY_GAS_LIMIT },
    );
    await supplyManager.waitForDeployment();
    console.log('SupplyManager address: ', await supplyManager.getAddress());
    if ((await supplyManager.getAddress()) !== supplyManagerFutureAddress) {
        console.error(
            'SupplyManager address not equal to precalculated address: ',
            supplyManagerFutureAddress,
        );
        process.exit(1);
    }
    if ((await moleculaPool.SUPPLY_MANAGER()) !== supplyManagerFutureAddress) {
        console.error(
            "MoleculaPool's SupplyManager address not equal to deployed SupplyManager: ",
            supplyManagerFutureAddress,
        );
        process.exit(1);
    }

    // print addresses
    console.log('Block #', await ethers.provider.getBlockNumber());
    console.log('MoleculaPool address: ', await moleculaPool.getAddress());
    console.log('SupplyManager address: ', await supplyManager.getAddress());
    console.log('Pool keeper: ', poolKeeper);
    console.log('mUSDe deployed: ', mUSDe);

    return {
        supplyManager: await supplyManager.getAddress(),
        moleculaPool: await moleculaPool.getAddress(),
        poolKeeper,
        mUSDe,
        ethena: {
            USDe: config.USDE_ADDRESS,
            sUSDe: config.SUSDE_ADDRESS,
        },
    };
}

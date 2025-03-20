import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import { type NetworkType, type ContractsNitrogen } from '@molecula-monorepo/blockchain.addresses';

import { DEPLOY_GAS_LIMIT } from '../../../configs/ethereum/constants';
import { getConfig, readFromFile, unitePool20And4626 } from '../../utils/deployUtils';

export async function deployMoleculaPoolTreasury(
    hre: HardhatRuntimeEnvironment,
    environment: NetworkType,
) {
    const { config } = await getConfig(hre, environment);
    const contractsNitrogen: typeof ContractsNitrogen = await readFromFile(
        `${environment}/contracts_nitrogen.json`,
    );

    const pools20 = [...config.POOLS20];
    if (contractsNitrogen.eth.mUSDe !== '') {
        pools20.push({ pool: contractsNitrogen.eth.mUSDe, n: 0 });
    }

    const MoleculaPoolTreasury = await hre.ethers.getContractFactory('MoleculaPoolTreasury');
    const moleculaPoolTreasury = await MoleculaPoolTreasury.deploy(
        config.OWNER, // Note: owner is not deploy wallet
        unitePool20And4626(pools20, config.POOLS4626),
        config.POOL_KEEPER,
        contractsNitrogen.eth.supplyManager,
        config.WHITE_LIST,
        config.GUARDIAN_ADDRESS,
        { gasLimit: DEPLOY_GAS_LIMIT },
    );
    await moleculaPoolTreasury.waitForDeployment();
    return {
        moleculaPoolTreasury: await moleculaPoolTreasury.getAddress(),
    };
}

import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import {
    type NetworkType,
    type ContractsNitrogen,
    type EVMAddress,
    type PoolData,
} from '@molecula-monorepo/blockchain.addresses';

import { DEPLOY_GAS_LIMIT } from '../../../configs/ethereum/constants';
import { getConfig, readFromFile } from '../../utils/deployUtils';

export async function deployMoleculaPoolTreasury(
    hre: HardhatRuntimeEnvironment,
    environment: NetworkType,
) {
    const { config } = await getConfig(hre, environment);
    const contractsNitrogen: typeof ContractsNitrogen = await readFromFile(
        `${environment}/contracts_nitrogen.json`,
    );

    const tokens: PoolData[] = [...config.TOKENS];
    if (contractsNitrogen.eth.mUSDe !== '') {
        tokens.push({ token: contractsNitrogen.eth.mUSDe as EVMAddress, n: 0 });
    }

    const MoleculaPoolTreasury = await hre.ethers.getContractFactory('MoleculaPoolTreasury');
    const moleculaPoolTreasury = await MoleculaPoolTreasury.deploy(
        config.OWNER, // Note: owner is not deploy wallet
        tokens.map(x => x.token),
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

/* eslint-disable no-await-in-loop, no-restricted-syntax, @typescript-eslint/no-explicit-any */

import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import type { NetworkType } from '@molecula-monorepo/blockchain.addresses';

import { getNetworkConfig } from '../utils/deployUtils';

export async function setOwnerFromConfig(
    hre: HardhatRuntimeEnvironment,
    environment: NetworkType,
    contracts: { addr: string; name: string }[],
) {
    const config = getNetworkConfig(environment);
    const account = (await hre.ethers.getSigners())[0]!;
    console.log(`Setting owner ${config.OWNER} for the contracts:`);
    for (const contract of contracts) {
        const ownableContract = await hre.ethers.getContractAt('Ownable', contract.addr);
        const currentOwner = await ownableContract.owner();
        if (currentOwner === config.OWNER) {
            console.log(
                `\tContract ${contract.name} ${contract.addr} has already the owner. Skipped.`,
            );
        } else if (currentOwner === account.address) {
            const response = await ownableContract.transferOwnership(config.OWNER);
            await response.wait();
            console.log(`\tSet owner for contract ${contract.name} ${contract.addr}.`);
        } else {
            throw Error(
                `\tContract ${contract.name} ${contract.addr} has ${currentOwner} owner. It's impossible to change the owner.`,
            );
        }
    }
}

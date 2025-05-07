/* eslint-disable no-await-in-loop, no-restricted-syntax, @typescript-eslint/no-explicit-any */

import { type HardhatRuntimeEnvironment } from 'hardhat/types';

import { TronWeb } from 'tronweb';

import type { EnvironmentType } from '@molecula-monorepo/blockchain.addresses';

import { getTronEnvironmentConfig } from './deployUtils';

export async function setOwner(
    hre: HardhatRuntimeEnvironment,
    contracts: { addr: string; name: string }[],
    newOwner: string,
) {
    const account = (await hre.ethers.getSigners())[0]!;
    console.log(`Setting owner ${newOwner} for the contracts:`);
    for (const contract of contracts) {
        const ownableContract = await hre.ethers.getContractAt(
            '@openzeppelin/contracts/access/Ownable.sol:Ownable',
            contract.addr,
        );
        // @ts-ignore
        const currentOwner = await ownableContract.owner();
        if (currentOwner === newOwner) {
            console.log(
                `\tContract ${contract.name} ${contract.addr} has already the owner. Skipped.`,
            );
        } else if (currentOwner === account.address) {
            // @ts-ignore
            const response = await ownableContract.transferOwnership(newOwner);
            await response.wait();
            console.log(`\tSet owner for contract ${contract.name} ${contract.addr}.`);
        } else {
            throw Error(
                `\tContract ${contract.name} ${contract.addr} has ${currentOwner} owner. It's impossible to change the owner.`,
            );
        }
    }
}

export async function setTronOwner(
    hre: HardhatRuntimeEnvironment,
    privateKey: string,
    network: EnvironmentType,
    contracts: { name: string; addr: string }[],
    newOwner: string,
) {
    const config = getTronEnvironmentConfig(network);
    // Create TronWeb instance
    const tronWeb = new TronWeb({
        fullHost: config.RPC_URL,
    });

    tronWeb.setPrivateKey(privateKey);
    console.log(`Setting owner ${config.OWNER} for the contracts:`);
    const initialOwner = tronWeb.address.fromPrivateKey(privateKey);
    // eslint-disable-next-line no-restricted-syntax
    for (const contract of contracts) {
        // Get ABI
        const artifact = await hre.artifacts.readArtifact(
            '@openzeppelin/contracts/access/Ownable.sol:Ownable',
        );

        const ownableContract = tronWeb.contract(artifact.abi, contract.addr);
        const currentOwner = tronWeb.address.fromHex(await ownableContract.owner().call());
        if (currentOwner === newOwner) {
            console.log(
                `\tContract ${contract.name} ${contract.addr} has already the owner. Skipped.`,
            );
        } else if (currentOwner === initialOwner) {
            await ownableContract.transferOwnership(newOwner).send();
            console.log(`\tSet owner for contract ${contract.name} ${contract.addr}.`);
        } else {
            throw Error(
                `\tContract ${contract.name} ${contract.addr} has ${currentOwner} owner. It's impossible to change the owner.`,
            );
        }
    }
}

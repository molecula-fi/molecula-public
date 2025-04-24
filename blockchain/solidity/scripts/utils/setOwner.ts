/* eslint-disable no-await-in-loop, no-restricted-syntax, @typescript-eslint/no-explicit-any */

import { type HardhatRuntimeEnvironment } from 'hardhat/types';

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

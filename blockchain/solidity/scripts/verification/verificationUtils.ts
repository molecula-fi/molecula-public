/* eslint-disable @typescript-eslint/no-explicit-any */
import { run } from 'hardhat';

export async function verifyContract(
    contractName: string,
    address: string,
    constructorArguments: any[],
) {
    try {
        await run('verify:verify', {
            address,
            constructorArguments,
        });
    } catch (e) {
        console.error(`Failed to verify "${contractName}" with error:`, e);
    }
    console.log(`${contractName} is verified! ${address}`);
}

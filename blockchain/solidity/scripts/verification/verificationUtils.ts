/* eslint-disable @typescript-eslint/no-explicit-any */
import { type HardhatRuntimeEnvironment } from 'hardhat/types';

export async function verifyContract(
    hre: HardhatRuntimeEnvironment,
    contractName: string,
    address: string,
    constructorArguments: any[],
) {
    try {
        await hre.run('verify:verify', {
            address,
            constructorArguments,
        });
    } catch (e) {
        console.error(`Failed to verify "${contractName}" with error:`, e);
    }
    console.log(`${contractName} is verified! ${address}`);
}

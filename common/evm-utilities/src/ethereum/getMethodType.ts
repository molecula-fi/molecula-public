import { keccak256, toUtf8Bytes } from 'ethers';

/**
 * Get the method topic using keccak256
 * @param method - The method name
 * @returns The method topic
 */
export function getMethodTopic(method: string) {
    return keccak256(toUtf8Bytes(method));
}

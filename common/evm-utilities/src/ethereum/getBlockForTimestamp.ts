import type { Provider } from 'ethers';

const BLOCK_INTERVAL = 12_000; // 12 sec

export async function getBlockForTimestamp(provider: Provider, timestamp: number): Promise<number> {
    const lastBlock = await provider.getBlock('latest');

    const testBlock = await provider.getBlock(8047112);

    console.log('TEST', testBlock);

    console.log('LAST BLOCK', lastBlock);

    if (!lastBlock) {
        throw new Error('Failed to find last block');
    }

    const { timestamp: lastBlockTimestamp, number } = lastBlock;

    const diff = lastBlockTimestamp * 1000 - timestamp;

    console.log('DIFF', timestamp, lastBlockTimestamp, diff);

    const count = Math.floor(diff / BLOCK_INTERVAL);

    const block = await provider.getBlock(number - count);

    if (!block) {
        throw new Error('Failed to find block with number');
    }

    console.log('TIME', timestamp);
    console.log('BLOCK', block.timestamp * 1000);

    return block.number;
}

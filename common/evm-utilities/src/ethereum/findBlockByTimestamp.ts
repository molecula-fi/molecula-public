import type { ethers } from 'ethers';

import { evmQueue } from '../helpers';

type FindBlockByTimestampOptions = {
    /**
     * Ethereum provider
     */
    provider: ethers.Provider;
    /**
     * Target timestamp (in seconds)
     */
    targetTimestamp: number;
    /**
     * Start block (default: 0)
     */
    start?: number;
    /**
     * End block (default: latest block)
     */
    end?: number;
    /**
     * Maximum number of iterations (default: 100)
     */
    maxIterations?: number;
};

/**
 * Find block by timestamp using binary search
 * @param options - Search options
 * @returns Block number with timestamp greater than or equal to target timestamp
 * @throws When target timestamp is invalid or block range is invalid
 * @throws When maximum iterations exceeded
 */
export async function findBlockByTimestamp(options: FindBlockByTimestampOptions): Promise<number> {
    const { provider, targetTimestamp, start, end, maxIterations = 100 } = options;

    // Validate target timestamp
    if (targetTimestamp <= 0) {
        throw new Error('Target timestamp must be greater than 0');
    }

    let startBlock = start ?? 0;
    let endBlock: number | undefined = end;
    let iterations = 0;

    if (!endBlock) {
        endBlock = await evmQueue.add(() => provider.getBlockNumber());
    }

    // Validate block range
    if (startBlock < 0 || endBlock < startBlock) {
        throw new Error(`Invalid block range: start=${startBlock}, end=${endBlock}`);
    }

    while (startBlock <= endBlock) {
        iterations += 1;
        if (iterations > maxIterations) {
            throw new Error(
                `Maximum iterations (${maxIterations}) exceeded while searching for block`,
            );
        }

        const middleBlock = Math.floor((startBlock + endBlock) / 2);

        try {
            // eslint-disable-next-line no-await-in-loop
            const block = await evmQueue.add(() => provider.getBlock(middleBlock));

            if (!block) {
                throw new Error(`Block ${middleBlock} not found`);
            }

            if (block.timestamp === targetTimestamp) {
                return middleBlock;
            }

            if (block.timestamp < targetTimestamp) {
                startBlock = middleBlock + 1;
            } else {
                endBlock = middleBlock - 1;
            }
        } catch (error) {
            throw new Error(
                `Failed to fetch block ${middleBlock}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    // Return the first block with timestamp >= targetTimestamp
    const finalBlock = await evmQueue.add(() => provider.getBlock(startBlock));
    if (finalBlock && finalBlock.timestamp >= targetTimestamp) {
        return startBlock;
    }
    return startBlock + 1;
}

import { SortedArray } from '@molecula-monorepo/common.utilities';

type TransactionsMap = {
    [hash: string]: {
        // Could add any data here if needed
    };
};

type CheckTransactionParams = {
    /**
     * Block key (block number or timestamp)
     */
    block: number;

    /**
     * Transaction hash
     */
    hash: string;

    /**
     * Need to add the transaction after check or not
     */
    add: boolean;
};

/**
 * Keeps processed blocks info
 */
export class BlockKeeper {
    /**
     * Processed blocks map
     */
    private blocks: { [key: number]: TransactionsMap } = {};

    private indexes: SortedArray;

    public constructor(size: number) {
        this.indexes = new SortedArray(size);
    }

    /**
     * Check if a blocks map contains provided transaction or not
     * @param params - contains block key, transaction hash and add transaction after verification flag
     * @returns true if trx already exists in the map
     */
    public checkTransaction(params: CheckTransactionParams): boolean {
        const { block, hash, add } = params;

        let response: boolean = false;

        const existedBlock = this.blocks[block];

        if (existedBlock) {
            response = !!existedBlock[hash];
        }

        if (add && !response) {
            this.addTransaction(block, hash);
        }

        return response;
    }

    /**
     * Add transaction into the map
     * @param blockKey - block key (number or timestamp)
     * @param hash - transaction hash
     */
    public addTransaction(blockKey: number, hash: string) {
        const block = this.blocks[blockKey];

        if (block) {
            block[hash] = {};

            return;
        }

        this.blocks[blockKey] = {
            [hash]: {},
        };

        // Update indexes
        const response = this.indexes.add(blockKey);

        if (response.removedValue) {
            this.removeBlock(response.removedValue);
        }
    }

    /**
     * Find the newest block key
     * @returns block key or undefined if map is empty
     */
    public findNewestBlock(): number | undefined {
        return this.indexes.lastElement;
    }

    /**
     * Remove block with provided index
     */
    private removeBlock(index: number) {
        if (this.blocks[index]) {
            delete this.blocks[index];
        }
    }
}

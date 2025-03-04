import { findIndexToInsert } from './functions';

type AddOperationResult = {
    /**
     * Result of the operation.
     */
    added: boolean;
    /**
     * A removed value if there is one.
     */
    removedValue?: number;
};

/**
 * Sorted array of numbers in ascending order with limited size (optional) and no doubles.
 * Note: The higher value has a higher priority to be included in the array in case its size is limited.
 */
export class SortedArray {
    /**
     * Maximum array size
     */
    private limit: number | undefined;

    /**
     * Source array
     */
    private source: number[] = [];

    public constructor(limit?: number) {
        this.limit = limit;
    }

    /**
     * Sorted values
     * @returns array
     */
    public values(): number[] {
        return this.source;
    }

    /**
     * Source array length getter
     */
    public get length(): number {
        return this.source.length;
    }

    /**
     * First element getter
     */
    public get firstElement(): number | undefined {
        return this.source[0];
    }

    /**
     * Last element getter
     */
    public get lastElement(): number | undefined {
        return this.source[this.source.length - 1];
    }

    /**
     * Add value
     * @param value - number to add
     * @returns operation result
     */
    public add(value: number): AddOperationResult {
        const index = this.findIndexToInsert(value);

        if (index === undefined) {
            return { added: false };
        }

        this.source.splice(index, 0, value);

        if (this.limit && this.source.length > this.limit) {
            const removed = this.source.splice(0, 1);

            const removedValue = removed[0];

            if (removedValue) {
                return {
                    added: removedValue !== value,
                    removedValue,
                };
            }
        }

        return { added: true };
    }

    /**
     * Find index to insert a new value
     * @param value - value to find an index for
     * @returns an index value or undefined if the value already exists
     */
    private findIndexToInsert(value: number): number | undefined {
        // Find the proper placement to insert
        const indexToInsert = findIndexToInsert(
            this.source,
            value,
            (a, b) => a - b, // sort the values in the ascending order
        );

        // Check if we need to insert the value
        if (this.source[indexToInsert] === value || this.source[indexToInsert + 1] === value) {
            return undefined; // a value already exists
        }

        // Return an index to insert
        return indexToInsert;
    }
}

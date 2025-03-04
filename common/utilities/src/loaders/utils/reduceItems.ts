import type { BaseCollectionItem } from '../types';

/**
 * A utility to reduce an array of items into an object with item keys as keys.
 * @param items - The array of items to reduce.
 * @returns An object with item keys as keys and items as values.
 */
export const reduceItems = <T extends BaseCollectionItem>(items: T[]): { [key: string]: T } => {
    return items.reduce<{ [key: string]: T }>((acc, item) => {
        acc[item.key] = item;
        return acc;
    }, {});
};

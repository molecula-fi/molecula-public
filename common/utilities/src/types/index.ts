import type BigNumber from 'bignumber.js';

export interface AsyncStorage {
    getAllKeys(): Promise<readonly string[]>;
    getItem(key: string): Promise<string | null>;
    multiGet(keys: string[]): Promise<readonly [string, string | null][]>;
    removeItem(key: string): Promise<void>;
    setItem(key: string, value: string): Promise<void>;
}

export type WaitWithPromise<T> = {
    value: Promise<T>;
    resolve: (result: T | PromiseLike<T>) => void;
    reject: (error: Error) => void;
    isPending: boolean;
};

/**
 * A type annotation containing a {@link BigNumber} value with its desired `string` representation.
 */
export type ExtendedBigNumber = {
    /**
     * A value as a desired `string` representation,
     * e.g. with the fixed amount of decimals to display.
     */
    string: string | undefined;
    /**
     * A value in {@link BigNumber} representation.
     */
    value: BigNumber | undefined;
};

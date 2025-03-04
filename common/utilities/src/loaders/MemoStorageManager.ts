import { appStorage } from '../storage';

import type { AsyncStorage } from '../types';

type MemoStorageManagerOptions = {
    /**
     * An ID of the storage partition to manage
     */
    id: string;

    /**
     * A storage instance to store in.
     */
    storage: AsyncStorage;

    /**
     * A store limit to be used by the storage in LRU manner.
     */
    storeLimit: number;
};

/**
 * `MemoStorageManager` is an extra layer to any storage instance to allow storing
 * the data in LRU-like matter which is, for instance, useful for caching purposes
 */
export class MemoStorageManager implements AsyncStorage {
    private id: string;

    private storage: AsyncStorage;

    private storeLimit: number;

    public constructor({ id, storage, storeLimit }: MemoStorageManagerOptions) {
        this.id = id;
        this.storage = storage;
        this.storeLimit = storeLimit;
    }

    // Getters
    private get keysRegistry(): string {
        // N.B. "~" sign marks that this key is a "system" one and let us avoiding possible issues
        // when attempting to store the key with such key as "keys" (check Actions methods below)
        return `~${this.id}:keys`;
    }

    private async getKeys(): Promise<string[]> {
        // Keep the keys of MemoStorageManager in a regular `AsyncStorage`,
        // since anyway there is a single instance of the localStorage and it's better
        // to use it purely to avoid such things as encryption of the storage, e.g.
        // for EncryptedStorage the keys will be encrypted which doesn't fit our needs.
        const keys = await appStorage.getItem(this.keysRegistry);
        return keys != null ? JSON.parse(keys) : [];
    }

    // Setters
    private async setKeys(keys: string[]): Promise<void> {
        // Keep the keys of MemoStorageManager in a regular `AsyncStorage`,
        // since anyway there is a single instance of the localStorage and it's better
        // to use it purely to avoid such things as encryption of the storage, e.g.
        // for EncryptedStorage the keys will be encrypted which doesn't fit our needs.
        await appStorage.setItem(this.keysRegistry, JSON.stringify(keys));
    }

    // Actions
    public async setItem(key: string, value: string): Promise<void> {
        const keys = await this.getKeys();

        const index = keys.indexOf(key);
        if (index >= 0) {
            // Found the key in the already used keys

            // Let's move it on top of the list, by removing it from the current index
            keys.splice(index, 1);
            // and placing it at the beginning
            keys.splice(0, 0, key);
        } else {
            // This key is a new one for this manager

            // Let's move it on top of the list, by placing it at the beginning
            keys.splice(0, 0, key);

            // and removing the last keys if exceeding the limit
            if (keys.length > this.storeLimit) {
                const keysToRemove = keys.slice(this.storeLimit, keys.length);
                keys.splice(this.storeLimit, keys.length - this.storeLimit);

                // Remove old keys from the storage
                await Promise.all(keysToRemove.map(keyToDelete => this.removeItem(keyToDelete)));
            }
        }

        // Re-save the keys
        await this.setKeys(keys);

        // Save the item itself
        await this.storage.setItem(`${this.id}:${key}`, value);
    }

    public async getItem(key: string): Promise<string | null> {
        return this.storage.getItem(`${this.id}:${key}`);
    }

    public async removeItem(key: string): Promise<void> {
        return this.storage.removeItem(`${this.id}:${key}`);
    }

    public async getAllKeys(): Promise<string[]> {
        const availableKeys = await this.storage.getAllKeys();
        const keys: string[] = [];
        const keyPrefix = `${this.id}:`;
        availableKeys.forEach(key => {
            if (key.startsWith(keyPrefix)) {
                keys.push(key.slice(keyPrefix.length));
            }
        });
        return keys;
    }

    public async multiGet(keys: string[]): Promise<readonly [string, string | null][]> {
        const multiResponse = await this.storage.multiGet(keys.map(key => `${this.id}:${key}`));
        multiResponse.forEach((_, index) => {
            const key = keys[index];
            const response = multiResponse[index];
            if (key && response) {
                response[0] = key;
            }
        });
        return multiResponse;
    }
}

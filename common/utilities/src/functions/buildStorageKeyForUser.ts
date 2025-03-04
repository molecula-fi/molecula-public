/**
 * A function to build-up a storage key for the user to distinguish it between them.
 * @param key - a key to build a storage key for.
 * @param userId - an ID of the user to build a storage key for.
 * @returns a built-up storage key.
 */
export function buildStorageKeyForUser(key: string, userId: string) {
    return `${key}:${userId}`;
}

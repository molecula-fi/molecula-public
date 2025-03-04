/**
 * Split array to chunks if `join string` longer than `maxStringLength`
 * @param arr - source array
 * @param maxStringLength - max `join string` length
 * @returns array chunks
 */
function splitArray(arr: string[], maxStringLength: number): string[][] {
    const resultString = arr.join(',');
    if (resultString.length < maxStringLength) {
        return [arr];
    }

    if (arr.length === 1) {
        throw new Error('Chunk item longer then allowed max string size');
    }

    const half = Math.floor(arr.length / 2);

    return splitArray(arr.slice(0, half), maxStringLength).concat(
        splitArray(arr.slice(half), maxStringLength),
    );
}

/**
 * Split array to chunks
 * @param arr - strings array
 * @param size - max size of each chunk
 * @param maxStringSize - max length for string if `chunk.join(',')`
 * @returns array of chunk arrays
 */
export function chunkStrings({
    arr,
    size,
    maxStringSize,
}: {
    arr: string[];
    size: number;
    maxStringSize?: number;
}): string[][] {
    const result: string[][] = [];

    for (let i = 0; i < arr.length; i += size) {
        if (maxStringSize) {
            const parts = splitArray(arr.slice(i, i + size), maxStringSize);

            result.push(...parts);
        } else {
            result.push(arr.slice(i, i + size));
        }
    }

    return result;
}

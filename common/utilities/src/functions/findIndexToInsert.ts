/**
 * Function to find the proper placement index of the target to insert into the list
 * in the sorting order defined by the provided comparator.
 * @param list - a list to insert the target into.
 * @param target - a target object to insert into the list.
 * @param comparator - a comparator function which defines the list order.
 * @returns the index to insert the target.
 */
export function findIndexToInsert<T>(
    list: T[],
    target: T,
    comparator: (a: T, B: T) => number,
): number {
    let low = 0;
    let high = list.length;

    while (low < high) {
        // eslint-disable-next-line no-bitwise
        const mid = (low + high) >>> 1; // equivalent to Math.floor((l + h) / 2) but faster

        const comparison = comparator(list[mid]!, target);
        if (comparison < 0) {
            low = mid + 1;
        } else if (comparison > 0) {
            high = mid;
        } else {
            return mid;
        }
    }

    return low;
}

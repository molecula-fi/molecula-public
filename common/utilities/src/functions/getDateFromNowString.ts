/**
 * Create a date from now string in `YYYY-MM-DD` format.
 * @param daysDiff - count the days difference between now and a target date.
 * @returns a date from now as a string.
 */
export function getDateFromNowString(daysDiff: number = 0): string {
    const nowTimestamp = Date.now();
    const targetTimestamp = nowTimestamp + daysDiff * 24 * 60 * 60 * 1000;

    return new Date(targetTimestamp).toISOString().split('T')[0]!;
}

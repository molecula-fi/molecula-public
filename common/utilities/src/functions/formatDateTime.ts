import dayjs from 'dayjs';

/**
 * Function to format a date with date & time.
 * @param date - a date to format.
 */
export function formatDateTime(date: Date) {
    return dayjs(date).format('HH:mm / DD MMM');
}

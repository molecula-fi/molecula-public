/**
 * Function to abort the parent signal prematurely by timeout.
 * @param signal - External AbortSignal.
 * @param timeout - How long to wait before aborting the signal.
 * @returns The new AbortSignal that will be aborted after the timeout.
 */
export function abortSignalByTimeout(signal: AbortSignal | undefined, timeout: number) {
    const timeoutAbortController = new AbortController();

    setTimeout(() => {
        timeoutAbortController.abort();
    }, timeout);

    if (signal == null) {
        return timeoutAbortController.signal;
    }

    return AbortSignal.any([signal, timeoutAbortController.signal]);
}

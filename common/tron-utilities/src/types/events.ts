export type TronBaseEvent = {
    /**
     * Transaction id.
     */
    transaction: string;

    /**
     * Block timestamp
     */
    timestamp: number;
};

export type TronEvent<T> = TronBaseEvent & T;

export type TronEventCallback<T> = (
    err: object | undefined,
    data?: TronEvent<T>,
) => void | Promise<void>;

/**
 * Options for downloading events from tronWeb
 */
export type TronEventsLoadParams = {
    /**
     * Total count for loading
     */
    size?: number;

    /**
     * Timestamp starting from which to download
     */
    sinceTimestamp?: number | undefined;

    /**
     * Sorting direction, ascending timestamp or descending timestamp
     * https://github.com/tronprotocol/tron-grid/issues/6
     */
    sort: 'block_timestamp' | '-block_timestamp';
};

/**
 * Local loader options
 */
export type TronEventsLoadOptions = {
    /**
     * How much to download in one step; maximum: 200
     */
    partSize?: number;
};

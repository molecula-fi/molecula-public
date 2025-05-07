/* eslint-disable no-await-in-loop */

import type { Contract as TronContract, EventResponse } from 'tronweb';

import type { Log } from '@molecula-monorepo/common.utilities';

import type {
    TronBaseEvent,
    TronEventsLoadOptions,
    TronEventsLoadParams,
    InternalTronEvent,
} from '../types';

/**
 * Subscriber info
 */
type Subscriber = {
    /**
     * Tron smart contract
     */
    contract: TronContract;

    /**
     * Logger for sending errors
     */
    log: Log;

    /**
     * Event method name to load
     */
    method: string;
};

/**
 * Load events from tronWeb api
 */
async function loadPartEvents<FilterName, Result>(
    subscriber: Subscriber,
    params: TronEventsLoadParams,
): Promise<InternalTronEvent<FilterName, Result>[]> {
    try {
        if (!subscriber.contract.address) {
            throw new Error('Failed to define contract address');
        }

        const events: EventResponse =
            await subscriber.contract.tronWeb.event.getEventsByContractAddress(
                subscriber.contract.address,
                {
                    eventName: subscriber.method,
                    // https://github.com/tronprotocol/tronweb/blob/3a81bf15f790f35f03b5f9d9b7154afb653ef5f3/src/lib/event.js#L38
                    ...params,
                },
            );

        return events.data
            ? events.data.map(data => {
                  return {
                      transaction: data.transaction_id,
                      timestamp: data.block_timestamp,
                      block: data.block_number,
                      name: subscriber.method as FilterName,
                      result: data.result as Result,
                  };
              })
            : [];
    } catch (error) {
        subscriber.log.error('Failed to find the last events with error:', error);
        return [];
    }
}

/**
 * Information about how many recent events have the same timestamp
 */
type EventsInOneBlock = {
    /**
     * Number of latest events in one block with one timestamp
     */
    count: number;

    /**
     * Timestamp of last event
     */
    sinceTimestamp: number;
};

/**
 * Count recent events that have the same timestamp
 * @param events - Tron events list
 */
function countEventsInOneBlock(events: TronBaseEvent[]): EventsInOneBlock {
    let lastEvent: TronBaseEvent | undefined;

    for (let i = events.length - 1; i >= 0; i -= 1) {
        const event = events[i]!;

        if (lastEvent && event.timestamp !== lastEvent.timestamp) {
            return { count: events.length - i - 1, sinceTimestamp: lastEvent.timestamp };
        }

        lastEvent = event;
    }
    return {
        count: events.length,
        sinceTimestamp: lastEvent?.timestamp ?? 0,
    };
}

// What is the maximum that the tron server can give
const MAX_DOWNLOAD_COUNT = 200;

// Hum much do we want to receive from the server per download
export const MAX_PART_SIZE = 199;

/**
 * Asynchronously loads by part Tron network events
 * @param subscriber - Subscriber used to perform event loading.
 * @param params - Parameters for loading events.
 * @param options - Optional options for loader
 */
export async function tronEventsLoad<FilterName, Result>(
    subscriber: Subscriber,
    params: TronEventsLoadParams,
    options?: TronEventsLoadOptions,
) {
    const { size: totalSize, sinceTimestamp, sort } = params;

    const { partSize } = options || {};

    const partSizeSafe = partSize || MAX_PART_SIZE;

    if (partSizeSafe <= 0 || partSizeSafe > MAX_PART_SIZE) {
        throw new Error(
            `Invalid parameter; partSize must be greater than 0 and less than or equal to ${MAX_PART_SIZE}`,
        );
    }

    if ((!totalSize || totalSize > partSizeSafe) && sort === '-block_timestamp') {
        throw new Error(
            `Invalid parameter; You cannot load more than ${partSizeSafe} items in back sort`,
        );
    }

    let events: InternalTronEvent<FilterName, Result>[] = [];

    let complete: boolean = false;

    // Information about how many recent events have the same timestamp
    let prevEventsInOneBlock: EventsInOneBlock | null = null;

    // Loaded transaction to avoid event duplication
    const loadedTransactions: Record<string, boolean> = {};

    do {
        // How many events need to be loaded now
        const loadSize = totalSize
            ? Math.min(totalSize - events.length, partSizeSafe)
            : partSizeSafe;

        // How much should be downloaded,
        // taking into account duplicates from the previous download
        const loadSizeWithoutDoubles = loadSize + (prevEventsInOneBlock?.count || 0);

        // The final quantity, taking into account that the maximum you can load is 200
        const totalSizeFinal = Math.min(loadSizeWithoutDoubles, MAX_DOWNLOAD_COUNT);

        // Loading events from the Tron network
        const loadedEvents = await loadPartEvents<FilterName, Result>(subscriber, {
            ...params,
            size: totalSizeFinal,
            sinceTimestamp: prevEventsInOneBlock?.sinceTimestamp || sinceTimestamp,
        });

        // Count how many recent events have the same timestamp and what was the last timestamp
        const nextEventsInOneBlock = countEventsInOneBlock(loadedEvents);

        // Loaded events, excluding duplicates from the previous iteration
        const loadedWithoutDoubles = loadedEvents.filter(event => {
            const has = loadedTransactions[event.transaction];
            loadedTransactions[event.transaction] = true;
            return !has;
        });

        if (!loadedWithoutDoubles.length && loadedEvents.length === totalSizeFinal) {
            throw new Error('Too many duplicate events');
        }

        events = events.concat(loadedWithoutDoubles);

        // We complete the download if we downloaded as much as required
        // or in the current iteration less was downloaded than we requested
        if (events.length === totalSize || loadedEvents.length < totalSizeFinal) {
            complete = true;
        }

        prevEventsInOneBlock = nextEventsInOneBlock;
    } while (!complete);

    return events;
}

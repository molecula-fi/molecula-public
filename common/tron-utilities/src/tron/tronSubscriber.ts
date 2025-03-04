import type { TronContract } from 'tronweb/interfaces';

import { BlockKeeper } from '@molecula-monorepo/common.evm-utilities/src/helpers';

import { Log } from '@molecula-monorepo/common.utilities';

import type {
    TronEvent,
    TronEventsLoadParams,
    TronEventCallback,
    TronEventsLoadOptions,
} from '../types';

import { MAX_PART_SIZE, tronEventsLoad } from './tronEventsLoader';

const loadNewEventsInterval = 3_000;

export class TronSubscriber {
    // Properties

    /**
     * Contract instance to watch.
     */
    private contract: TronContract;

    /**
     * Contract method to watch event.
     */
    private method: string;

    /**
     * Subscription interval.
     */
    private newEventsInterval: NodeJS.Timeout | undefined;

    /**
     * Last processed block.
     */
    private blockKeeper: BlockKeeper = new BlockKeeper(100);

    /**
     * Logger instance.
     */
    private log: Log;

    /**
     * Subscription start timestamp.
     */
    private startTimestamp: number = Date.now();

    // Constructor
    public constructor(contract: TronContract, method: string) {
        this.contract = contract;
        this.method = method;

        const addressShort = this.contract.address.slice(0, 6);

        this.log = new Log(`Tron Subscriber ${this.method}~${addressShort}`);
    }

    // Public methods

    /**
     * Start to watch contract events.
     * @param callback - a callback function.
     */
    public start = async <T>(callback: TronEventCallback<T>) => {
        // Init subscriber first if it's needed
        const lastBlockTimestamp = this.blockKeeper.findNewestBlock();
        if (!lastBlockTimestamp) {
            // load last event to save the last timestamp
            const events = await this.loadLastEvents<T>({
                size: 1,
                sort: '-block_timestamp',
            });

            events.map(event =>
                this.blockKeeper.addTransaction(event.timestamp, event.transaction),
            );
        }

        // start check new events
        this.newEventsInterval = setInterval(() => {
            this.checkNewEvents(callback);
        }, loadNewEventsInterval);
    };

    /**
     * Stop watching the current subscription.
     */
    public stop = () => {
        // Clear interval if exists
        if (this.newEventsInterval) {
            clearInterval(this.newEventsInterval);
        }
    };

    /**
     * Load last events for subscriber instance with provided params.
     * @param params - contain size to fetch, sinceTimestamp to start with (optional) and sort order.
     * @param options - contain partSize to specify the maximum portion to load (default 200).
     * @returns loaded events array.
     */
    public async loadLastEvents<T>(
        params: TronEventsLoadParams,
        options?: TronEventsLoadOptions,
    ): Promise<TronEvent<T>[]> {
        return tronEventsLoad(
            {
                log: this.log,
                method: this.method,
                contract: this.contract,
            },
            params,
            options,
        );
    }

    /**
     * Load new events if exists
     */
    private async checkNewEvents<T>(callback: TronEventCallback<T>): Promise<void> {
        const sinceTimestamp = this.blockKeeper.findNewestBlock();

        const events = await this.loadLastEvents<T>({
            sort: 'block_timestamp',
            size: MAX_PART_SIZE,
            sinceTimestamp: sinceTimestamp ? sinceTimestamp + 1 : this.startTimestamp,
        });

        events.forEach(event => {
            this.processEvent(event, callback);
        });
    }

    /**
     * Function to process an event.
     * @param event - an event to process.
     */
    private processEvent<T>(event: TronEvent<T>, callback: TronEventCallback<T>): boolean {
        // Callback an event if it's not processed yet
        const processed = this.blockKeeper.checkTransaction({
            block: event.timestamp,
            hash: event.transaction,
            add: true,
        });

        if (!processed) {
            callback(undefined, event);
        }

        return processed;
    }
}

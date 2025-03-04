/**
 * Filter for load events
 */
export type LoadEventsFilter = {
    blockNumber: number;
    timestamp: number;
};

export type InternalTronEvent<EventName, Result> = {
    block: number;
    timestamp: number;
    contract: number;
    name: EventName;
    transaction: string;
    result: Result;
};

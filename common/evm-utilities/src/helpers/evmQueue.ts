import PQueue from 'p-queue';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Task<T = any> = () => Promise<T>;

class EvmQueue {
    private globalQueue: PQueue;

    private singleConcurrencyQueue: PQueue;

    public constructor() {
        this.globalQueue = new PQueue({
            interval: 1000,
            intervalCap: 10,
            // Decrease next interval limit if queue has unfinished calls
            carryoverConcurrencyCount: true,
        });

        this.singleConcurrencyQueue = new PQueue({ concurrency: 1 });
    }

    /**
     * Add a request to the global queue
     * @param task - The task to add to the queue
     * @param priority - The priority of the task
     * @returns The result of the task
     */
    public add<T>(task: Task<T>, priority: number = 5): Promise<T> {
        return this.globalQueue.add(task, { priority });
    }

    /**
     * Add a request to the single concurrency queue
     * @param task - The task to add to the queue
     * @returns The result of the task
     */
    public addSingle<T>(task: Task<T>): Promise<T> {
        return this.singleConcurrencyQueue.add(() => {
            return this.globalQueue.add(task, { priority: 0 });
        });
    }
}

export const evmQueue = new EvmQueue();

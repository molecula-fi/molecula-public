type MulticastListener<Value> = {
    resolve: (value: Value) => void;
    reject: (error: Error) => void;
};

export class MulticastPromise<Value> {
    private listeners: MulticastListener<Value>[];

    private onComplete?: () => void;

    public constructor() {
        this.listeners = [];
    }

    public listen(): Promise<Value> {
        const listener: MulticastListener<Value> = {
            resolve: () => {
                /** */
            },
            reject: () => {
                /** */
            },
        };
        this.listeners.push(listener);
        return new Promise((resolve, reject) => {
            listener.resolve = resolve;
            listener.reject = reject;
        });
    }

    public resolve(value: Value) {
        this.complete(listener => listener.resolve(value));
    }

    public reject(error: Error) {
        this.complete(listener => listener.reject(error));
    }

    private complete(completeListener: (listener: MulticastListener<Value>) => void) {
        const { listeners } = this;
        this.listeners = [];
        if (this.onComplete) {
            this.onComplete();
        }
        listeners.forEach(listener => completeListener(listener));
    }
}

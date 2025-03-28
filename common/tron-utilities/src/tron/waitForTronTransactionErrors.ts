export enum TronTransactionRuntimeErrors {
    OutOfEnergy,
    Aborted,
    Unsuccessful,
}

export class TronTransactionRuntimeError extends Error {
    public static isTronTransactionRuntimeError(err: Error): err is TronTransactionRuntimeError {
        return err instanceof TronTransactionRuntimeError;
    }

    public stack?: string;

    public constructor(
        public code: TronTransactionRuntimeErrors,
        public originalError?: Error,
    ) {
        super(originalError?.message || '');

        const { stack } = new Error();

        if (stack != null) {
            this.stack = stack;
        }
    }
}

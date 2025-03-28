export enum EvmTransactionRuntimeErrors {
    Aborted,
    Unsuccessful,
}

export class EvmTransactionRuntimeError extends Error {
    public static isEvmTransactionRuntimeError(err: Error): err is EvmTransactionRuntimeError {
        return err instanceof EvmTransactionRuntimeError;
    }

    public stack?: string;

    public constructor(
        public code: EvmTransactionRuntimeErrors,
        public originalError?: Error,
    ) {
        super(originalError?.message || '');

        const { stack } = new Error();

        if (stack != null) {
            this.stack = stack;
        }
    }
}

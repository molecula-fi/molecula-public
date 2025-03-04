export class SafeCallError extends Error {
    public readonly details: Record<string, string | number | object>;

    public constructor(message: string, details: Record<string, string | number | object>) {
        super(message);
        this.details = details;
    }
}

export function parseError(parentError: Error | string): { message: string } {
    if (typeof parentError === 'string') {
        return {
            message: parentError,
        };
    }

    return {
        message: parentError.message,
    };
}

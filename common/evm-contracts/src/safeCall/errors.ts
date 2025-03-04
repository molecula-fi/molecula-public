export class SafeCallError extends Error {
    public readonly details: Record<string, string | number | object | null>;

    public readonly parentError: ParsedError | undefined;

    public constructor(
        message: string,
        details: Record<string, string | number | object | null>,
        parentError?: ParsedError,
    ) {
        super(message);
        this.details = details;

        this.parentError = parentError;
    }
}

type ParsedError = { message: string; code?: string };

export function parseError(parentError: Error | string): ParsedError {
    if (typeof parentError === 'string') {
        return {
            message: parentError,
        };
    }

    const parsed: ParsedError = {
        message: parentError.message,
    };
    if ('code' in parentError) {
        parsed.code = parentError.code as string;
    }

    return parsed;
}

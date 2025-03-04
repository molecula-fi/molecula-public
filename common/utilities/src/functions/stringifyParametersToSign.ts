/**
 * A type annotation for the primitive value.
 */
type PrimitiveValue = string | number | bigint | boolean | null | undefined;

/**
 * A type annotation for the parameters suitable for requests and GraphQL queries and subscriptions.
 */
export type ParametersShape = {
    [key: string]: PrimitiveValue | ParametersShape | (PrimitiveValue | ParametersShape)[];
};

function stringifyValueToSign(value: ParametersShape[keyof ParametersShape]): string {
    // Check if the value is undefined
    if (value === undefined) {
        return '';
    }

    // Check if the value is null
    if (value === null) {
        return 'null';
    }

    // Check if the value is of the primitive type
    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
    ) {
        // Stringify the primitive value via `.toString()`
        return value.toString();
    }

    // Check if the value is an array
    if (Array.isArray(value)) {
        // Create a string of stringified values separated by the comma
        // Wrap the stringified value in "[]"
        return `[${value.map(item => stringifyValueToSign(item)).join(',')}]`;
    }

    // Stringify the value of the complex type
    // Wrap the stringified value in "{}"
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return `{${stringifyParametersToSign(value)}}`;
}

/**
 * Function to stringify parameters to sign.
 * @param parameters - a record of parameters.
 * @returns a ready to sign stringified parameters.
 */
export function stringifyParametersToSign(parameters: ParametersShape): string {
    return (
        (Object.keys(parameters) as (keyof typeof parameters)[])
            // Skip the parameters with an `undefined` value as they don't stringify with JSON,
            // i.e. they cannot reach the server via POST request (with "JSON.stringify" body).
            .filter(key => parameters[key] !== undefined)
            // Sort the parameters
            .sort()
            // Create an array of stringified "parameter:value" pairs
            .map(key => {
                // Get the parameter value
                const value = parameters[key];
                // Return the stringified "parameter:value" pair
                return `${key}:${stringifyValueToSign(value)}`;
            })
            // Create a string of stringified parameters separated by the semicolon
            .join(';')
    );
}
